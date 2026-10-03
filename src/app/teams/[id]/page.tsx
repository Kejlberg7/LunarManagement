import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { teamAccess, teamMembers, teams } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { MemberManager, TeamSettingsForm } from "@/components/team-manager";

export const dynamic = "force-dynamic";

export default async function TeamManagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!db) notFound();
  const { id } = await params;
  const [team] = await db.select({
    id: teams.id, name: teams.name, pool: teams.pool,
    homeVenue: teams.homeVenue, homeAddress: teams.homeAddress,
    rankedInId: teams.rankedInId, rankedInUrl: teams.rankedInUrl,
    role: teamAccess.role,
  }).from(teams).innerJoin(teamAccess, eq(teamAccess.teamId, teams.id))
    .where(and(eq(teams.id, id), eq(teamAccess.userId, session.userId))).limit(1);
  if (!team || !["owner", "captain"].includes(team.role)) notFound();
  const members = await db.select({
    id: teamMembers.id, name: teamMembers.name, email: teamMembers.email,
    rankedInId: teamMembers.rankedInId, role: teamMembers.role, rank: teamMembers.rank,
  }).from(teamMembers).where(eq(teamMembers.teamId, id)).orderBy(asc(teamMembers.rank));

  return <main className="setup-wrap teams-page">
    <div className="teams-top"><Link className="brand" href="/"><span className="brand-mark">L</span><span>Lunar Holdmanager</span></Link><Link className="text-link" href="/teams">← Mine hold</Link></div>
    <div className="eyebrow">Holdstyring</div><h1>{team.name}</h1>
    <p className="card-subtitle">Opdatér holdets oplysninger og spillere. Officielle registreringer sker i RankedIn.</p>
    <div className="teams-grid">
      <section className="card"><div className="card-head"><div><h2 className="card-title">Holdoplysninger</h2></div></div><TeamSettingsForm team={team} /></section>
      <section className="card"><div className="card-head"><div><h2 className="card-title">Spillere</h2><p className="card-subtitle">{members.length} på holdet</p></div></div><MemberManager teamId={id} members={members} /></section>
    </div>
  </main>;
}
