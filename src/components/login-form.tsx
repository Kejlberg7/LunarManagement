"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    setMessage("");
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(data.error ?? "Login kunne ikke gennemføres.");
      if (data.redirectTo) window.location.assign(data.redirectTo);
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : "Login kunne ikke gennemføres.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="email">Din e-mail</label>
      <input
        className="input"
        id="email"
        type="email"
        autoComplete="email"
        placeholder="navn@eksempel.dk"
        required
        value={email}
        onChange={(event) => setEmail(event.target.value)}
      />
      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? "Logger ind …" : "Fortsæt"}
      </button>
      {message && <div className={`form-message${error ? " form-error" : ""}`} role="status">{message}</div>}
    </form>
  );
}
