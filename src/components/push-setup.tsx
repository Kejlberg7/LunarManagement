"use client";

import { useState } from "react";

function decodeKey(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = (value + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
}

export function PushSetup() {
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);

  async function enable() {
    setBusy(true);
    setStatus("");
    try {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        throw new Error("Push understøttes ikke her. Du kan stadig følge beskeder inde i appen.");
      }
      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Push er ikke færdigkonfigureret endnu.");
      const permission = await Notification.requestPermission();
      if (permission !== "granted") throw new Error("Notifikationer er ikke slået til.");
      const registration = await navigator.serviceWorker.register("/sw.js");
      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: decodeKey(publicKey),
      });
      const response = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(subscription),
      });
      if (!response.ok) throw new Error("Enheden kunne ikke tilmeldes til notifikationer.");
      setStatus("Telefonen er klar til at modtage holdnotifikationer.");
    } catch (error) {
      setStatus(error instanceof Error ? error.message : "Push kunne ikke slås til.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <button type="button" className="btn btn-light" onClick={enable} disabled={busy}>
        {busy ? "Gør klar …" : "Slå telefonnotifikationer til"}
      </button>
      {status && <p className="push-status" role="status">{status}</p>}
    </div>
  );
}
