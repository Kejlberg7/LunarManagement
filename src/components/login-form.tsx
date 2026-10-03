"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    setMessage("");
    setLoginUrl("");
    try {
      const response = await fetch("/api/auth/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = (await response.json()) as { message?: string; error?: string; developmentUrl?: string };
      if (!response.ok) throw new Error(data.error ?? "Noget gik galt.");
      setMessage(data.message ?? "Tjek din indbakke efter et login-link.");
      if (data.developmentUrl) setLoginUrl(data.developmentUrl);
    } catch (err) {
      setError(true);
      setMessage(err instanceof Error ? err.message : "Login-linket kunne ikke sendes.");
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
        {busy ? "Sender link …" : "Send mig et login-link"}
      </button>
      {message && <div className={`form-message${error ? " form-error" : ""}`} role="status">{message}</div>}
      {loginUrl && <a className="dev-link" href={loginUrl}>Fortsæt til din lokale login-side ↗</a>}
    </form>
  );
}
