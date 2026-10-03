"use client";

import { FormEvent, useState } from "react";

type Team = {
  id: string; name: string; pool: string; homeVenue: string; homeAddress: string;
  rankedInId: string; rankedInUrl: string;
};
type Member = { id: string; name: string; email: string | null; rankedInId: string | null; role: string; rank: number | null };

async function saveJson(url: string, method: "POST" | "PATCH", body: object) {
  const response = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json() as { error?: string };
  if (!response.ok) throw new Error(data.error ?? "Gemning mislykkedes.");
}

export function TeamSettingsForm({ team }: { team: Team }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    const form = new FormData(event.currentTarget);
    try {
      await saveJson(`/api/teams/${team.id}`, "PATCH", Object.fromEntries(form));
      setMessage("Holdoplysningerne er gemt.");
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "Gemning mislykkedes."); }
    finally { setBusy(false); }
  }
  return <form className="form-grid" onSubmit={submit}>
    <label className="field-label form-wide">Holdnavn<input className="input" name="name" defaultValue={team.name} required maxLength={120} /></label>
    <label className="field-label form-wide">Pulje<input className="input" name="pool" defaultValue={team.pool} maxLength={120} /></label>
    <label className="field-label form-wide">Hjemmebane<input className="input" name="homeVenue" defaultValue={team.homeVenue} maxLength={200} /></label>
    <label className="field-label form-wide">Adresse<input className="input" name="homeAddress" defaultValue={team.homeAddress} maxLength={300} /></label>
    <label className="field-label form-wide">RankedIn hold-ID<input className="input" name="rankedInId" defaultValue={team.rankedInId.startsWith("local:") ? "" : team.rankedInId} placeholder="Fx T003281428" maxLength={100} /></label>
    <label className="field-label form-wide">RankedIn holdlink<input className="input" name="rankedInUrl" type="url" defaultValue={team.rankedInUrl} placeholder="https://www.rankedin.com/…" /></label>
    <button className="btn btn-primary" disabled={busy}>{busy ? "Gemmer …" : "Gem hold"}</button>
    {message && <p className={`form-message${error ? " form-error" : ""}`} role="status">{message}</p>}
  </form>;
}

function memberBody(form: FormData) {
  return {
    name: form.get("name"), email: form.get("email"), rankedInId: form.get("rankedInId"),
    role: form.get("role"), rank: form.get("rank") ? Number(form.get("rank")) : null,
  };
}

function MemberEditor({ teamId, member }: { teamId: string; member: Member }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    try {
      await saveJson(`/api/teams/${teamId}/members/${member.id}`, "PATCH", memberBody(new FormData(event.currentTarget)));
      setMessage("Spilleren er gemt.");
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "Gemning mislykkedes."); }
    finally { setBusy(false); }
  }
  return <details className="member-editor"><summary>{member.name}<span>{member.role === "captain" ? "Kaptajn" : member.role === "vice_captain" ? "Stedfortræder" : member.role === "admin" ? "Administrator" : "Spiller"} · {member.rank ?? "—"}</span></summary>
    <form className="form-grid" onSubmit={submit}>
      <label className="field-label">Navn<input className="input" name="name" defaultValue={member.name} required maxLength={120} /></label>
      <label className="field-label">E-mail<input className="input" name="email" type="email" defaultValue={member.email ?? ""} /></label>
      <label className="field-label">Rolle<select className="input" name="role" defaultValue={member.role} disabled={member.role === "admin"}><option value="player">Spiller</option><option value="captain">Kaptajn</option><option value="vice_captain">Stedfortræder</option>{member.role === "admin" && <option value="admin">Administrator</option>}</select>{member.role === "admin" && <input type="hidden" name="role" value="admin" />}</label>
      <label className="field-label">Rangorden<input className="input" name="rank" type="number" min="1" max="999" defaultValue={member.rank ?? ""} /></label>
      <label className="field-label form-wide">RankedIn spiller-ID eller profillink<input className="input" name="rankedInId" defaultValue={member.rankedInId ?? ""} maxLength={300} /></label>
      <button className="btn btn-light" disabled={busy}>{busy ? "Gemmer …" : "Gem spiller"}</button>
      {message && <p className={`form-message${error ? " form-error" : ""}`} role="status">{message}</p>}
    </form>
  </details>;
}

export function MemberManager({ teamId, members }: { teamId: string; members: Member[] }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function add(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      await saveJson(`/api/teams/${teamId}/members`, "POST", memberBody(new FormData(event.currentTarget)));
      window.location.reload();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Spilleren kunne ikke tilføjes."); setBusy(false); }
  }
  return <>
    <div className="member-editors">{members.map((member) => <MemberEditor key={member.id} teamId={teamId} member={member} />)}</div>
    <form className="form-grid add-member" onSubmit={add}>
      <h3 className="form-wide">Tilføj spiller</h3>
      <label className="field-label">Navn<input className="input" name="name" required maxLength={120} /></label>
      <label className="field-label">E-mail<input className="input" name="email" type="email" /></label>
      <label className="field-label">Rolle<select className="input" name="role"><option value="player">Spiller</option><option value="captain">Kaptajn</option><option value="vice_captain">Stedfortræder</option></select></label>
      <label className="field-label">Rangorden<input className="input" name="rank" type="number" min="1" max="999" /></label>
      <label className="field-label form-wide">RankedIn spiller-ID eller profillink<input className="input" name="rankedInId" maxLength={300} /></label>
      <button className="btn btn-primary" disabled={busy}>{busy ? "Tilføjer …" : "Tilføj spiller"}</button>
      {error && <p className="form-message form-error" role="status">{error}</p>}
    </form>
  </>;
}
