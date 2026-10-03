"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Member = { id: string; name: string; rank: number | null; status: string | null };

export function SquadPlanner({ matchId, members, canManage }: { matchId: string; members: Member[]; canManage: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const playing = members.filter((member) => member.status === "participant");
  const reserves = members.filter((member) => member.status === "reserve");

  async function change(memberId: string, status: string) {
    setBusy(memberId); setError("");
    try {
      const response = await fetch(`/api/matches/${matchId}/squad`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberId, status }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Truppen kunne ikke gemmes.");
      router.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Truppen kunne ikke gemmes."); }
    finally { setBusy(null); }
  }

  return <section className="card">
    <div className="card-head"><div><h2 className="card-title">Trup og reserver</h2><p className="card-subtitle">Kaptajnen vælger seks spillere til kampen.</p></div><span className="badge">{playing.length}/6 valgt</span></div>
    {playing.length < 6 && <p className="form-message form-error">Der mangler {6 - playing.length} {playing.length === 5 ? "spiller" : "spillere"} til en fuld trup.</p>}
    <div className="squad-list">
      {members.map((member) => <div className="squad-row" key={member.id}>
        <span><strong>{member.name}</strong><small>{member.rank ? `Rang ${member.rank}` : "Ingen rang"}</small></span>
        {canManage ? <select className="input squad-select" aria-label={`Rolle for ${member.name}`} value={member.status ?? "none"} disabled={busy !== null} onChange={(event) => change(member.id, event.target.value)}>
          <option value="none">Ikke valgt</option><option value="participant">Spiller</option><option value="reserve">Reserve</option>
        </select> : <span className="badge">{member.status === "participant" ? "Spiller" : member.status === "reserve" ? "Reserve" : "Ikke valgt"}</span>}
      </div>)}
    </div>
    {reserves.length > 0 && <p className="card-subtitle">Reserver: {reserves.map((member) => member.name).join(", ")}</p>}
    {error && <p className="form-message form-error" role="status">{error}</p>}
  </section>;
}
