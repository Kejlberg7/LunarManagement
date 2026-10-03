import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamAccess, teamMembers, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, id), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan tilføje spillere." }, { status: 403 });
  }
  const body = await request.json() as { name?: string; email?: string; rankedInId?: string; role?: string; rank?: number | null };
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const rankedInId = body.rankedInId?.trim() ?? "";
  const rank = body.rank === null || body.rank === undefined || body.rank === 0 ? null : Number(body.rank);
  if (!name || name.length > 120 || rankedInId.length > 300 ||
      (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) ||
      !["player", "captain", "vice_captain"].includes(body.role ?? "") ||
      (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 999))) {
    return NextResponse.json({ error: "Kontrollér navn, e-mail, rolle og rangorden." }, { status: 400 });
  }
  if (email) {
    const [duplicate] = await db.select({ id: teamMembers.id }).from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), sql`lower(${teamMembers.email}) = ${email}`)).limit(1);
    if (duplicate) return NextResponse.json({ error: "E-mailadressen er allerede på holdet." }, { status: 409 });
  }
  try {
    const [user] = email ? await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1) : [];
    const [member] = await db.insert(teamMembers).values({
      teamId: id, name, email: email || null, rankedInId: rankedInId || null,
      role: body.role!, rank, userId: user?.id ?? null,
    }).returning({ id: teamMembers.id });
    if (user) await db.insert(teamAccess).values({
      teamId: id, userId: user.id, role: body.role === "player" ? "player" : "captain",
    }).onConflictDoNothing();
    return NextResponse.json({ id: member.id }, { status: 201 });
  } catch (error) {
    console.error("Spilleren kunne ikke tilføjes", error);
    return NextResponse.json({ error: "Spilleren kunne ikke tilføjes. Kontrollér RankedIn-ID." }, { status: 409 });
  }
}
