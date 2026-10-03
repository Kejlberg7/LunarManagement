# LunarManagement

Mobilvenlig holdplanlægning til Lunar Ligaen. Kaptajnen kan foreslå kampdatoer, spillerne kan svare på afstemninger og angive faste ugentlige tider, og hele holdet kan følge kampplanen. RankedIn er fortsat autoritativ for turneringens officielle data.

Piloten er Piranha Padel (`T003281428`) fra Lunar Ligaen efterår 2026. Se [produktplanen](./PLAN.md) for regler, dataimport og integrationsvalg.

## Teknologi

- Next.js, TypeScript og React
- Neon Postgres via Drizzle ORM
- Vercel til hosting og deploys
- E-mail-link til login (SMTP bruges kun til login)
- Web Push som installerbar PWA; iPhone kræver hjemmeskærmsinstallation

Konti til Vercel og Neon skal være `kejlberg7@gmail.com`. OpenAI API-nøglen bruges ikke til RankedIn-adgang; ingen AI-funktion kræver den i denne app.

## Lokal opsætning

Kræver Node.js 20.9 eller nyere.

```sh
npm install
cp .env.example .env.local
```

Udfyld `DATABASE_URL` med Neons pooled connection string og `SESSION_SECRET` med mindst 32 tilfældige tegn. Sæt `DEV_SHOW_LOGIN_LINK=true` lokalt for at logge ind uden en SMTP-server; loginlinket skrives i udviklingsserverens terminal og vises i loginformularen. Kampreminders sendes som push/in-app, ikke e-mail.

```sh
npm run db:push
npm run db:seed
npm run dev
```

Åbn `http://localhost:3000`. Seed-data er et øjebliksbillede af den offentlige pilot-holdside fra 3. oktober 2026. Den indsætter ikke spillernes e-mailadresser. Log ind med `BOOTSTRAP_ADMIN_EMAIL` for at få ejerskab af pilotholdet; kaptajnen kan herefter koble spillerkonti på ved at gemme deres e-mail i spillerlisten.

## Produktion

1. Opret et Vercel-projekt for GitHub-repoet med `kejlberg7@gmail.com`.
2. Opret en Neon database på samme konto og forbind den til Vercel.
3. Sæt `SESSION_SECRET`, `BOOTSTRAP_ADMIN_EMAIL`, `APP_URL` og SMTP-variabler i Vercel.
4. Opret VAPID-nøgler med `npx web-push generate-vapid-keys` og sæt `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` og `VAPID_SUBJECT`.
5. Deploy appen. Træk derefter produktionsvariabler ned med `vercel env pull .env.local`, og kør `npm run db:push` og `npm run db:seed` lokalt mod Neon.

Login-linket er en engangsnøgle, der udløber efter 15 minutter. SMTP-afsenderen skal derfor sættes op før andre end den lokale udvikler kan logge ind. OpenAI-nøgler må ikke tilføjes som klientvariabler; ingen OpenAI-kald er implementeret.
