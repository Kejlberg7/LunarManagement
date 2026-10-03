"use client";

import { useEffect, useState } from "react";

const weekdays = ["Søn", "Man", "Tir", "Ons", "Tor", "Fre", "Lør"];

export function RecurringAvailability() {
  const [days, setDays] = useState<number[]>([]);
  const [startsAt, setStartsAt] = useState("17:00");
  const [endsAt, setEndsAt] = useState("21:00");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/availability/recurring")
      .then((response) => response.json())
      .then((data: { availability?: { weekday: number; startsAt: string; endsAt: string }[] }) => {
        const slots = data.availability ?? [];
        setDays([...new Set(slots.map((slot) => slot.weekday))]);
        if (slots[0]) {
          setStartsAt(slots[0].startsAt);
          setEndsAt(slots[0].endsAt);
        }
      })
      .catch(() => setMessage("Dine faste tider kunne ikke hentes."));
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/availability/recurring", {
        method: "PUT", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slots: days.map((weekday) => ({ weekday, startsAt, endsAt })) }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Gemning mislykkedes.");
      setMessage("Dine faste tider er gemt.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Noget gik galt.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="card">
      <div className="card-head"><div><h2 className="card-title">Hvornår kan du typisk spille?</h2><p className="card-subtitle">Faste tider hjælper kaptajnen med at foreslå datoer.</p></div></div>
      <div className="weekday-pills">{weekdays.map((label, day) => <button
        type="button" key={day} className={`weekday-pill${days.includes(day) ? " selected" : ""}`}
        aria-pressed={days.includes(day)} onClick={() => setDays((current) => current.includes(day) ? current.filter((value) => value !== day) : [...current, day])}
      >{label}</button>)}</div>
      <div className="time-fields"><label className="field-label">Fra<input className="input" type="time" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} /></label>
        <label className="field-label">Til<input className="input" type="time" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} /></label></div>
      <button className="btn btn-primary" disabled={busy} onClick={save}>{busy ? "Gemmer …" : "Gem faste tider"}</button>
      {message && <p className="push-status" role="status">{message}</p>}
    </section>
  );
}
