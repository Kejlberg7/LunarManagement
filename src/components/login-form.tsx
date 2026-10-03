"use client";

import { FormEvent, useState } from "react";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loginUrl, setLoginUrl] = useState("");
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [resetMode, setResetMode] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError(false);
    setMessage("");
    setLoginUrl("");
    try {
      const response = await fetch(resetMode ? "/api/auth/request" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(resetMode ? { email } : { email, password }),
      });
      const data = (await response.json()) as { message?: string; error?: string; developmentUrl?: string; redirectTo?: string };
      if (!response.ok) throw new Error(data.error ?? "Noget gik galt.");
      if (data.redirectTo) {
        window.location.assign(data.redirectTo);
        return;
      }
      setMessage(data.message ?? "Tjek din indbakke efter et link til at vælge adgangskode.");
      if (data.developmentUrl) setLoginUrl(data.developmentUrl);
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
      {!resetMode && <>
        <label className="field-label" htmlFor="password">Adgangskode</label>
        <input
          className="input"
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(event) => setPassword(event.target.value)}
        />
      </>}
      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? (resetMode ? "Sender link …" : "Logger ind …") : (resetMode ? "Send link til adgangskode" : "Log ind")}
      </button>
      {message && <div className={`form-message${error ? " form-error" : ""}`} role="status">{message}</div>}
      {loginUrl && <a className="dev-link" href={loginUrl}>Fortsæt til din lokale login-side ↗</a>}
      <button className="login-mode-link" type="button" onClick={() => {
        setResetMode(!resetMode);
        setMessage("");
        setError(false);
        setLoginUrl("");
      }}>
        {resetMode ? "Tilbage til login" : "Første gang eller glemt adgangskode?"}
      </button>
    </form>
  );
}
