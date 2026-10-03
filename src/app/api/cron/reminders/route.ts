import { and, eq, gt, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { availabilityOptions, availabilityResponses, fixtureSelections, fixtures, reminderSends, seasons, teamAccess, teamMembers } from "@/db/schema";
import { notifyUsers } from "@/lib/push";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Ingen adgang." }, { status: 401 });
  }
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const now = new Date();
  const horizon = new Date(now.getTime() + 36 * 60 * 60 * 1000);
  const due = await db.select({ id: fixtures.id, opponent: fixtures.opponent, scheduledAt: fixtures.scheduledAt,
    deadline: fixtures.responseDeadline, teamId: seasons.teamId,
  }).from(fixtures).innerJoin(seasons, eq(fixtures.seasonId, seasons.id))
    .where(or(and(gt(fixtures.responseDeadline, now), lte(fixtures.responseDeadline, horizon)),
      and(gt(fixtures.scheduledAt, now), lte(fixtures.scheduledAt, horizon))))
    .limit(100);
  let reminders = 0;
  for (const fixture of due) {
    const accesses = await db.select({ userId: teamAccess.userId }).from(teamAccess).where(eq(teamAccess.teamId, fixture.teamId));
    const members = await db.select({ id: teamMembers.id, userId: teamMembers.userId }).from(teamMembers)
      .where(eq(teamMembers.teamId, fixture.teamId));
    if (fixture.deadline && fixture.deadline > now && fixture.deadline <= horizon) {
      const options = await db.select({ id: availabilityOptions.id }).from(availabilityOptions)
        .where(eq(availabilityOptions.fixtureId, fixture.id));
      const responses = await db.select({ memberId: availabilityResponses.memberId, optionId: availabilityResponses.optionId })
        .from(availabilityResponses).innerJoin(availabilityOptions, eq(availabilityResponses.optionId, availabilityOptions.id))
        .where(eq(availabilityOptions.fixtureId, fixture.id));
      if (options.length) {
        const users = members.filter((member) => member.userId && accesses.some((access) => access.userId === member.userId)
          && responses.filter((answer) => answer.memberId === member.id).length < options.length).map((member) => member.userId!);
        reminders += await deliver(fixture.id, users, "poll_deadline", "Svarfristen nærmer sig",
          `Svar på datoafstemningen mod ${fixture.opponent}, før fristen udløber.`);
      }
    }
    if (fixture.scheduledAt && fixture.scheduledAt > now && fixture.scheduledAt <= horizon) {
      const selected = await db.select({ memberId: fixtureSelections.memberId }).from(fixtureSelections)
        .where(and(eq(fixtureSelections.fixtureId, fixture.id), eq(fixtureSelections.status, "participant")));
      const users = selected.length
        ? members.filter((member) => member.userId && selected.some((item) => item.memberId === member.id)).map((member) => member.userId!)
        : accesses.map((access) => access.userId);
      reminders += await deliver(fixture.id, users, "match_soon", "Kamp snart",
        `Kampen mod ${fixture.opponent} spilles snart. Se tid, sted og trup i appen.`);
    }
  }
  return NextResponse.json({ checked: due.length, reminders });
}

async function deliver(fixtureId: string, users: string[], kind: string, title: string, body: string) {
  if (!db) return 0;
  let sent = 0;
  for (const userId of new Set(users)) {
    const reserved = await db.insert(reminderSends).values({ fixtureId, userId, kind })
      .onConflictDoNothing().returning({ fixtureId: reminderSends.fixtureId });
    if (!reserved.length) continue;
    await notifyUsers([userId], { title, body, href: `/matches/${fixtureId}`, fixtureId });
    sent++;
  }
  return sent;
}
