import Link from "next/link";
import { SetPasswordForm } from "@/components/set-password-form";

export default async function SetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <main className="setup-wrap">
      <section className="card setup-card">
        <div className="brand setup-brand"><span className="brand-mark">L</span><span>Lunar Holdmanager</span></div>
        <h1>{token ? "Vælg adgangskode" : "Link mangler"}</h1>
        {token ? <>
          <p>Vælg en adgangskode på mindst 10 tegn. Linket kan kun bruges én gang.</p>
          <SetPasswordForm token={token} />
        </> : <>
          <p>Åbn linket i e-mailen igen, eller bed om et nyt link til at vælge adgangskode.</p>
          <Link className="btn btn-primary" href="/login">Til login</Link>
        </>}
      </section>
    </main>
  );
}
