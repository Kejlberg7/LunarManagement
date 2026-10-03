import Link from "next/link";
import { redirect } from "next/navigation";
import { asc, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { seasons, teamAccess, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { CreateSeasonForm, CreateTeamForm } from "@/components/team-forms";

export const dynamic = "force-dynamic";

export default async function TeamsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!db) return <main className="setup-wrap"><h1>Databasen mangler</h1></main>;
  const access = await db.select({
    id: teams.id, name: teams.name, pool: teams.pool, role: teamAccess.role,
  }).from(teamAccess).innerJoin(teams, eq(teamAccess.teamId, teams.id))
    .where(eq(teamAccess.userId, session.userId))
    .orderBy(asc(teamAccess.createdAt), asc(teams.name));
  const teamSeasons = await Promise.all(access.map(async (team) => ({
    ...team,
    seasons: await db!.select({ id: seasons.id, name: seasons.name, year: seasons.year })
      .from(seasons).where(eq(seasons.teamId, team.id))
      .orderBy(desc(seasons.year), desc(sql`case when lower(${seasons.name}) = 'efterår' then 2 when lower(${seasons.name}) = 'forår' then 1 else 0 end`), desc(seasons.name)),
  })));

  return <main className="setup-wrap teams-page">
    <div className="teams-top"><Link className="brand" href="/"><span className="brand-mark">L</span><span>Lunar Holdmanager</span></Link><Link className="text-link" href="/">← Til overblik</Link></div>
    <div className="eyebrow">Mine hold</div>
    <h1>Hold og sæsoner</h1>
    <p className="card-subtitle">Vælg sæsonen, du vil planlægge, eller opret et nyt hold.</p>
    <div className="teams-grid">
      <div className="stack">
        {teamSeasons.map((team) => <section className="card" key={team.id}>
          <div className="card-head"><div><h2 className="card-title">{team.name}</h2><p className="card-subtitle">{team.pool || "Pulje ikke angivet"}</p></div><span className="badge">{team.role === "owner" ? "Ejer" : team.role === "captain" ? "Kaptajn" : "Spiller"}</span></div>
          <div className="season-list">{team.seasons.map((season) => <Link className="season-row" key={season.id} href={`/?team=${team.id}&season=${season.id}`}>
            <span>{season.name} {season.year}</span><span>Åbn →</span>
          </Link>)}</div>
          {["owner", "captain"].includes(team.role) && <Link className="text-link" href={`/teams/${team.id}`}>Rediger hold og spillere →</Link>}
          {["owner", "captain"].includes(team.role) && <CreateSeasonForm teamId={team.id} />}
        </section>)}
        {!teamSeasons.length && <section className="card"><p>Du er ikke tilknyttet et hold endnu.</p></section>}
      </div>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Opret hold</h2><p className="card-subtitle">Du bliver kaptajn og kan derefter tilføje spillere og kampe.</p></div></div><CreateTeamForm /></section>
    </div>
  </main>;
}
