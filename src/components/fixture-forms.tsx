"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

type Fixture = {
  id: string; opponent: string; homeAway: string; scheduledAt: Date | null;
  venue: string | null; address: string | null; rankedInUrl: string | null;
  rankedInMatchId: string | null; result: string | null;
};

function dateInput(value: Date | null) {
  if (!value) return "";
  const parts = new Intl.DateTimeFormat("sv-SE", {
    timeZone: "Europe/Copenhagen", year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", hourCycle: "h23",
  }).format(new Date(value));
  return parts.replace(" ", "T");
}

function values(form: FormData) {
  return Object.fromEntries(["opponent", "homeAway", "scheduledAt", "venue", "address", "rankedInUrl", "rankedInMatchId", "result"]
    .map((name) => [name, form.get(name) ?? ""]));
}

function FixtureFields({ fixture }: { fixture?: Fixture }) {
  return <div className="form-grid">
    <label className="field-label">Modstander<input className="input" name="opponent" defaultValue={fixture?.opponent ?? ""} required maxLength={150} /></label>
    <label className="field-label">Hjemme eller ude<select className="input" name="homeAway" defaultValue={fixture?.homeAway ?? "home"}><option value="home">Hjemme</option><option value="away">Ude</option></select></label>
    <label className="field-label">Dato og tid<input className="input" name="scheduledAt" type="datetime-local" defaultValue={dateInput(fixture?.scheduledAt ?? null)} /></label>
    <label className="field-label">Resultat (valgfrit)<input className="input" name="result" defaultValue={fixture?.result ?? ""} placeholder="Fx 4-2" maxLength={50} /></label>
    <label className="field-label">Spillested<input className="input" name="venue" defaultValue={fixture?.venue ?? ""} maxLength={200} /></label>
    <label className="field-label">Adresse<input className="input" name="address" defaultValue={fixture?.address ?? ""} maxLength={300} /></label>
    <label className="field-label form-wide">RankedIn kamplink<input className="input" name="rankedInUrl" type="url" defaultValue={fixture?.rankedInUrl ?? ""} placeholder="https://www.rankedin.com/…" /></label>
    <label className="field-label form-wide">RankedIn kamp-ID<input className="input" name="rankedInMatchId" defaultValue={fixture?.rankedInMatchId ?? ""} maxLength={100} /></label>
  </div>;
}

export function CreateFixtureForm({ seasonId }: { seasonId: string }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError("");
    try {
      const response = await fetch(`/api/seasons/${seasonId}/fixtures`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values(new FormData(event.currentTarget))),
      });
      const data = await response.json() as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(data.error ?? "Kampen kunne ikke oprettes.");
      if (data.redirectTo) window.location.assign(data.redirectTo);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Kampen kunne ikke oprettes."); setBusy(false); }
  }
  return <form onSubmit={submit}><FixtureFields /><button className="btn btn-primary form-submit" disabled={busy}>{busy ? "Opretter …" : "Opret kamp"}</button>{error && <p className="form-message form-error" role="status">{error}</p>}</form>;
}

export function EditFixtureForm({ fixture }: { fixture: Fixture }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/fixtures/${fixture.id}`, {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values(new FormData(event.currentTarget))),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kampen kunne ikke gemmes.");
      setMessage("Kampen er gemt.");
      router.refresh();
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "Kampen kunne ikke gemmes."); }
    finally { setBusy(false); }
  }
  return <section className="card"><div className="card-head"><div><h2 className="card-title">Rediger kamp</h2><p className="card-subtitle">Ændringer her opdaterer holdets plan.</p></div></div><form onSubmit={submit}><FixtureFields fixture={fixture} /><button className="btn btn-primary form-submit" disabled={busy}>{busy ? "Gemmer …" : "Gem kamp"}</button>{message && <p className={`form-message${error ? " form-error" : ""}`} role="status">{message}</p>}</form></section>;
}

export function ImportFixturesForm({ seasonId }: { seasonId: string }) {
  const router = useRouter();
  const [csv, setCsv] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage(""); setError(false);
    try {
      const response = await fetch(`/api/seasons/${seasonId}/fixtures/import`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ csv }),
      });
      const data = await response.json() as { error?: string; created?: number; updated?: number };
      if (!response.ok) throw new Error(data.error ?? "CSV-import mislykkedes.");
      const created = data.created ?? 0;
      const updated = data.updated ?? 0;
      setMessage(`${created} ${created === 1 ? "kamp" : "kampe"} oprettet, ${updated} opdateret.`);
      router.refresh();
    } catch (cause) { setError(true); setMessage(cause instanceof Error ? cause.message : "CSV-import mislykkedes."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    <p className="card-subtitle">Kolonner: modstander;hjemme_ude;dato_tid;spillested;adresse;rankedin_link;rankedin_id;resultat. Brug dansk tid som ÅÅÅÅ-MM-DD TT:MM. Genimport opdaterer kampe med samme RankedIn-ID eller modstander og hjemme/ude.</p>
    <input className="input csv-file" type="file" accept=".csv,text/csv" aria-label="Vælg CSV-fil" onChange={async (event) => {
      const file = event.target.files?.[0];
      if (file) setCsv(await file.text());
    }} />
    <label className="field-label">Eller indsæt CSV<textarea className="input csv-textarea" value={csv} onChange={(event) => setCsv(event.target.value)} placeholder={'modstander;hjemme_ude;dato_tid;spillested;adresse;rankedin_link;rankedin_id;resultat\nEksempelhold;hjemme;2026-11-20 17:00;;;;;'} /></label>
    <button className="btn btn-primary form-submit" disabled={busy || !csv.trim()}>{busy ? "Importerer …" : "Importer kampe"}</button>
    {message && <p className={`form-message${error ? " form-error" : ""}`} role="status">{message}</p>}
  </form>;
}
