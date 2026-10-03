import { NextResponse } from "next/server";
import { db } from "@/db";
import { seasons, teamAccess, teamMembers, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });

  const body = await request.json() as {
    name?: string; captainName?: string; season?: string; year?: number;
    pool?: string; homeVenue?: string; homeAddress?: string; rankedInUrl?: string;
  };
  const name = body.name?.trim() ?? "";
  const captainName = body.captainName?.trim() ?? "";
  const seasonName = body.season;
  const year = Number(body.year);
  const rankedInUrl = body.rankedInUrl?.trim() ?? "";
  if (!name || name.length > 120 || !captainName || captainName.length > 120 ||
      !["Forår", "Efterår"].includes(seasonName ?? "") ||
      !Number.isInteger(year) || year < 2020 || year > 2100) {
    return NextResponse.json({ error: "Udfyld holdnavn, kaptajn og en gyldig sæson." }, { status: 400 });
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
    const teamId = await db.transaction(async (tx) => {
      const [team] = await tx.insert(teams).values({
        name,
        rankedInId: `local:${crypto.randomUUID()}`,
        pool: body.pool?.trim().slice(0, 120) ?? "",
        homeVenue: body.homeVenue?.trim().slice(0, 200) ?? "",
        homeAddress: body.homeAddress?.trim().slice(0, 300) ?? "",
        rankedInUrl,
      }).returning({ id: teams.id });
      await tx.insert(seasons).values({ teamId: team.id, name: seasonName!, year });
      await tx.insert(teamMembers).values({
        teamId: team.id, userId: session.userId, email: session.email,
        name: captainName, role: "captain", rank: 1,
      });
      await tx.insert(teamAccess).values({ teamId: team.id, userId: session.userId, role: "owner" });
      return team.id;
    });
    return NextResponse.json({ redirectTo: `/?team=${teamId}` }, { status: 201 });
  } catch (error) {
    console.error("Holdet kunne ikke oprettes", error);
    return NextResponse.json({ error: "Holdet kunne ikke oprettes. Prøv igen." }, { status: 500 });
  }
}
