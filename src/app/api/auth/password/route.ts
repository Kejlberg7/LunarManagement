import { createHash } from "node:crypto";
import { and, eq, gt, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loginTokens, teamAccess, teamMembers, teams, users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { hashPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op endnu." }, { status: 503 });

  try {
    const body = (await request.json()) as { token?: string; password?: string };
    const rawToken = body.token ?? "";
    const password = body.password ?? "";
    if (!rawToken || password.length < 10 || password.length > 1024) {
      return NextResponse.json({ error: "Vælg en adgangskode på mindst 10 tegn." }, { status: 400 });
    }

    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    const [record] = await db.select({ tokenId: loginTokens.id, userId: users.id, email: users.email })
      .from(loginTokens)
      .innerJoin(users, eq(loginTokens.userId, users.id))
      .where(and(eq(loginTokens.tokenHash, tokenHash), gt(loginTokens.expiresAt, new Date())))
      .limit(1);
    if (!record) return NextResponse.json({ error: "Linket er udløbet eller allerede brugt. Bed om et nyt." }, { status: 400 });

    const passwordHash = hashPassword(password);
    const [consumed] = await db.delete(loginTokens)
      .where(and(eq(loginTokens.id, record.tokenId), eq(loginTokens.tokenHash, tokenHash)))
      .returning({ id: loginTokens.id });
    if (!consumed) return NextResponse.json({ error: "Linket er udløbet eller allerede brugt. Bed om et nyt." }, { status: 400 });

    await db.update(users).set({ passwordHash }).where(eq(users.id, record.userId));
    await db.delete(loginTokens).where(eq(loginTokens.userId, record.userId));

    const [member] = await db.select({ teamId: teamMembers.teamId, memberId: teamMembers.id, role: teamMembers.role })
      .from(teamMembers)
      .where(sql`lower(${teamMembers.email}) = ${record.email}`)
      .limit(1);
    if (member) {
      const role = member.role === "captain" ? "captain" : member.role === "admin" ? "owner" : "player";
      await db.insert(teamAccess).values({ teamId: member.teamId, userId: record.userId, role }).onConflictDoUpdate({
        target: [teamAccess.teamId, teamAccess.userId], set: { role },
      });
      await db.update(teamMembers).set({ userId: record.userId }).where(eq(teamMembers.id, member.memberId));
    }

    if (process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() === record.email) {
      const [team] = await db.select({ id: teams.id }).from(teams).limit(1);
      if (team) await db.insert(teamAccess).values({ teamId: team.id, userId: record.userId, role: "owner" }).onConflictDoUpdate({
        target: [teamAccess.teamId, teamAccess.userId],
        set: { role: "owner" },
      });
    }

    await createSession(record.userId, record.email);
    return NextResponse.json({ redirectTo: "/" });
  } catch (error) {
    console.error("Adgangskoden kunne ikke gemmes", error);
    return NextResponse.json({ error: "Adgangskoden kunne ikke gemmes. Prøv igen senere." }, { status: 500 });
  }
}
