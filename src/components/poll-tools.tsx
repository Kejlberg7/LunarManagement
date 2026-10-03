"use client";

import { FormEvent, useState } from "react";

type Option = {
  id: string;
  startsAt: string;
  available: number;
  maybe: number;
  unavailable: number;
  responses: { name: string; response: string | null }[];
  myResponse?: string;
  confirmed?: boolean;
};

export function PollTools({ matchId, options, deadline, canManage, canRespond }: {
  matchId: string;
  options: Option[];
  deadline: string | null;
  canManage: boolean;
  canRespond: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  async function createPoll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    const form = new FormData(event.currentTarget);
    try {
      const dates = ["date1", "date2", "date3"]
        .map((field) => String(form.get(field) ?? ""))
        .filter(Boolean)
        .map((startsAt) => ({ startsAt: new Date(startsAt).toISOString() }));
      const deadline = String(form.get("deadline") ?? "");
      const response = await fetch(`/api/matches/${matchId}/options`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ options: dates, deadline: new Date(deadline).toISOString() }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Afstemningen kunne ikke oprettes.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Noget gik galt.");
    } finally {
      setBusy(false);
    }
  }

  async function respond(optionId: string, responseValue: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/matches/${matchId}/responses`, {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ optionId, response: responseValue }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Dit svar kunne ikke gemmes.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Noget gik galt.");
    } finally {
      setBusy(false);
    }
  }

  async function confirm(optionId: string) {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch(`/api/matches/${matchId}/confirm`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ optionId }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Kampdatoen kunne ikke bekræftes.");
      window.location.reload();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Noget gik galt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Find en kampdato</h2><p className="card-subtitle">Holdets svar bliver samlet her.</p></div></div>
      {deadline && <p className="card-subtitle">Svar senest {new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }).format(new Date(deadline))}{new Date(deadline) < new Date() ? " · Fristen er udløbet" : ""}</p>}
      {options.length ? options.map((option) => (
        <div className="poll-option" key={option.id}>
          <div className="poll-date">{new Intl.DateTimeFormat("da-DK", { weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }).format(new Date(option.startsAt))}</div>
          <div className="poll-counts"><span>{option.available} kan</span><span>{option.maybe} måske</span><span>{option.unavailable} kan ikke</span></div>
          <p className="card-subtitle">{option.available + option.maybe + option.unavailable}/{option.responses.length} har svaret{option.available >= 6 ? " · Nok til seks spillere" : " · Færre end seks kan"}</p>
          <div className="poll-people">{option.responses.map((person) => <span key={person.name}>{person.name}: {person.response === "available" ? "Kan" : person.response === "maybe" ? "Måske" : person.response === "unavailable" ? "Kan ikke" : "Mangler svar"}</span>)}</div>
          {option.confirmed && <span className="badge" style={{ marginTop: 8 }}>Valgt som kampdato</span>}
          {canRespond && (!deadline || new Date(deadline) >= new Date()) ? <div className="poll-buttons">
            <button className={`poll-vote${option.myResponse === "available" ? " selected" : ""}`} disabled={busy} onClick={() => respond(option.id, "available")}>Kan</button>
            <button className={`poll-vote${option.myResponse === "maybe" ? " selected" : ""}`} disabled={busy} onClick={() => respond(option.id, "maybe")}>Måske</button>
            <button className={`poll-vote${option.myResponse === "unavailable" ? " selected" : ""}`} disabled={busy} onClick={() => respond(option.id, "unavailable")}>Kan ikke</button>
          </div> : !canRespond ? <p className="card-subtitle">Kaptajnen skal koble din e-mail til en spiller, før du kan svare.</p> : null}
          {canManage && !option.confirmed && <button className="poll-confirm" disabled={busy} onClick={() => confirm(option.id)}>Vælg som kampdato →</button>}
        </div>
      )) : <div className="empty-state">Kaptajnen har ikke foreslået datoer endnu.</div>}
      {canManage && !options.length && <form className="poll-form" onSubmit={createPoll}>
        <h3>Foreslå tidspunkter</h3>
        <p className="card-subtitle">Spillerne vælger mellem op til tre muligheder.</p>
        <label className="field-label">Svarfrist<input className="input" name="deadline" type="datetime-local" required /></label>
        {[1, 2, 3].map((number) => <label className="field-label" key={number} htmlFor={`date${number}`}>Mulighed {number}
          <input className="input" id={`date${number}`} name={`date${number}`} type="datetime-local" />
        </label>)}
        <button className="btn btn-primary" disabled={busy} type="submit">Opret afstemning</button>
      </form>}
      {message && <div className="form-message form-error" role="status">{message}</div>}
    </section>
  );
}
