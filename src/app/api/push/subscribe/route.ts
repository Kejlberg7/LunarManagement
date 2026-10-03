import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import type { PushSubscription } from "web-push";
import { db } from "@/db";
import { pushSubscriptions, teamAccess } from "@/db/schema";
import { getSession } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  const database = db;
  if (!database) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const [access] = await database.select({ userId: teamAccess.userId }).from(teamAccess).where(eq(teamAccess.userId, session.userId)).limit(1);
  if (!access) return NextResponse.json({ error: "Du har ikke adgang til et hold endnu." }, { status: 403 });

  const submittedSubscription = await request.json() as { endpoint?: string; expirationTime?: number | null; keys?: { p256dh?: string; auth?: string } };
  if (!submittedSubscription.endpoint || !submittedSubscription.keys?.p256dh || !submittedSubscription.keys.auth) {
    return NextResponse.json({ error: "Push-abonnementet er ugyldigt." }, { status: 400 });
  }
  const subscription: PushSubscription = {
    endpoint: submittedSubscription.endpoint,
    ...(submittedSubscription.expirationTime !== undefined ? { expirationTime: submittedSubscription.expirationTime } : {}),
    keys: { p256dh: submittedSubscription.keys.p256dh, auth: submittedSubscription.keys.auth },
  };
  await database.insert(pushSubscriptions).values({
    userId: session.userId,
    endpoint: subscription.endpoint,
    subscription,
  }).onConflictDoUpdate({
    target: pushSubscriptions.endpoint,
    set: { userId: session.userId, subscription },
  });
  return NextResponse.json({ ok: true });
}
