import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { verifyPassword } from "@/lib/password";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op endnu." }, { status: 503 });

  try {
    const body = (await request.json()) as { email?: string; password?: string };
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || password.length > 1024) {
      return NextResponse.json({ error: "E-mail eller adgangskode er forkert." }, { status: 401 });
    }

    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (!verifyPassword(password, user?.passwordHash ?? null) || !user) {
      return NextResponse.json({ error: "E-mail eller adgangskode er forkert." }, { status: 401 });
    }

    await createSession(user.id, user.email);
    return NextResponse.json({ redirectTo: "/" });
  } catch (error) {
    console.error("Login kunne ikke gennemføres", error);
    return NextResponse.json({ error: "Login kunne ikke gennemføres. Prøv igen senere." }, { status: 500 });
  }
}
