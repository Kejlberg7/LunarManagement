import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamAccess, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, id), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan ændre holdet." }, { status: 403 });
  }
  const body = await request.json() as {
    name?: string; pool?: string; homeVenue?: string; homeAddress?: string;
    rankedInId?: string; rankedInUrl?: string;
  };
  const name = body.name?.trim() ?? "";
  const rankedInUrl = body.rankedInUrl?.trim() ?? "";
  const rankedInId = body.rankedInId?.trim() ?? "";
  if (!name || name.length > 120 || rankedInId.length > 100) {
    return NextResponse.json({ error: "Udfyld et gyldigt holdnavn og RankedIn-ID." }, { status: 400 });
  }
  if (rankedInUrl) {
    try {
      const url = new URL(rankedInUrl);
      if (url.protocol !== "https:" || !["rankedin.com", "www.rankedin.com"].includes(url.hostname)) throw new Error();
    } catch {
      return NextResponse.json({ error: "Brug et gyldigt RankedIn-link." }, { status: 400 });
    }
  }
  try {
    const [current] = await db.select({ rankedInId: teams.rankedInId }).from(teams).where(eq(teams.id, id)).limit(1);
    if (!current) return NextResponse.json({ error: "Holdet blev ikke fundet." }, { status: 404 });
    await db.update(teams).set({
      name,
      pool: body.pool?.trim().slice(0, 120) ?? "",
      homeVenue: body.homeVenue?.trim().slice(0, 200) ?? "",
      homeAddress: body.homeAddress?.trim().slice(0, 300) ?? "",
      rankedInId: rankedInId || current.rankedInId,
      rankedInUrl,
    }).where(eq(teams.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Holdet kunne ikke gemmes", error);
    return NextResponse.json({ error: "Holdet kunne ikke gemmes. Kontrollér om RankedIn-ID bruges af et andet hold." }, { status: 409 });
  }
}
