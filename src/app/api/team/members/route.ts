import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamAccess, teamMembers, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const body = await request.json() as { memberId?: string; email?: string };
  const email = body.email?.trim().toLowerCase() ?? "";
  if (!body.memberId || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
    return NextResponse.json({ error: "Skriv en gyldig e-mailadresse." }, { status: 400 });
  }
  const [member] = await db.select({ id: teamMembers.id, teamId: teamMembers.teamId })
    .from(teamMembers).where(eq(teamMembers.id, body.memberId)).limit(1);
  if (!member) return NextResponse.json({ error: "Spilleren blev ikke fundet." }, { status: 404 });
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, member.teamId), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan invitere spillere." }, { status: 403 });
  }

  const [existingUser] = await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1);
  await db.update(teamMembers).set({ email, ...(existingUser ? { userId: existingUser.id } : {}) }).where(eq(teamMembers.id, member.id));
  if (existingUser) await db.insert(teamAccess).values({ teamId: member.teamId, userId: existingUser.id, role: "player" }).onConflictDoNothing();
  return NextResponse.json({ ok: true, connected: Boolean(existingUser) });
}
