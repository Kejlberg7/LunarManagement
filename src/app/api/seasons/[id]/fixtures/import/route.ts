import { and, eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixtures, seasons, teamAccess } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { parseFixtureCsv } from "@/lib/fixture-input";

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
    return NextResponse.json({ error: "Kun kaptajnen kan importere kampe." }, { status: 403 });
  }
  let rows;
  try {
    const body = await request.json() as { csv?: string };
    rows = parseFixtureCsv(body.csv ?? "");
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Ugyldig CSV-fil." }, { status: 400 });
  }
  const keys = rows.map((row) => row.rankedInMatchId ?? `${row.opponent.toLowerCase()}|${row.homeAway}`);
  if (new Set(keys).size !== keys.length) {
    return NextResponse.json({ error: "CSV-filen indeholder den samme kamp mere end én gang." }, { status: 400 });
  }
  try {
    const counts = await db.transaction(async (tx) => {
      let created = 0, updated = 0;
      for (const row of rows) {
        const [byRankedInId] = row.rankedInMatchId
          ? await tx.select({ id: fixtures.id, seasonId: fixtures.seasonId }).from(fixtures)
            .where(eq(fixtures.rankedInMatchId, row.rankedInMatchId)).limit(1)
          : [];
        const [byOpponent] = await tx.select({ id: fixtures.id, seasonId: fixtures.seasonId }).from(fixtures)
          .where(and(eq(fixtures.seasonId, id), sql`lower(${fixtures.opponent}) = ${row.opponent.toLowerCase()}`, eq(fixtures.homeAway, row.homeAway))).limit(1);
        const existing = byRankedInId ?? byOpponent;
        if (existing?.seasonId !== undefined && existing.seasonId !== id) throw new Error(`RankedIn kamp-ID ${row.rankedInMatchId} tilhører en anden sæson.`);
        if (existing) {
          await tx.update(fixtures).set({ ...row, opponentContactName: undefined, opponentContactEmail: undefined, opponentContactPhone: undefined, sourceType: "csv", sourceUpdatedAt: new Date() })
            .where(eq(fixtures.id, existing.id));
          updated++;
        } else {
          await tx.insert(fixtures).values({ seasonId: id, ...row, sourceType: "csv", sourceUpdatedAt: new Date() });
          created++;
        }
      }
      return { created, updated };
    });
    return NextResponse.json(counts);
  } catch (error) {
    console.error("CSV-import mislykkedes", error);
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSV-import mislykkedes." }, { status: 409 });
  }
}
