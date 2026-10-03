"use client";

import { FormEvent, useState } from "react";

export function SetPasswordForm({ token }: { token: string }) {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    if (password !== confirmation) {
      setMessage("Adgangskoderne er ikke ens.");
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) throw new Error(data.error ?? "Adgangskoden kunne ikke gemmes.");
      if (data.redirectTo) window.location.assign(data.redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Adgangskoden kunne ikke gemmes.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <label className="field-label" htmlFor="password">Adgangskode</label>
      <input
        className="input"
        id="password"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        value={password}
        onChange={(event) => setPassword(event.target.value)}
      />
      <label className="field-label" htmlFor="password-confirmation">Gentag adgangskode</label>
      <input
        className="input"
        id="password-confirmation"
        type="password"
        autoComplete="new-password"
        minLength={10}
        required
        value={confirmation}
        onChange={(event) => setConfirmation(event.target.value)}
      />
      <button className="btn btn-primary" disabled={busy} type="submit">
        {busy ? "Gemmer adgangskode …" : "Gem adgangskode og log ind"}
      </button>
      {message && <div className="form-message form-error" role="status">{message}</div>}
    </form>
  );
}
