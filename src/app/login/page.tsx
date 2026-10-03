import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="login-wrap">
      <section className="login-aside">
        <div className="brand"><span className="brand-mark">L</span><span className="brand-name">Lunar Holdmanager</span></div>
        <div>
          <span className="eyebrow" style={{ color: "#bdd0c6" }}>Lunar Ligaen · Piranha Padel</span>
          <h1>Holdet samlet.<br />Kampene på plads.</h1>
          <p>Find en dato, få styr på hvem der kan, og sørg for at alle ved, hvor holdet skal spille.</p>
        </div>
        <span style={{ color: "#bdd0c6", fontSize: 12 }}>Sæsonen følges her — officielle kampe ligger stadig i RankedIn.</span>
      </section>
      <section className="login-panel">
        <div className="login-box">
          <div className="mobile-brand brand"><span className="brand-mark">L</span><span>Lunar Holdmanager</span></div>
          <h2>Log ind</h2>
          <p>Brug din e-mail og adgangskode for at åbne Lunar Holdmanager.</p>
          {error === "expired" && <div className="form-message form-error">Linket er udløbet eller allerede brugt. Bed om et nyt link til adgangskode.</div>}
          <LoginForm />
          <p style={{ marginTop: 20, fontSize: 11 }}>Første gang skal du bekræfte din e-mail og vælge en adgangskode. Linket virker én gang.</p>
          <Link className="text-link" href="/">Til forsiden</Link>
        </div>
      </section>
    </main>
  );
}
