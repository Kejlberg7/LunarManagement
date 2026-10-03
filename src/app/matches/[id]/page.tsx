import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { availabilityOptions, availabilityResponses, fixtures, seasons, teamAccess, teamMembers, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { dateLabel } from "@/lib/dates";
import { PollTools } from "@/components/poll-tools";

export const dynamic = "force-dynamic";

export default async function MatchPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!db) notFound();
  const { id } = await params;
  const [match] = await db.select({
    id: fixtures.id,
    opponent: fixtures.opponent,
    homeAway: fixtures.homeAway,
    scheduledAt: fixtures.scheduledAt,
    venue: fixtures.venue,
    address: fixtures.address,
    result: fixtures.result,
    status: fixtures.status,
    rankedInUrl: fixtures.rankedInUrl,
    teamId: seasons.teamId,
    seasonId: seasons.id,
    teamName: teams.name,
    homeAddress: teams.homeAddress,
    rankedInTeamUrl: teams.rankedInUrl,
    pool: teams.pool,
  }).from(fixtures)
    .innerJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .innerJoin(teams, eq(seasons.teamId, teams.id))
    .where(eq(fixtures.id, id)).limit(1);
  if (!match) notFound();

  const [access] = await db.select({ role: teamAccess.role }).from(teamAccess)
    .where(and(eq(teamAccess.teamId, match.teamId), eq(teamAccess.userId, session.userId))).limit(1);
  if (!access) notFound();

  const [member] = await db.select({ id: teamMembers.id }).from(teamMembers)
    .where(and(eq(teamMembers.teamId, match.teamId), eq(teamMembers.userId, session.userId))).limit(1);
  const options = await db.select({ id: availabilityOptions.id, startsAt: availabilityOptions.startsAt })
    .from(availabilityOptions).where(eq(availabilityOptions.fixtureId, match.id)).orderBy(asc(availabilityOptions.startsAt));
  const responses = options.length ? await db.select({
    optionId: availabilityResponses.optionId,
    response: availabilityResponses.response,
    memberId: availabilityResponses.memberId,
  }).from(availabilityResponses)
    .innerJoin(teamMembers, eq(availabilityResponses.memberId, teamMembers.id))
    .where(eq(teamMembers.teamId, match.teamId)) : [];

  const pollOptions = options.map((option) => {
    const matching = responses.filter((response) => response.optionId === option.id);
    return {
      id: option.id,
      startsAt: option.startsAt.toISOString(),
      available: matching.filter((row) => row.response === "available").length,
      maybe: matching.filter((row) => row.response === "maybe").length,
      unavailable: matching.filter((row) => row.response === "unavailable").length,
      myResponse: matching.find((row) => row.memberId === member?.id)?.response,
      confirmed: match.scheduledAt?.getTime() === option.startsAt.getTime(),
    };
  });

  const home = match.homeAway === "home";
  const overviewHref = `/?team=${match.teamId}&season=${match.seasonId}`;
  return (
    <div className="shell">
      <aside className="sidebar">
        <Link className="brand" href={overviewHref}><span className="brand-mark">L</span><span className="brand-name">Lunar Holdmanager</span></Link>
        <div style={{ width: "100%" }}><p className="nav-label">Hold</p><Link className="nav-link" href={overviewHref}><span>⌂</span><span className="nav-text">Overblik</span></Link></div>
        <div className="sidebar-spacer" />
      </aside>
      <main className="main">
        <header className="topbar"><Link className="text-link" href={overviewHref}>← Tilbage til overblik</Link><span className="badge">{match.pool}</span></header>
        <div className="eyebrow">{match.teamName} · {home ? "Hjemmekamp" : "Udekamp"}</div>
        <h1>{home ? `${match.teamName} mod ${match.opponent}` : `${match.opponent} mod ${match.teamName}`}</h1>
        <p className="match-lead">{dateLabel(match.scheduledAt)} · {match.address ?? match.homeAddress}</p>
        <div className="match-layout">
          <div className="stack">
            <PollTools matchId={match.id} options={pollOptions} canManage={["owner", "captain"].includes(access.role)} canRespond={Boolean(member)} />
            <section className="card">
              <div className="card-head"><div><h2 className="card-title">Kampinformation</h2><p className="card-subtitle">Sidst importeret fra RankedIn til piloten</p></div></div>
              <div className="info-row"><span>Kamp</span><strong>{home ? "Hjemme" : "Ude"} mod {match.opponent}</strong></div>
              <div className="info-row"><span>Spillested</span><strong>{match.venue ?? match.address ?? match.homeAddress}</strong></div>
              <div className="info-row"><span>Status</span><strong>{match.result ? `Afsluttet · ${match.result}` : "Planlagt"}</strong></div>
              {match.rankedInUrl && <a className="btn btn-light" href={match.rankedInUrl} target="_blank" rel="noreferrer">Se den officielle kamp i RankedIn ↗</a>}
            </section>
          </div>
          <div className="stack">
            <section className="card"><h2 className="card-title">Før kampstart</h2><ul className="checklist">
              <li>Bekræft dato og sted med modstanderens kaptajn.</li>
              <li>Registrér den officielle kampdato og opstilling i RankedIn.</li>
              <li>Kontrollér licenser og holdets rangliste.</li>
              <li>Del første rundes matchprotokol senest 15 minutter før start.</li>
            </ul></section>
            <section className="card warning-card">Denne side hjælper holdet med planlægning. RankedIn er fortsat det officielle sted for kampdato, opstilling og resultat.</section>
          </div>
        </div>
      </main>
    </div>
  );
}
