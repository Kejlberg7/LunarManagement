"use client";

import { FormEvent, useState } from "react";

async function submitJson(url: string, body: object) {
  const response = await fetch(url, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body),
  });
  const data = await response.json() as { error?: string; redirectTo?: string };
  if (!response.ok) throw new Error(data.error ?? "Gemning mislykkedes.");
  if (data.redirectTo) window.location.assign(data.redirectTo);
}

export function CreateTeamForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await submitJson("/api/teams", {
        name: form.get("name"), captainName: form.get("captainName"),
        season: form.get("season"), year: Number(form.get("year")),
        pool: form.get("pool"), homeVenue: form.get("homeVenue"),
        homeAddress: form.get("homeAddress"), rankedInUrl: form.get("rankedInUrl"),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Holdet kunne ikke oprettes.");
      setBusy(false);
    }
  }
  return <form className="form-grid" onSubmit={submit}>
    <label className="field-label">Holdnavn<input className="input" name="name" required maxLength={120} placeholder="Fx Piranha Padel" /></label>
    <label className="field-label">Dit navn på holdet<input className="input" name="captainName" required maxLength={120} /></label>
    <label className="field-label">Sæson<select className="input" name="season"><option>Forår</option><option>Efterår</option></select></label>
    <label className="field-label">År<input className="input" name="year" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear()} required /></label>
    <label className="field-label">Pulje (valgfri)<input className="input" name="pool" maxLength={120} /></label>
    <label className="field-label">Hjemmebane (valgfri)<input className="input" name="homeVenue" maxLength={200} /></label>
    <label className="field-label form-wide">Adresse (valgfri)<input className="input" name="homeAddress" maxLength={300} /></label>
    <label className="field-label form-wide">Holdlink i RankedIn (valgfri)<input className="input" name="rankedInUrl" type="url" placeholder="https://www.rankedin.com/…" /></label>
    <button className="btn btn-primary" disabled={busy}>{busy ? "Opretter …" : "Opret hold"}</button>
    {error && <p className="form-message form-error" role="status">{error}</p>}
  </form>;
}

export function CreateSeasonForm({ teamId }: { teamId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    const form = new FormData(event.currentTarget);
    try {
      await submitJson(`/api/teams/${teamId}/seasons`, {
        name: form.get("name"), year: Number(form.get("year")),
      });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Sæsonen kunne ikke oprettes.");
      setBusy(false);
    }
  }
  return <form className="season-form" onSubmit={submit}>
    <label className="field-label">Ny sæson<select className="input" name="name"><option>Forår</option><option>Efterår</option></select></label>
    <label className="field-label">År<input className="input" name="year" type="number" min="2020" max="2100" defaultValue={new Date().getFullYear()} required /></label>
    <button className="btn btn-light" disabled={busy}>{busy ? "Opretter …" : "Tilføj sæson"}</button>
    {error && <p className="form-message form-error" role="status">{error}</p>}
  </form>;
}
