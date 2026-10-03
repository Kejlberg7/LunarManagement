import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, seasons, teamAccess, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { dateLabel } from "@/lib/dates";
import { CreateFixtureForm, ImportFixturesForm } from "@/components/fixture-forms";

export const dynamic = "force-dynamic";

export default async function FixturesPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!db) notFound();
  const { id } = await params;
  const [season] = await db.select({
    id: seasons.id, name: seasons.name, year: seasons.year,
    teamId: seasons.teamId, teamName: teams.name, role: teamAccess.role,
  }).from(seasons).innerJoin(teams, eq(seasons.teamId, teams.id))
    .innerJoin(teamAccess, and(eq(teamAccess.teamId, teams.id), eq(teamAccess.userId, session.userId)))
    .where(eq(seasons.id, id)).limit(1);
  if (!season) notFound();
  const rows = await db.select().from(fixtures).where(eq(fixtures.seasonId, id)).orderBy(asc(fixtures.scheduledAt));
  const canManage = ["owner", "captain"].includes(season.role);
  const overviewHref = `/?team=${season.teamId}&season=${season.id}`;

  return <main className="setup-wrap teams-page">
    <div className="teams-top"><Link className="brand" href={overviewHref}><span className="brand-mark">L</span><span>Lunar Holdmanager</span></Link><Link className="text-link" href={overviewHref}>← Til sæsonen</Link></div>
    <div className="eyebrow">{season.teamName} · {season.name} {season.year}</div>
    <h1>Kampprogram</h1>
    <p className="card-subtitle">{rows.length} {rows.length === 1 ? "kamp" : "kampe"} i sæsonen. Officielle datoer og resultater kontrolleres i RankedIn.</p>
    <div className="teams-grid">
      <section className="card"><div className="card-head"><div><h2 className="card-title">Sæsonens kampe</h2></div></div>
        <div className="season-list">{rows.map((fixture) => <Link className="season-row" href={`/matches/${fixture.id}`} key={fixture.id}>
          <span><strong>{fixture.opponent}</strong> · {fixture.homeAway === "home" ? "Hjemme" : "Ude"}<br /><small>{dateLabel(fixture.scheduledAt)} · {fixture.result || (fixture.sourceType === "csv" ? "CSV" : fixture.sourceType === "rankedin_public" ? "RankedIn" : "Manuel")}</small></span><span>Åbn →</span>
        </Link>)}</div>
        {!rows.length && <p className="card-subtitle">Ingen kampe endnu.</p>}
      </section>
      {canManage && <div className="stack">
        <section className="card"><div className="card-head"><div><h2 className="card-title">Opret kamp</h2><p className="card-subtitle">Tilføj en kamp, som holdet kan planlægge.</p></div></div><CreateFixtureForm seasonId={id} /></section>
        <section className="card"><div className="card-head"><div><h2 className="card-title">Importer CSV</h2><p className="card-subtitle">Opdatér flere kampe samlet.</p></div></div><ImportFixturesForm seasonId={id} /></section>
      </div>}
    </div>
  </main>;
}
