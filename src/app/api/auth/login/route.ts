import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamAccess, teamMembers, teams, users } from "@/db/schema";
import { createSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op endnu." }, { status: 503 });

  try {
    const body = (await request.json()) as { email?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Skriv en gyldig e-mailadresse." }, { status: 400 });
    }

    const [member] = await db.select({ teamId: teamMembers.teamId, memberId: teamMembers.id, role: teamMembers.role })
      .from(teamMembers)
      .where(sql`lower(${teamMembers.email}) = ${email}`)
      .limit(1);
    const isBootstrapAdmin = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() === email;
    if (!member && !isBootstrapAdmin) {
      return NextResponse.json({ error: "Denne e-mail er ikke på holdlisten. Bed kaptajnen om at tilføje dig." }, { status: 403 });
    }

    const [user] = await db.insert(users).values({ email }).onConflictDoUpdate({
      target: users.email,
      set: { email },
    }).returning({ id: users.id, email: users.email });

    if (member) {
      const role = member.role === "captain" ? "captain" : member.role === "admin" ? "owner" : "player";
      await db.insert(teamAccess).values({ teamId: member.teamId, userId: user.id, role }).onConflictDoUpdate({
        target: [teamAccess.teamId, teamAccess.userId],
        set: { role },
      });
      await db.update(teamMembers).set({ userId: user.id }).where(eq(teamMembers.id, member.memberId));
    }

    if (isBootstrapAdmin) {
      const [team] = await db.select({ id: teams.id }).from(teams).limit(1);
      if (team) {
        await db.insert(teamAccess).values({ teamId: team.id, userId: user.id, role: "owner" }).onConflictDoUpdate({
          target: [teamAccess.teamId, teamAccess.userId],
          set: { role: "owner" },
        });
      }
    }

    await createSession(user.id, user.email);
    return NextResponse.json({ redirectTo: "/" });
  } catch (error) {
    console.error("Login kunne ikke gennemføres", error);
    return NextResponse.json({ error: "Login kunne ikke gennemføres. Prøv igen senere." }, { status: 500 });
  }
}
