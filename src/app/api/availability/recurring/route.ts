import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { recurringAvailability, teamAccess, teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

async function getMember(userId: string, teamId: string) {
  if (!db) return null;
  const [member] = await db.select({ id: teamMembers.id }).from(teamMembers)
    .innerJoin(teamAccess, and(eq(teamAccess.teamId, teamMembers.teamId), eq(teamAccess.userId, userId)))
    .where(and(eq(teamMembers.userId, userId), eq(teamMembers.teamId, teamId))).limit(1);
  return member ?? null;
}

export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const teamId = new URL(request.url).searchParams.get("teamId") ?? "";
  if (!teamId) return NextResponse.json({ error: "Vælg et hold." }, { status: 400 });
  const member = await getMember(session.userId, teamId);
  if (!member) return NextResponse.json({ availability: [] });
  const availability = await db.select().from(recurringAvailability)
    .where(eq(recurringAvailability.memberId, member.id));
  return NextResponse.json({ availability });
}

export async function PUT(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const body = await request.json() as { teamId?: string; slots?: { weekday: number; startsAt: string; endsAt: string }[] };
  if (!body.teamId) return NextResponse.json({ error: "Vælg et hold." }, { status: 400 });
  const member = await getMember(session.userId, body.teamId);
  if (!member) return NextResponse.json({ error: "Din konto er ikke koblet til en spiller endnu." }, { status: 403 });
  const slots = (body.slots ?? []).filter((slot) =>
    Number.isInteger(slot.weekday) && slot.weekday >= 0 && slot.weekday <= 6 &&
    /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.startsAt) && /^([01]\d|2[0-3]):[0-5]\d$/.test(slot.endsAt) && slot.startsAt < slot.endsAt,
  ).slice(0, 14);
  await db.delete(recurringAvailability).where(eq(recurringAvailability.memberId, member.id));
  if (slots.length) await db.insert(recurringAvailability).values(slots.map((slot) => ({ ...slot, memberId: member.id })));
  return NextResponse.json({ ok: true });
}
