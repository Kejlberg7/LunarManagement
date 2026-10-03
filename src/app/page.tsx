import Link from "next/link";
import { redirect } from "next/navigation";
import { and, asc, desc, eq, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import { fixtures, notifications, seasons, teamAccess, teamMembers, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { dateLabel } from "@/lib/dates";
import { PushSetup } from "@/components/push-setup";
import { RecurringAvailability } from "@/components/recurring-availability";

export const dynamic = "force-dynamic";

function initials(name: string) {
  return name.split(/\s+/).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
}

function dateParts(value: Date | null) {
  if (!value) return { day: "—", month: "Aftales" };
  const date = new Date(value);
  return {
    day: new Intl.DateTimeFormat("da-DK", { day: "2-digit", timeZone: "Europe/Copenhagen" }).format(date),
    month: new Intl.DateTimeFormat("da-DK", { month: "short", timeZone: "Europe/Copenhagen" }).format(date).replace(".", ""),
  };
}

export default async function HomePage({ searchParams }: { searchParams: Promise<{ team?: string; season?: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  const selected = await searchParams;

  if (!db) {
    return <SetupMessage title="Databasen mangler" detail="Forbind Neon og sæt DATABASE_URL for at åbne holdets sæson." />;
  }

  const accessRows = await db.select({
    role: teamAccess.role,
    teamId: teams.id,
    teamName: teams.name,
    pool: teams.pool,
    rankedInId: teams.rankedInId,
    rankedInUrl: teams.rankedInUrl,
    homeVenue: teams.homeVenue,
    homeAddress: teams.homeAddress,
  })
    .from(teamAccess)
    .innerJoin(teams, eq(teamAccess.teamId, teams.id))
    .where(eq(teamAccess.userId, session.userId))
    .orderBy(asc(teamAccess.createdAt), asc(teams.name));
  const access = accessRows.find((row) => row.teamId === selected.team) ?? accessRows[0];

  if (!access) {
    return <SetupMessage title="Du mangler holdadgang" detail="Når kaptajnen har tilføjet din e-mail til holdets spillerliste, får du adgang til sæsonen her." email={session.email} />;
  }

  const seasonRows = await db.select().from(seasons)
    .where(eq(seasons.teamId, access.teamId))
    .orderBy(desc(seasons.year), desc(sql`case when lower(${seasons.name}) = 'efterår' then 2 when lower(${seasons.name}) = 'forår' then 1 else 0 end`), desc(seasons.name));
  const season = seasonRows.find((row) => row.id === selected.season) ?? seasonRows[0];
  const overviewHref = season ? `/?team=${access.teamId}&season=${season.id}` : `/?team=${access.teamId}`;
  const matchRows = season
    ? await db.select().from(fixtures)
      .where(eq(fixtures.seasonId, season.id))
      .orderBy(asc(fixtures.scheduledAt))
    : [];
  const members = await db.select().from(teamMembers)
    .where(eq(teamMembers.teamId, access.teamId))
    .orderBy(asc(teamMembers.rank));
  const upcoming = matchRows.filter((match) => !match.scheduledAt || match.scheduledAt >= new Date());
  const pendingResults = matchRows.filter((match) => match.status !== "completed" && match.scheduledAt && match.scheduledAt < new Date());
  const completed = matchRows.filter((match) => match.status === "completed").length;
  const recentNotifications = await db.select().from(notifications)
    .where(eq(notifications.userId, session.userId)).orderBy(desc(notifications.createdAt)).limit(5);
  const [unread] = await db.select({ total: sql<number>`count(*)::int` }).from(notifications)
    .where(and(eq(notifications.userId, session.userId), isNull(notifications.readAt)));
  const nextMatch = upcoming[0];

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand"><span className="brand-mark">L</span><span className="brand-name">Lunar Holdmanager</span></div>
        <div style={{ width: "100%" }}>
          <p className="nav-label">Hold</p>
          <Link className="nav-link active" href={overviewHref}><span>⌂</span><span className="nav-text">Overblik</span></Link>
          <a className="nav-link" href="#kampe"><span>▦</span><span className="nav-text">Kampe</span></a>
          <a className="nav-link" href="#spillere"><span>♙</span><span className="nav-text">Spillere</span></a>
          <a className="nav-link" href="#indstillinger"><span>⚙</span><span className="nav-text">Indstillinger</span></a>
          <Link className="nav-link" href="/teams"><span>♟</span><span className="nav-text">Hold</span></Link>
          <Link className="nav-link" href="/notifications"><span>♧</span><span className="nav-text">Beskeder{unread.total ? ` (${unread.total})` : ""}</span></Link>
        </div>
        <div className="sidebar-spacer" />
        <div className="season-chip"><strong>{season?.name ?? "Sæson"} {season?.year ?? ""}</strong><br />{access.pool}<br />{access.rankedInId.startsWith("local:") ? "Lokalt hold" : `RankedIn ID: ${access.rankedInId}`}<br /><Link href="/teams">Skift hold eller sæson →</Link></div>
      </aside>

      <main className="main">
        <header className="topbar">
          <div><div className="eyebrow">{access.teamName} · {season?.name} {season?.year}</div></div>
          <div className="profile">
            <span className="avatar">{initials(session.email)}</span>
            <span>{session.email}</span>
            <form action="/api/auth/logout" method="post"><button className="logout" type="submit">Log ud</button></form>
          </div>
        </header>

        <div className="intro-row">
          <div>
            <div className="eyebrow">Sæsonoverblik</div>
            <h1>Hej, holdet 👋</h1>
            <p>{nextMatch ? `Næste kamp: ${nextMatch.opponent} · ${dateLabel(nextMatch.scheduledAt)}` : "Du er ajour med sæsonen."}</p>
          </div>
          {access.rankedInUrl && <Link className="btn btn-primary" href={access.rankedInUrl} target="_blank" rel="noreferrer">Åbn holdet i RankedIn ↗</Link>}
        </div>

        <div className="grid">
          <div className="stack">
            <section className="card" id="kampe">
              <div className="card-head">
                <div><h2 className="card-title">Kommende kampe</h2><p className="card-subtitle">{access.rankedInUrl ? "Datoer og praktiske detaljer fra RankedIn" : "Holdets kampe i denne sæson"}</p></div>
                <div className="card-actions"><span className="badge"><span className="badge-dot" />{upcoming.length} på programmet</span>{season && <Link className="text-link" href={`/seasons/${season.id}/fixtures`}>Alle kampe →</Link>}</div>
              </div>
              {upcoming.length ? upcoming.map((match) => {
                const date = dateParts(match.scheduledAt);
                const home = match.homeAway === "home";
                return (
                  <article className="fixture" key={match.id}>
                    <div className="fixture-date"><div className="fixture-day">{date.day}</div><div className="fixture-month">{date.month}</div></div>
                    <div>
                      <div className="fixture-title">{home ? access.teamName : match.opponent} <span style={{ color: "#9da8a1", fontWeight: 400 }}>mod</span> {home ? match.opponent : access.teamName}</div>
                      <div className="fixture-meta">
                        <span>◷ {match.scheduledAt ? new Intl.DateTimeFormat("da-DK", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }).format(match.scheduledAt) : "Tid aftales"}</span>
                        <span>⌖ {match.address ?? (home ? access.homeAddress : "Sted aftales")}</span>
                      </div>
                    </div>
                    <div className="fixture-action">
                      {match.status === "completed" ? <span className="badge">{match.result}</span> : <span className="badge">{home ? "Hjemme" : "Ude"}</span>}
                      <Link className="text-link" href={`/matches/${match.id}`}>Se kamp →</Link>
                    </div>
                  </article>
                );
              }) : <div className="empty-state">Der er ikke flere kampe på programmet.</div>}
              <div className="summary-grid">
                <div className="summary-cell"><div className="summary-number">{members.length}</div><div className="summary-label">spillere på holdet</div></div>
                <div className="summary-cell"><div className="summary-number">{completed}/{matchRows.length}</div><div className="summary-label">kampe afviklet</div></div>
                <div className="summary-cell"><div className="summary-number">{Math.max(members.length - 6, 0)}</div><div className="summary-label">mulige reserver</div></div>
              </div>
            </section>

            <section className="card" id="indstillinger">
              <div className="card-head"><div><h2 className="card-title">Telefonnotifikationer</h2><p className="card-subtitle">Få besked, når holdets kampplan ændrer sig</p></div><span>♧</span></div>
              <PushSetup />
              <p className="card-subtitle" style={{ marginTop: 12 }}>På iPhone: føj først Lunar Holdmanager til hjemmeskærmen. Du kan altid følge nye beskeder inde i appen.</p>
            </section>
            {recentNotifications.length > 0 && <section className="card">
              <div className="card-head"><div><h2 className="card-title">Nyt på holdet</h2><p className="card-subtitle">Notifikationer i appen</p></div><Link className="text-link" href="/notifications">Alle beskeder →</Link></div>
              {recentNotifications.map((notification) => <div className="notice-row" key={notification.id}>
                <Link href={notification.href} className="notice-title">{notification.title}</Link>
                <p>{notification.body}</p>
                <span>{new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }).format(notification.createdAt)}</span>
              </div>)}
            </section>}
            <RecurringAvailability teamId={access.teamId} />
          </div>

          <div className="stack stack-side">
            {pendingResults.length > 0 && <section className="card warning-card"><strong>Resultat mangler</strong><br />Kontrollér, om {pendingResults.map((match) => match.opponent).join(", ")} er registreret i RankedIn.<div style={{ marginTop: 9 }}><Link className="text-link" href={`/matches/${pendingResults[0].id}`}>Åbn kampen →</Link></div></section>}
            <section className="card" id="spillere">
              <div className="card-head"><div><h2 className="card-title">Truppen</h2><p className="card-subtitle">Spillere og intern rangorden</p></div><span className="badge">{members.length} spillere</span></div>
              {["owner", "captain"].includes(access.role) && <Link className="text-link" href={`/teams/${access.teamId}`}>Rediger hold og spillere →</Link>}
              <div className="member-list">
                {members.map((member) => (
                  <div key={member.id}>
                    <div className="member">
                      <span className="member-initials">{initials(member.name)}</span>
                      <span className="member-name">{member.name}{member.role === "captain" && <span className="captain-tag">Kaptajn</span>}{member.role === "vice_captain" && <span className="captain-tag">Stedfortræder</span>}</span>
                      <span className="member-rank">{member.rank ?? "—"}</span>
                    </div>
                  </div>
                ))}
              </div>
              <p className="card-subtitle" style={{ marginTop: 12 }}>Ranglisten og spilleberettigelse kontrolleres altid i RankedIn.</p>
            </section>

            <section className="card">
              <div className="card-head"><div><h2 className="card-title">Hjemmebane</h2><p className="card-subtitle">{access.teamName}</p></div></div>
              {access.homeVenue || access.homeAddress ? <div className="venue-line"><span className="venue-icon">⌖</span><div><div className="venue-name">{access.homeVenue}</div><div className="venue-address">{access.homeAddress}</div></div></div> : <p className="card-subtitle">Hjemmebane er ikke angivet endnu.</p>}
              {access.homeAddress && <a className="text-link" href={`https://maps.google.com/?q=${encodeURIComponent(access.homeAddress)}`} target="_blank" rel="noreferrer">Vis på kort ↗</a>}
            </section>

            {access.role === "owner" || access.role === "captain" ? (
              <section className="card warning-card">Som kaptajn er du ansvarlig for at registrere den officielle dato og opstilling i RankedIn samt kontrollere licenser før kampstart.</section>
            ) : (
              <section className="card warning-card">Officiel kampplan, holdopstilling og resultat føres i RankedIn. Denne app samler holdets planlægning.</section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

function SetupMessage({ title, detail, email }: { title: string; detail: string; email?: string }) {
  return (
    <main className="setup-wrap">
      <div className="setup-brand brand"><span className="brand-mark">L</span><span>Lunar Holdmanager</span></div>
      <section className="card setup-card">
        <span className="eyebrow">Lunar Ligaen · Pilot</span>
        <h1>{title}</h1>
        <p>{detail}</p>
        {email && <p className="card-subtitle">Logget ind som {email}</p>}
        <p className="card-subtitle">Bed holdets kaptajn om at tilføje dig med den e-mail, du bruger til login.</p>
        <form action="/api/auth/logout" method="post"><button className="logout" style={{ marginTop: 14, color: "#617067" }} type="submit">Log ud</button></form>
      </section>
    </main>
  );
}
