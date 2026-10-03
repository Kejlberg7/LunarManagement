import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../src/db/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("DATABASE_URL mangler.");

const client = postgres(connectionString, { prepare: false, max: 1 });
const db = drizzle(client, { schema });

try {
  const [team] = await db.insert(schema.teams).values({
    name: "Piranha Padel",
    rankedInId: "T003281428",
    pool: "Øst · Serie 3 · F",
    homeVenue: "Racket Club Roskilde · Yellowbeard Arena",
    homeAddress: "Rønøs Alle 2, 4000 Roskilde",
    rankedInUrl: "https://www.rankedin.com/en/team/homepage/3281428",
    sourceUpdatedAt: new Date("2026-10-03T12:00:00Z"),
  }).onConflictDoUpdate({
    target: schema.teams.rankedInId,
    set: {
      pool: "Øst · Serie 3 · F",
      homeVenue: "Racket Club Roskilde · Yellowbeard Arena",
      homeAddress: "Rønøs Alle 2, 4000 Roskilde",
      rankedInUrl: "https://www.rankedin.com/en/team/homepage/3281428",
      sourceUpdatedAt: new Date("2026-10-03T12:00:00Z"),
    },
  }).returning();

  const [season] = await db.insert(schema.seasons).values({
    teamId: team.id,
    name: "Efterår",
    year: 2026,
    startsAt: new Date("2026-08-24T00:00:00+02:00"),
    endsAt: new Date("2026-11-29T23:59:00+01:00"),
  }).onConflictDoUpdate({
    target: [schema.seasons.teamId, schema.seasons.year, schema.seasons.name],
    set: { startsAt: new Date("2026-08-24T00:00:00+02:00"), endsAt: new Date("2026-11-29T23:59:00+01:00") },
  }).returning();

  const members = [
    [1, "Christian Stokholm", "R000252100", "captain"],
    [2, "Peter Kejlberg", "R000171287", "admin"],
    [3, "Jakob Staugaard", "R000254199", "player"],
    [4, "Jannick Hansen", "R000374802", "player"],
    [5, "Kenneth Reimann", "R000227997", "player"],
    [6, "Ulf Chabert", "R000225227", "player"],
    [7, "Mikkel Johansen", "R000173463", "player"],
    [8, "Frank Iversen", "R000329417", "player"],
    [9, "Kim Støvring Nisted", "R000380179", "player"],
  ] as const;

  const bootstrapEmail = process.env.BOOTSTRAP_ADMIN_EMAIL?.trim().toLowerCase() || null;
  for (const [rank, name, rankedInId, role] of members) {
    await db.insert(schema.teamMembers).values({
      teamId: team.id,
      name,
      rankedInId,
      rank,
      role,
      ...(rankedInId === "R000171287" && bootstrapEmail ? { email: bootstrapEmail } : {}),
    }).onConflictDoUpdate({
      target: [schema.teamMembers.teamId, schema.teamMembers.rankedInId],
      set: { name, rank, role, ...(rankedInId === "R000171287" && bootstrapEmail ? { email: bootstrapEmail } : {}) },
    });
  }

  const matches = [
    { id: "154270", date: "2026-09-06T00:00:00+02:00", time: null, opponent: "PI København 3", side: "away", result: "0-6", address: null },
    { id: "154234", date: "2026-09-14T00:00:00+02:00", time: null, opponent: "Jystrup IF 2", side: "away", result: "1-5", address: null },
    { id: "154223", date: "2026-10-01T17:00:00+02:00", time: "17:00", opponent: "LBI H2", side: "home", result: null, address: "Rønøs Alle 2, 4000 Roskilde" },
    { id: "154230", date: "2026-10-15T17:00:00+02:00", time: "17:00", opponent: "Slagelse Padel 6", side: "home", result: null, address: "Rønøs Alle 2, 4000 Roskilde" },
    { id: "154227", date: "2026-11-18T17:00:00+01:00", time: "17:00", opponent: "Aceholes", side: "home", result: null, address: "Rønøs Alle 2, 4000 Roskilde" },
    { id: "154248", date: "2026-11-22T12:00:00+01:00", time: "12:00", opponent: "KPK 18", side: "away", result: null, address: "Ravnsborgvej 3d, 4600 Køge" },
  ] as const;

  for (const match of matches) {
    const date = match.time ? new Date(match.date) : new Date(match.date.slice(0, 10) + "T12:00:00+01:00");
    await db.insert(schema.fixtures).values({
      seasonId: season.id,
      opponent: match.opponent,
      homeAway: match.side,
      scheduledAt: date,
      venue: match.side === "home" ? team.homeVenue : null,
      address: match.address,
      rankedInMatchId: match.id,
      rankedInUrl: `https://www.rankedin.com/en/team/matchresults/${match.id}`,
      status: match.result ? "completed" : "scheduled",
      result: match.result,
      sourceUpdatedAt: new Date("2026-10-03T12:00:00Z"),
    }).onConflictDoUpdate({
      target: schema.fixtures.rankedInMatchId,
      set: {
        opponent: match.opponent,
        homeAway: match.side,
        scheduledAt: date,
        address: match.address,
        status: match.result ? "completed" : "scheduled",
        result: match.result,
        sourceUpdatedAt: new Date("2026-10-03T12:00:00Z"),
      },
    });
  }
  console.info(`Piranha Padel pilothold klargjort (${members.length} spillere, ${matches.length} kampe).`);
} finally {
  await client.end();
}
