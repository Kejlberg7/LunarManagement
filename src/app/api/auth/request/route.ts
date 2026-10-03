import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { loginTokens, teamMembers, users } from "@/db/schema";
import { sendPasswordSetupLink } from "@/lib/email";
import { eq, sql } from "drizzle-orm";

export const runtime = "nodejs";

export async function POST(request: Request) {
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op endnu." }, { status: 503 });
  let email = "";
  try {
    const body = (await request.json()) as { email?: string };
    email = body.email?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) {
      return NextResponse.json({ error: "Skriv en gyldig e-mailadresse." }, { status: 400 });
    }

    const [member] = await db.select({ id: teamMembers.id }).from(teamMembers).where(sql`lower(${teamMembers.email}) = ${email}`).limit(1);
    const isBootstrapAdmin = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() === email;
    if (!member && !isBootstrapAdmin) {
      return NextResponse.json({ message: "Hvis adressen er tilknyttet et Lunar-hold, sender vi et link til at vælge adgangskode." });
    }

    const [user] = await db.insert(users).values({ email }).onConflictDoUpdate({
      target: users.email,
      set: { email },
    }).returning({ id: users.id });
    await db.delete(loginTokens).where(eq(loginTokens.userId, user.id));
    const rawToken = randomBytes(32).toString("base64url");
    const tokenHash = createHash("sha256").update(rawToken).digest("hex");
    await db.insert(loginTokens).values({
      userId: user.id,
      tokenHash,
      expiresAt: new Date(Date.now() + 15 * 60 * 1000),
    });

    const url = new URL("/api/auth/verify", process.env.APP_URL ?? new URL(request.url).origin);
    url.searchParams.set("token", rawToken);
    const delivery = await sendPasswordSetupLink(email, url.toString());
    return NextResponse.json({
      message: "Hvis adressen er tilknyttet et Lunar-hold, har vi sendt et link til at vælge adgangskode. Linket virker i 15 minutter.",
      ...(delivery.developmentUrl ? { developmentUrl: delivery.developmentUrl } : {}),
    });
  } catch (error) {
    console.error("Adgangskodelink kunne ikke sendes", error);
    return NextResponse.json({ error: "Linket til adgangskoden kunne ikke sendes. Prøv igen senere." }, { status: 500 });
  }
}
