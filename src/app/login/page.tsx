import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
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
          <h2>Fortsæt med e-mail</h2>
          <p>Skriv den e-mail, kaptajnen har tilføjet til holdet, så åbner appen.</p>
          <LoginForm />
          <p style={{ marginTop: 20, fontSize: 11 }}>Ingen adgangskode eller loginmail. Brug din egen e-mail, så dine svar registreres på dig.</p>
          <Link className="text-link" href="/">Til forsiden</Link>
        </div>
      </section>
    </main>
  );
}
