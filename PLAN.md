# LunarManagement — produktplan

## Produktidé

En enkel holdapp til Lunar Ligaen, der samler sæsonens praktiske koordinering ét sted. Kaptajnen får styr på datoer, fremmøde og holdopstilling; spillerne kan hurtigt se, hvornår og hvor næste kamp er, hvem der deltager, og hvad de selv skal svare på.

Appen skal supplere RankedIn, som fortsat er den officielle kilde til turneringens registreringer. Første version bør ikke love automatisk synkronisering eller skrive til RankedIn.

## Sådan fungerer ligaen

- Lunar Ligaen afvikles i en forårs- og efterårssæson. DPF offentliggør puljer og et vejledende kampprogram; holdene skal gentilmelde sig mellem sæsoner.
- Det almindelige format har mindst seks registrerede spillere pr. hold. DPF anbefaler mindst otte for at kunne håndtere afbud. Et hold med otte-ni spillere passer derfor godt til appens planlægningsflow.
- En spiller skal være oprettet i RankedIn og have en aktiv DPF-licens ved kampstart. Holdets rangliste indtastes i RankedIn, og kaptajnen er ansvarlig for korrekt rangering og for at følge reglerne.
- Der spilles normalt seks doubler i to runder med tre kampe i hver. Ved 3-3 spilles en syvende Golden matchtiebreak. I første runde skal den højest rangerede spiller, som deltager i runden, stå i første double. Anden rundes konstellationer skal ændres, så ingen spiller fortsætter med samme makker.
- Hjemmeholdets kaptajn fastsætter og registrerer dato, tid og sted for hjemmekampene i RankedIn. Udeholdets kaptajn kan inden fristen bede om mindst to alternative datoer. Kaptajnerne koordinerer kampflytning, bane og opstillinger.
- Hjemmeholdets kaptajn indtaster kampopstillinger og resultat i RankedIn. Udeholdets kaptajn skal kontrollere resultat og opstillinger senest 48 timer efter kampen.
- En kamp kan have særlige regler om baner, starttid, geografi, reserver og flytning. Appen skal vise påmindelser og hjælpe med overblik; kaptajnen har stadig ansvaret for at følge sæsonens gældende DPF-regler.

DPF administrerer turneringen og udpeger den turneringsansvarlige. RankedIn bruges til holdtilmelding, pulje, rangliste, officiel kampdato, opstilling og resultat. Kaptajnen står for den løbende koordinering med egne spillere, modstanderens kaptajn og eventuelt hjemmebanecenter.

## Foreslået brugerflow

### Kaptajn

1. Opret en sæson og et hold, eller importér holdet fra et delt invitationslink.
2. Tilføj holdets ni spillere fra pilot-holdet med navn og RankedIn-profillink. Sæt kaptajn og stedfortræder.
3. Opret holdets kampe manuelt, via CSV eller ved at indsætte RankedIn-links. Gem modstander, hjemme/ude, oprindelig dato, spillested og officiel RankedIn-link.
4. Spillerne kan vedligeholde både faste ugentlige tider, hvor de typisk kan spille, og besvare en konkret afstemning for hver kamp. Kaptajnen foreslår flere datoer/tidspunkter; svar pr. kamp kan tilsidesætte de faste tider. Spillere markerer `Kan`, `Kan ikke` eller `Måske` inden en svarfrist.
5. Se samlet fremmøde med seks spillere som minimumsmål, vælg trup og reserver, og del det endelige forslag med modstanderens kaptajn.
6. Når aftalen er bekræftet, opdatér den officielle kamp i RankedIn. Gem den aftalte tid, sted og Rankedin-link i appen, så holdet følger den samme plan.
7. Før kamp: vis spillested, kortlink, modstanderens kontakt, trup, reserver og en tjekliste for licens, Rankedin-opstilling og matchprotokol.
8. Efter kamp: registrér resultatet i appens sæsonoverblik og link til RankedIn. Resultatet skal stadig tastes og bekræftes officielt i RankedIn.

### Spiller

- Skriv spillerens e-mail for direkte adgang. Kaptajnen skal have tilføjet adressen på holdlisten. Appen kan føjes til telefonens hjemmeskærm.
- Svar hurtigt på datoforslag og se svarfrist.
- Angiv faste ugentlige tider én gang, og ret dem for den enkelte kamp efter behov.
- Se bekræftet kampdato, modstander, sted/kort, valgt trup, makkere og praktiske beskeder.
- Få en kalenderfil (.ics) eller tilføj kamp til kalenderen.
- Se tidligere resultater og status for kommende kampe.

## MVP: den første brugbare version

1. **Hold og sæson:** Opret hold, kaptajn/stedfortræder, sæson, spillere og RankedIn-profil-id/link.
2. **Kampprogram:** Manuel oprettelse og CSV-import af kampe med Rankedin-link, modstander, hjemme/ude og officiel dato.
3. **Tilgængelighedsafstemning:** Kaptajnen foreslår flere tidspunkter; spillere markerer deres tilgængelighed og frist. Vis svarstatus og samlet antal tilgængelige.
4. **Kampkort:** Én side pr. kamp med afstemning, sted, kontakt, holdstatus og aftalte detaljer.
5. **Trup og påmindelser:** Bekræft deltagere/reserver og vis tydeligt, når færre end seks kan. Send pushnotifikationer til telefoner, hvor spilleren har installeret appen på hjemmeskærmen og givet tilladelse. E-mail bruges ikke til login eller kampreminders.
6. **Sæsonoversigt:** Kommende kampe, åbne afstemninger, svarfrister, resultater og links til officielle RankedIn-sider.
7. **Mobilvenlig og privat:** Designet til telefon. Spillere kan kun se deres eget hold via login. Push kræver brugerens tilladelse; på iPhone/iPad skal webappen tilføjes til hjemmeskærmen. Vis også notifikationer inde i appen, så beskeder ikke kun afhænger af push.

Første version bør undgå ranglisteautomatik, fuld divisionsadministration, betaling, chat og officielle resultatregistreringer. Det holder løsningen fokuseret på koordineringen, hvor kaptajnen oplever mest friktion.

### Pushnotifikationer på telefonen

Løsningen bygges som en installerbar PWA med Web Push, så den kan sende notifikationer uden en native iOS-/Android-app. På iPhone og iPad understøtter Apple push for webapps, som er føjet til hjemmeskærmen (iOS/iPadOS 16.4 eller nyere); brugeren skal selv give notifikationstilladelse. Derfor skal onboarding forklare installationen og tilbyde notifikationer inde i appen som fallback. [Apple: Web Push i webapps og browsere](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)

Push kan bruges til ny datoafstemning, svarfrist, ændret kampplan og bekræftet trup. Login kræver kun e-mailadressen på holdlisten; enheden får en 30-dages session.

## Pilot: Piranha Padel

Det valgte pilot-hold er [Piranha Padel i Lunar Ligaen — Efterår 2026](https://www.rankedin.com/en/team/homepage/3281428), RankedIn team-ID `T003281428`.

Ved gennemgangen af holdets side stod der:

- 9 medlemmer, Pool Øst — Serie 3 — F
- Hjemmebane/-klub: Racket Club Roskilde — Yellowbeard Arena, Rønøs Alle 2, 4000 Roskilde
- Holdkaptajn: Christian Stokholm; Peter Kejlberg er registreret holdadministrator
- Seks opgør i det viste program; to resultater var registreret, mens fire opgør stod uden resultat
- De viste opgør uden registreret resultat omfattede LBI H2 (hjemme, 1. oktober), Slagelse Padel 6 (hjemme, 15. oktober), Aceholes (hjemme, 18. november) og KPK 18 (ude, 22. november)

Det gør pilotholdet velegnet til at afprøve hele kerneflowet: import af eksisterende kampe, kampafstemning, gentagne ugentlige tider, push, hjemme-/udekampdetaljer og links tilbage til Rankedin. Kampenes datoer og resultater er sæsondata og skal kunne genindlæses/opdateres, ikke hardcodes i appen.

## RankedIn-integration: hvad vi ved

RankedIn offentliggjorde i august 2026 dokumentation for en Public API. Den kræver en API-nøgle, der oprettes af en administrator for en klub eller organisation. Nøglen skal kun bruges på serveren og giver adgang til organisationens data.

Dokumentationen beskriver blandt andet:

- opslag af spiller- og holdnavn fra Rankedin-ID
- licensstatus for spillere tilknyttet organisationen
- holdliste for en Team League, med division, kaptajn, spillere, hjemmebane og betalingsstatus

Begrænsninger for LunarManagement:

- Team League-data kan kun læses, når ligaen tilhører den organisation, hvis API-nøgle bruges. DPF administrerer Lunar Ligaen; et almindeligt klubhold har ikke automatisk adgang til DPF's API-nøgle.
- Den offentlige dokumentation viser ikke endpoints til kampprogram, opstillinger, kampflytning eller resultatændringer. Der er derfor ikke grundlag for at love fuld RankedIn-synkronisering.
- Licensopslag er også organisationsbegrænset. API'et returnerer ikke spillerens personlige oplysninger.
- API'et er read-only i den beskrevne dokumentation. Alle officielle ændringer skal fortsat ske på RankedIn.
- At være administrator for et hold på RankedIn-siden dokumenterer ikke i sig selv, at man også kan oprette en Public API-nøgle for en klub/organisation. Det skal afprøves særskilt.

### Anbefalet integrationsstrategi

**Fase 1 — pilotdata uden API:** Gør RankedIn-link til en fast del af hold og kamp. Importér pilot-holdets offentligt viste hold- og kampdata én gang til afprøvning, og tillad derefter manuel opdatering og CSV-import. Gem kilde, importtid og RankedIn-link sammen med de felter, holdet behøver til koordinering.

**Fase 2 — afprøv den officielle API, hvis en særskilt RankedIn-nøgle bliver tilgængelig:** Den omtalte nøgle er en OpenAI API-nøgle, som ikke autentificerer mod RankedIn og ikke bruges af appen. Hvis DPF eller klubben senere giver en separat RankedIn Public API-nøgle, kan den afprøves på serveren mod Team League `956` (vist som Lunar Ligaen — Efterår 2026 på pilot-siden). Endpointet for Team League kræver, at ligaen tilhører den organisation, som nøglen er udstedt til. Hvis kaldet giver adgang, kan vi importere dokumenterede felter som holdliste, kaptajn, spillere, division og hjemmebane; vi skal stadig hente datoer, resultater og opstillinger manuelt, medmindre RankedIn tilbyder andre godkendte endpoints. Hvis adgang afvises, skal DPF/RankedIn kontaktes om adgang, kampdata, webhooks, licensopslag, rate limits og vilkår.

**Fase 3 — læs synkronisering hvis godkendt:** Hent de felter, API'et officielt tilbyder, fra serveren til Neon. Gem kilde og synkroniseringstidspunkt, og lad kaptajnen rette lokale koordinationsdata. Lad RankedIn forblive den autoritative kilde.

En API-nøgle er ikke en generel nøgle til at logge ind og hente vilkårlige websider; den autentificerer kun de dokumenterede API-kald og skal blive på serveren. Hvis du i stedet mente en OpenAI API-nøgle, kan den ikke give adgang til RankedIn. En lavfrekvent læsning af offentlige holdsider kan undersøges som reserve, men siden er JavaScript-renderet og kan ændre sig. Før vi automatiserer sideudtræk, skal vi kontrollere RankedIns vilkår og eventuelle robots-regler; ved tvivl skal vi bede RankedIn om lov. Ingen login-cookies, omgåelse af adgangskontrol eller skrivning til RankedIn.

## Datamodel i første version

- `users`: konto, navn og e-mail
- `teams`: navn, kaptajn, stedfortræder, hjemmebane, tidszone
- `team_members`: spiller, hold, rolle, invitationsstatus, Rankedin-ID/link og ranglistenummer (kopi til planlægning)
- `recurring_availability`: ugedag og tidsrum pr. spiller
- `seasons`: forår/efterår, år, start/slut og valgfri regelsæt-version
- `fixtures`: modstander, hjemme/ude, officiel tid/sted, foreslået tid/sted, status og RankedIn-link
- `availability_options`: foreslåede tider pr. kamp
- `availability_responses`: spillerens svar og tidspunkt
- `lineups`: valgt trup og runde/double/makker (intern plan; ikke officiel indberetning)
- `match_results`: resultat med kilde/status og RankedIn-link
- `push_subscriptions`: enhedens Web Push-subscription pr. bruger, med mulighed for at tilbagekalde den
- `notifications`: push- og in-app-notifikationer med type, modtager, leveringsstatus og link til relevant kamp

Alle tidsstempler gemmes i UTC og vises i `Europe/Copenhagen`. Spilleres tilgængelighed bør kun være synlig for deres hold og bør slettes eller arkiveres efter en passende periode.

## Teknisk og driftsmæssigt setup

Brug samme grundmønster som de nyere apps:

- Next.js + TypeScript + React, som i Finsk Tutor og LogeBold
- Vercel-projekt forbundet til GitHub-repoet, deploy ved push til `main`
- Neon Postgres som database og Drizzle ORM til skema/migrationer
- `DATABASE_URL` fra Neon i Vercel Production og lokal `.env.local`
- Server-side sessions; adgang kræver en adresse på spillerlisten eller pilotens adminmail
- Vercel- og Neon-projektet er oprettet under `kejlberg7@gmail.com`; appen er deployet på `https://lunar-management.vercel.app`
- Neon-skema og pilotdata for Piranha Padel er oprettet. Spillere logger ind med e-mailadressen på holdlisten uden adgangskode.

## Aftalte produktvalg og resterende afklaring

- Login: e-mail alene, uden bekræftelse; kun adresser på holdlisten eller pilotens adminmail får adgang.
- Tilgængelighed: både faste ugentlige tidsrum og særskilt svar for hver kamp.
- Påmindelser: push direkte til telefonen samt en indbakke i appen. E-mail bruges ikke af loginflowet.
- Pilot: Piranha Padel, RankedIn ID `T003281428`, Lunar Ligaen efterår 2026.
- RankedIn: prøv den officielle Public API først, hvis brugerens/klubbens nøgle er tilgængelig og har rettigheder. Ellers pilotimport fra offentlig side/CSV efter kontrol af vilkår.
- Stadig uafklaret: hvilke kampdata tillader RankedIn at hente automatisk?

## Kilder

- [DPF: Lunar Ligaen](https://www.danskpadelforbund.dk/turnering/dpf-holdliga/)
- [DPF: Seriereglement for Lunar Ligaen](https://www.danskpadelforbund.dk/turnering/dpf-holdliga/serieregler-for-dpf-padel-ligaen/)
- [DPF: Matchprotokol og formularer](https://www.danskpadelforbund.dk/turnering/dpf-holdliga/dpf-padel-liga-formularer/)
- [DPF: Kaptajnens ansvar (august 2026)](https://www.danskpadelforbund.dk/har-du-styr-paa-dit-kaptajnansvar-i-lunar-ligaerne-foer-saesonen/)
- [RankedIn Public API — adgang og begrænsninger](https://rankedin.ladesk.com/635787-151-Getting-started)
- [RankedIn Public API — spiller/licens](https://rankedin.ladesk.com/996230-152-Player)
- [RankedIn Public API — Team League](https://rankedin.ladesk.com/230505-154-Team-League)
- [Apple: Web Push i webapps og browsere](https://developer.apple.com/documentation/usernotifications/sending-web-push-notifications-in-web-apps-and-browsers)
