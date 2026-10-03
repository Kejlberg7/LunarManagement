import { and, eq } from "drizzle-orm";
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
  const [match] = await db.select({ id: fixtures.id, opponent: fixtures.opponent, teamId: seasons.teamId })
    .from(fixtures).innerJoin(seasons, eq(fixtures.seasonId, seasons.id)).where(eq(fixtures.id, id)).limit(1);
  if (!match) return NextResponse.json({ error: "Kampen blev ikke fundet." }, { status: 404 });
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.userId, session.userId), eq(teamAccess.teamId, match.teamId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan oprette en datoafstemning." }, { status: 403 });
  }

  const body = await request.json() as { options?: { startsAt?: string; endsAt?: string }[]; deadline?: string };
  const options = (body.options ?? []).slice(0, 3).map((option) => ({
    fixtureId: id,
    startsAt: new Date(option.startsAt ?? ""),
    endsAt: option.endsAt ? new Date(option.endsAt) : null,
  }));
  const deadline = new Date(body.deadline ?? "");
  if (!Number.isFinite(deadline.getTime()) || deadline <= new Date() ||
    (body.options ?? []).length > 3 || !options.length || options.some((option) =>
    !Number.isFinite(option.startsAt.getTime()) || option.startsAt <= new Date() ||
    (option.endsAt && (!Number.isFinite(option.endsAt.getTime()) || option.endsAt <= option.startsAt)),
  )) {
    return NextResponse.json({ error: "Tilføj 1–3 fremtidige datoer og en gyldig svarfrist." }, { status: 400 });
  }
  if (deadline >= new Date(Math.min(...options.map((option) => option.startsAt.getTime())))) {
    return NextResponse.json({ error: "Svarfristen skal ligge før den første foreslåede dato." }, { status: 400 });
  }
  const existing = await db.select({ id: availabilityOptions.id }).from(availabilityOptions)
    .where(eq(availabilityOptions.fixtureId, id));
  if (existing.length) return NextResponse.json({ error: "Kampen har allerede en afstemning." }, { status: 409 });
  await db.transaction(async (tx) => {
    await tx.insert(availabilityOptions).values(options);
    await tx.update(fixtures).set({ responseDeadline: deadline }).where(eq(fixtures.id, id));
  });
  const teamUsers = await db.select({ userId: teamAccess.userId }).from(teamAccess).where(eq(teamAccess.teamId, match.teamId));
  await notifyUsers(teamUsers.map((row) => row.userId).filter((userId) => userId !== session.userId), {
    title: "Ny kampafstemning",
    body: `Vælg en dato til kampen mod ${match.opponent}.`,
    href: `/matches/${id}`,
    fixtureId: id,
  });
  return NextResponse.json({ ok: true });
}
