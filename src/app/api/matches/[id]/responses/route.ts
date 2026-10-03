import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { availabilityOptions, availabilityResponses, fixtures, seasons, teamAccess, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { notifyUsers } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json() as { optionId?: string; response?: string };
  if (!body.optionId || !["available", "maybe", "unavailable"].includes(body.response ?? "")) {
    return NextResponse.json({ error: "Vælg en gyldig tilgængelighed." }, { status: 400 });
  }
  const [match] = await db.select({ teamId: seasons.teamId, optionId: availabilityOptions.id })
    .from(fixtures)
    .innerJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(availabilityOptions, and(eq(availabilityOptions.fixtureId, fixtures.id), eq(availabilityOptions.id, body.optionId)))
    .where(eq(fixtures.id, id)).limit(1);
  if (!match) return NextResponse.json({ error: "Datoen blev ikke fundet." }, { status: 404 });
  const [member] = await db.select({ id: teamMembers.id }).from(teamMembers)
    .innerJoin(teamAccess, and(eq(teamAccess.teamId, teamMembers.teamId), eq(teamAccess.userId, session.userId)))
    .where(and(eq(teamMembers.teamId, match.teamId), eq(teamMembers.userId, session.userId))).limit(1);
  if (!member) return NextResponse.json({ error: "Kaptajnen skal koble din konto til en spiller på holdet." }, { status: 403 });

  await db.insert(availabilityResponses).values({ optionId: match.optionId, memberId: member.id, response: body.response! })
    .onConflictDoUpdate({
      target: [availabilityResponses.optionId, availabilityResponses.memberId],
      set: { response: body.response!, updatedAt: new Date() },
    });
  const captains = await db.select({ userId: teamAccess.userId }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, match.teamId), inArray(teamAccess.role, ["captain", "owner"])));
  await notifyUsers(captains.map((row) => row.userId).filter((userId) => userId !== session.userId), {
    title: "Nyt svar på kampafstemning",
    body: "En spiller har opdateret sin tilgængelighed.",
    href: `/matches/${id}`,
    fixtureId: id,
  });
  return NextResponse.json({ ok: true });
}
