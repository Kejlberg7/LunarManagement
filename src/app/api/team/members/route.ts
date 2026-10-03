import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { teamMembers } from "@/db/schema";
import { getSession } from "@/lib/auth";
import { PATCH as updateMember } from "@/app/api/teams/[id]/members/[memberId]/route";

export const runtime = "nodejs";

// Keeps already open pilot pages functional while clients load the new management UI.
export async function PATCH(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  if (!db) return NextResponse.json({ error: "Databasen er ikke sat op." }, { status: 503 });
  const body = await request.json() as { memberId?: string; email?: string };
  if (!body.memberId || !body.email) {
    return NextResponse.json({ error: "Skriv en gyldig e-mailadresse." }, { status: 400 });
  }
  const [member] = await db.select({
    id: teamMembers.id, teamId: teamMembers.teamId, name: teamMembers.name,
    role: teamMembers.role, rank: teamMembers.rank, rankedInId: teamMembers.rankedInId,
  }).from(teamMembers).where(eq(teamMembers.id, body.memberId)).limit(1);
  if (!member) return NextResponse.json({ error: "Spilleren blev ikke fundet." }, { status: 404 });
  const updatedRequest = new Request(request.url, {
    method: "PATCH", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: member.name, email: body.email, role: member.role, rank: member.rank, rankedInId: member.rankedInId }),
  });
  return updateMember(updatedRequest, { params: Promise.resolve({ id: member.teamId, memberId: member.id }) });
}
