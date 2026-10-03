import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixtures, seasons, teamAccess } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { normalizeFixture, type FixtureInput } from "@/lib/fixture-input";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const [fixture] = await db.select({ teamId: seasons.teamId }).from(fixtures)
    .innerJoin(seasons, eq(fixtures.seasonId, seasons.id)).where(eq(fixtures.id, id)).limit(1);
  if (!fixture) return NextResponse.json({ error: "Kampen blev ikke fundet." }, { status: 404 });
  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, fixture.teamId), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access || !["owner", "captain"].includes(access.role)) {
    return NextResponse.json({ error: "Kun kaptajnen kan ændre kampen." }, { status: 403 });
  }
  let input;
  try { input = normalizeFixture(await request.json() as FixtureInput); }
  catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Ugyldig kamp." }, { status: 400 }); }
  try {
    await db.update(fixtures).set({ ...input, sourceType: "manual", sourceUpdatedAt: new Date() }).where(eq(fixtures.id, id));
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Kampen kunne ikke gemmes", error);
    return NextResponse.json({ error: "Kampen kunne ikke gemmes. Kontrollér RankedIn kamp-ID." }, { status: 409 });
  }
}
