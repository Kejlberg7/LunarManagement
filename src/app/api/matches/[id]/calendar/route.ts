import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { fixtures, seasons, teamAccess, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

function stamp(date: Date) { return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}Z$/, "Z"); }
function escape(value: string) { return value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"); }

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const { id } = await context.params;
  const [match] = await db.select({ id: fixtures.id, teamId: teams.id, teamName: teams.name,
    opponent: fixtures.opponent, homeAway: fixtures.homeAway, scheduledAt: fixtures.scheduledAt,
    venue: fixtures.venue, address: fixtures.address, homeAddress: teams.homeAddress,
    rankedInUrl: fixtures.rankedInUrl,
  }).from(fixtures).innerJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(teams, eq(seasons.teamId, teams.id)).where(eq(fixtures.id, id)).limit(1);
  if (!match) return NextResponse.json({ error: "Kampen blev ikke fundet." }, { status: 404 });
  const [access] = await db.select({ userId: teamAccess.userId }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, match.teamId), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access) return NextResponse.json({ error: "Du har ikke adgang til kampen." }, { status: 403 });
  if (!match.scheduledAt) return NextResponse.json({ error: "Kampdatoen er ikke sat endnu." }, { status: 409 });

  const title = match.homeAway === "home" ? `${match.teamName} mod ${match.opponent}` : `${match.opponent} mod ${match.teamName}`;
  const details = [`Kamp i Lunar Ligaen`, `Planlægning: ${new URL(request.url).origin}/matches/${id}`];
  if (match.rankedInUrl) details.push(`Officiel kamp: ${match.rankedInUrl}`);
  const lines = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Lunar Holdmanager//DA", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
    `UID:${id}@lunar-management.vercel.app`, `DTSTAMP:${stamp(new Date())}`, `DTSTART:${stamp(match.scheduledAt)}`,
    `DTEND:${stamp(new Date(match.scheduledAt.getTime() + 2 * 60 * 60 * 1000))}`, `SUMMARY:${escape(title)}`,
    `LOCATION:${escape(match.address || match.venue || match.homeAddress || "")}`, `DESCRIPTION:${escape(details.join("\n"))}`,
    "END:VEVENT", "END:VCALENDAR", ""];
  return new Response(lines.join("\r\n"), { headers: {
    "Content-Type": "text/calendar; charset=utf-8",
    "Content-Disposition": `attachment; filename="lunar-kamp-${id}.ics"`,
    "Cache-Control": "private, no-store",
  } });
}
