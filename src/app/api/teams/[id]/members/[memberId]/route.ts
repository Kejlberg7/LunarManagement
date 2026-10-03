import { and, eq, ne, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamAccess, teamMembers, users } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string; memberId: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id, memberId } = await context.params;
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, id), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan ændre spillere." }, { status: 403 });
  }
  const [member] = await db.select({ id: teamMembers.id, userId: teamMembers.userId, role: teamMembers.role }).from(teamMembers)
    .where(and(eq(teamMembers.teamId, id), eq(teamMembers.id, memberId))).limit(1);
  if (!member) return NextResponse.json({ error: "Spilleren blev ikke fundet." }, { status: 404 });

  const body = await request.json() as { name?: string; email?: string; rankedInId?: string; role?: string; rank?: number | null };
  const name = body.name?.trim() ?? "";
  const email = body.email?.trim().toLowerCase() ?? "";
  const rankedInId = body.rankedInId?.trim() ?? "";
  const rank = body.rank === null || body.rank === undefined || body.rank === 0 ? null : Number(body.rank);
  if ((member.role === "admin" && access.role !== "owner") || (body.role === "admin" && member.role !== "admin")) {
    return NextResponse.json({ error: "Administratorrollen kan ikke ændres her." }, { status: 403 });
  }
  if (!name || name.length > 120 || rankedInId.length > 300 ||
      (email && (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254)) ||
      !["player", "captain", "vice_captain", "admin"].includes(body.role ?? "") ||
      (rank !== null && (!Number.isInteger(rank) || rank < 1 || rank > 999))) {
    return NextResponse.json({ error: "Kontrollér navn, e-mail, rolle og rangorden." }, { status: 400 });
  }
  if (email) {
    const [duplicate] = await db.select({ id: teamMembers.id }).from(teamMembers)
      .where(and(eq(teamMembers.teamId, id), ne(teamMembers.id, memberId), sql`lower(${teamMembers.email}) = ${email}`)).limit(1);
    if (duplicate) return NextResponse.json({ error: "E-mailadressen er allerede på holdet." }, { status: 409 });
  }
  try {
    const [user] = email ? await db.select({ id: users.id }).from(users).where(eq(users.email, email)).limit(1) : [];
    await db.transaction(async (tx) => {
      await tx.update(teamMembers).set({
        name, email: email || null, rankedInId: rankedInId || null,
        role: body.role!, rank, userId: user?.id ?? null,
      }).where(eq(teamMembers.id, memberId));
      if (member.userId && member.userId !== user?.id) {
        const [oldAccess] = await tx.select({ role: teamAccess.role }).from(teamAccess)
          .where(and(eq(teamAccess.teamId, id), eq(teamAccess.userId, member.userId))).limit(1);
        if (oldAccess?.role !== "owner") await tx.delete(teamAccess)
          .where(and(eq(teamAccess.teamId, id), eq(teamAccess.userId, member.userId)));
      }
      if (user) {
        const role = body.role === "admin" ? "owner" : body.role === "player" ? "player" : "captain";
        const [existingAccess] = await tx.select({ role: teamAccess.role }).from(teamAccess)
          .where(and(eq(teamAccess.teamId, id), eq(teamAccess.userId, user.id))).limit(1);
        if (existingAccess?.role !== "owner") await tx.insert(teamAccess).values({ teamId: id, userId: user.id, role })
          .onConflictDoUpdate({ target: [teamAccess.teamId, teamAccess.userId], set: { role } });
      }
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Spilleren kunne ikke gemmes", error);
    return NextResponse.json({ error: "Spilleren kunne ikke gemmes. Kontrollér RankedIn-ID." }, { status: 409 });
  }
}
