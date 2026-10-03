import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixtures, seasons, teamAccess } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { normalizeFixture, type FixtureInput } from "@/lib/fixture-input";

export const runtime = "nodejs";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const [season] = await db.select({ teamId: seasons.teamId }).from(seasons).where(eq(seasons.id, id)).limit(1);
  if (!season) return NextResponse.json({ error: "Sæsonen blev ikke fundet." }, { status: 404 });
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, season.teamId), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan oprette kampe." }, { status: 403 });
  }
  let input;
  try { input = normalizeFixture(await request.json() as FixtureInput); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ugyldig kamp." }, { status: 400 }); }
  try {
    const [fixture] = await db.insert(fixtures).values({
      seasonId: id, ...input, sourceType: "manual", sourceUpdatedAt: new Date(),
    }).returning({ id: fixtures.id });
    return NextResponse.json({ redirectTo: `/matches/${fixture.id}` }, { status: 201 });
  } catch (error) {
    console.error("Kampen kunne ikke oprettes", error);
    return NextResponse.json({ error: "Kampen kunne ikke oprettes. Kontrollér RankedIn kamp-ID." }, { status: 409 });
  }
}
