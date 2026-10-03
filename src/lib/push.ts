import "server-only";
import webpush from "web-push";
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { notifications, pushSubscriptions } from "@/db/schema";

type PushPayload = { title: string; body: string; href: string; fixtureId?: string };

export async function notifyUsers(userIds: string[], payload: PushPayload) {
  if (!db || userIds.length === 0) return;
  const distinctUserIds = [...new Set(userIds)];
  await db.insert(notifications).values(distinctUserIds.map((userId) => ({
    userId,
    fixtureId: payload.fixtureId,
    title: payload.title,
    body: payload.body,
    href: payload.href,
  })));

  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT ?? "mailto:admin@example.com", publicKey, privateKey);
  const subscriptions = await db.select().from(pushSubscriptions).where(inArray(pushSubscriptions.userId, distinctUserIds));
  await Promise.allSettled(subscriptions.map(async (row) => {
    try {
      await webpush.sendNotification(row.subscription as webpush.PushSubscription, JSON.stringify(payload));
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      if (statusCode === 404 || statusCode === 410) {
        await db.delete(pushSubscriptions).where(and(eq(pushSubscriptions.id, row.id), eq(pushSubscriptions.userId, row.userId)));
      }
      console.warn("Push-notifikation kunne ikke leveres", statusCode ?? error);
    }
  }));
}
