import { and, eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { availabilityOptions, fixtures, seasons, teamAccess } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { notifyUsers } from "@/lib/push";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const body = await request.json() as { optionId?: string };
  if (!body.optionId) return NextResponse.json({ error: "Vælg en dato." }, { status: 400 });
  const [match] = await db.select({ teamId: seasons.teamId, opponent: fixtures.opponent, startsAt: availabilityOptions.startsAt })
    .from(fixtures)
    .innerJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(availabilityOptions, and(eq(availabilityOptions.fixtureId, fixtures.id), eq(availabilityOptions.id, body.optionId)))
    .where(eq(fixtures.id, id)).limit(1);
  if (!match) return NextResponse.json({ error: "Kampdatoen blev ikke fundet." }, { status: 404 });
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, match.teamId), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan bekræfte kampdatoen." }, { status: 403 });
  }

  await db.update(fixtures).set({ scheduledAt: match.startsAt, status: "scheduled" }).where(eq(fixtures.id, id));
  const teamUsers = await db.select({ userId: teamAccess.userId }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, match.teamId), inArray(teamAccess.role, ["captain", "owner", "player"])));
  await notifyUsers(teamUsers.map((row) => row.userId), {
    title: "Kampdato valgt",
    body: `Kampen mod ${match.opponent} er fastlagt i holdappen. Opdatér også RankedIn.`,
    href: `/matches/${id}`,
    fixtureId: id,
  });
  return NextResponse.json({ ok: true });
}
