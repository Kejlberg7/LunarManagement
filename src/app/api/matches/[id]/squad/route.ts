import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixtureSelections, fixtures, seasons, teamAccess, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { notifyUsers } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json() as { memberId?: string; status?: string };
  if (!body.memberId || !["participant", "reserve", "none"].includes(body.status ?? "")) {
    return NextResponse.json({ error: "Vælg en gyldig spiller og rolle." }, { status: 400 });
  }
  const [fixture] = await db.select({ teamId: seasons.teamId, opponent: fixtures.opponent }).from(fixtures)
    .innerJoin(seasons, eq(fixtures.seasonId, seasons.id)).where(eq(fixtures.id, id)).limit(1);
  if (!fixture) return NextResponse.json({ error: "Kampen blev ikke fundet." }, { status: 404 });
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, fixture.teamId), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan vælge truppen." }, { status: 403 });
  }
  const [member] = await db.select({ id: teamMembers.id, userId: teamMembers.userId, name: teamMembers.name })
    .from(teamMembers).where(and(eq(teamMembers.id, body.memberId), eq(teamMembers.teamId, fixture.teamId))).limit(1);
  if (!member) return NextResponse.json({ error: "Spilleren er ikke på holdet." }, { status: 404 });
  if (body.status === "participant") {
    const [count] = await db.select({ total: sql<number>`count(*)::int` }).from(fixtureSelections)
      .where(and(eq(fixtureSelections.fixtureId, id), eq(fixtureSelections.status, "participant"), ne(fixtureSelections.memberId, member.id)));
    if (count.total >= 6) return NextResponse.json({ error: "Truppen har allerede seks spillere. Vælg en reserve i stedet." }, { status: 409 });
  }
  if (body.status === "none") {
    await db.delete(fixtureSelections).where(and(eq(fixtureSelections.fixtureId, id), eq(fixtureSelections.memberId, member.id)));
  } else {
    await db.insert(fixtureSelections).values({ fixtureId: id, memberId: member.id, status: body.status! })
      .onConflictDoUpdate({ target: [fixtureSelections.fixtureId, fixtureSelections.memberId], set: { status: body.status!, updatedAt: new Date() } });
  }
  if (member.userId && member.userId !== session.userId) {
    await notifyUsers([member.userId], {
      title: "Truppen er ændret",
      body: body.status === "participant" ? `Du er valgt til kampen mod ${fixture.opponent}.` : body.status === "reserve" ? `Du er reserve til kampen mod ${fixture.opponent}.` : `Din rolle i kampen mod ${fixture.opponent} er fjernet.`,
      href: `/matches/${id}`, fixtureId: id,
    });
  }
  return NextResponse.json({ ok: true });
}
