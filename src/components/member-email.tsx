"use client";

import { FormEvent, useState } from "react";

export function MemberEmail({ memberId, initialEmail }: { memberId: string; initialEmail: string | null }) {
  const [email, setEmail] = useState(initialEmail ?? "");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/team/members", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberId, email }),
      });
      const data = await response.json() as { error?: string; connected?: boolean };
      if (!response.ok) throw new Error(data.error ?? "Invitationen kunne ikke gemmes.");
      setMessage(data.connected ? "Konto koblet til." : "Gemt — spilleren kan nu logge ind med denne e-mail.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Noget gik galt.");
    } finally {
      setBusy(false);
    }
  }

  return <form className="member-email-form" onSubmit={save}>
    <input aria-label="Spillerens e-mail" className="input" type="email" required placeholder="Spillerens e-mail" value={email} onChange={(event) => setEmail(event.target.value)} />
    <button className="btn btn-light" disabled={busy} type="submit">{busy ? "Gemmer …" : "Kobl konto"}</button>
    {message && <span className="member-email-status" role="status">{message}</span>}
  </form>;
}
