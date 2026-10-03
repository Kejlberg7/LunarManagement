"use client";

import Link from "next/link";
import { useState } from "react";

type Item = { id: string; title: string; body: string; href: string; createdAt: string; readAt: string | null };

export function NotificationList({ items }: { items: Item[] }) {
  const [read, setRead] = useState(() => new Set(items.filter((item) => item.readAt).map((item) => item.id)));
  const [error, setError] = useState("");
  async function markRead(id: string) {
    setError("");
    try {
      const response = await fetch(`/api/notifications/${id}/read`, { method: "POST" });
      if (!response.ok) throw new Error("Beskeden kunne ikke markeres som læst.");
      setRead((current) => new Set([...current, id]));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Noget gik galt."); }
  }
  return <>
    <div className="card-head"><div><h2 className="card-title">Alle beskeder</h2><p className="card-subtitle">{items.length - read.size} ulæste</p></div></div>
    {!items.length && <div className="empty-state">Du har ingen beskeder endnu.</div>}
    {items.map((item) => <article className={`notice-row${read.has(item.id) ? "" : " notice-unread"}`} key={item.id}>
      <div className="notice-header"><Link className="notice-title" href={item.href}>{item.title}</Link>{!read.has(item.id) && <button className="text-link notice-read" type="button" onClick={() => markRead(item.id)}>Markér som læst</button>}</div>
      <p>{item.body}</p>
      <span>{new Intl.DateTimeFormat("da-DK", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", timeZone: "Europe/Copenhagen" }).format(new Date(item.createdAt))}</span>
    </article>)}
    {error && <p className="form-message form-error" role="status">{error}</p>}
  </>;
}
