import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { seasons, teamAccess } from "@/db/schema";
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
    return NextResponse.json({ error: "Kun kaptajnen kan oprette en sæson." }, { status: 403 });
  }
  const body = await request.json() as { name?: string; year?: number };
  const year = Number(body.year);
  if (!["Forår", "Efterår"].includes(body.name ?? "") || !Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Vælg en gyldig sæson og et år." }, { status: 400 });
  }
  const [season] = await db.insert(seasons).values({ teamId: id, name: body.name!, year })
    .onConflictDoNothing().returning({ id: seasons.id });
  if (!season) return NextResponse.json({ error: "Sæsonen findes allerede." }, { status: 409 });
  return NextResponse.json({ redirectTo: `/?team=${id}&season=${season.id}` }, { status: 201 });
}
