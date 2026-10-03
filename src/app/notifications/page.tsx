import Link from "next/link";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { NotificationList } from "@/components/notification-list";

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!db) return <main className="setup-wrap"><h1>Databasen mangler</h1></main>;
  const rows = await db.select().from(notifications).where(eq(notifications.userId, session.userId))
    .orderBy(desc(notifications.createdAt)).limit(100);
  return <main className="setup-wrap teams-page">
    <div className="teams-top"><Link className="brand" href="/"><span className="brand-mark">L</span><span>Lunar Holdmanager</span></Link><Link className="text-link" href="/">← Til overblik</Link></div>
    <div className="eyebrow">Beskeder</div><h1>Notifikationer</h1>
    <p className="card-subtitle">Nyheder om datoafstemninger, kampdatoer og truppen.</p>
    <section className="card" style={{ maxWidth: 780, marginTop: 24 }}><NotificationList items={rows.map((row) => ({
      id: row.id, title: row.title, body: row.body, href: row.href,
      createdAt: row.createdAt.toISOString(), readAt: row.readAt?.toISOString() ?? null,
    }))} /></section>
  </main>;
}
