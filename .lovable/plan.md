

# Roadmap till klar MVP — CompCare

## Vad MVP är (positionering)
CompCare MVP = en agent-redo plattform där en vårdkonsult/byrå kan:
1. Få en neutral marknadsanalys på sin ersättning
2. Granska sina fakturor och få betalt för missade timmar
3. Verifiera och dela referenser/intyg på sina villkor
4. Se kommande uppdrag (Uppdragsradar) — människa & API
5. Bli digitalt representerad av en byrå (Solution Center)

Allt med samma data tillgänglig för agenter via OpenAPI/JSON-LD.

---

## Status idag (vad som är byggt)

| Område | Status |
|---|---|
| Landningssida (LandingV2) | ✅ Live |
| Löneanalys + rapport | ✅ Live (v1.6/v1.7 avtal) |
| Fakturakontroll (upload → AI → admin review) | ✅ Live, no-cure-no-pay |
| Referensplattform (Referly) | ✅ Live, länkbaserad |
| Solution Center / Verify | ✅ Live, BankID-signering |
| Uppdragsradar (UI + Public API + JSON-LD) | ✅ Live |
| Byrå-flöde (signup, dashboard, intyg, market-edge) | ✅ Live |
| Auth + roller (individual/agency/admin) | ✅ Live |
| Admin-panel (granskning, API-nycklar, analytics) | ✅ Live |
| PostHog tracking + tracking-coverage memory | ✅ Live |

## Vad som saknas för "klar MVP"

Tre kategorier: **stabilitet**, **upplevelse-luckor**, **go-to-market-prerequisites**.

---

## Fas 1 — Stabilitet & säkerhet (1 sprint)

**Mål:** Inget brister när första riktiga betalkund kommer in.

1. **Säkerhetssvep** — kör `security--run_security_scan` + `supabase--linter`. Åtgärda alla high/medium findings. Validera att RLS på `calloff_imports`, `radar_api_keys`, `invoice_*`, `ref_*` håller tätt mot partner-data och PII.
2. **Felhantering & tomtillstånd** — gå igenom alla huvudvyer (Profile, Fakturakontroll, Referenser, Uppdragsradar, AgencyDashboard) och säkerställ:
   - Loading skeletons (inte spinners överallt)
   - Tomtillstånd med tydlig nästa-handling
   - Error boundaries med recovery-CTA
3. **PostHog-täckning** — komplettera `landing_viewed` + CTA-tracking på alla nyckelytor enligt `mem://tech/tracking-coverage`. Daglig health check ska vara grön i 7 dagar i rad.
4. **Mobilpolering** — fakturakontrollens tabell, profilens flikar och Uppdragsradar på 393px-bredd. Följer `mem://constraints/mobile-ux-standards`.

---

## Fas 2 — Stäng upplevelse-luckor (1–2 sprintar)

**Mål:** Första intryck och kärnflöden känns färdiga.

1. **Profile "Network" + "Saved" tabbar** — idag "Lanseras snart". Två val:
   - **Antingen** dölj flikarna helt tills de byggs (snabbast till MVP)
   - **Eller** bygg "Saved" som ett enkelt bookmark-system för rapporter & avrop (medel-jobb)
2. **Onboarding-checklist på Profile** — använd befintlig `completedCount/totalCount` och gör den till en faktisk sekventiell checklist ("Verifiera HOSP → Verifiera IVO → Komplettera ersättning → Lägg till första referens"). Driver upp completeness.
3. **Rapport → handling-bryggor** — efter rapport visas, lägg synliga vägar till nästa verktyg:
   - "Granska din senaste faktura" (länk till fakturakontroll)
   - "Visa upp profil för byrå" (länk till Solution Center)
4. **Notisinkorg (lättviktig)** — ny `notifications`-tabell + dropdown i Navbar. Triggas vid: faktura granskad, representationsförfrågan inkommen, referens inkommen. Ersätter behovet av e-post för aktiva användare.
5. **AgencyDashboard polering** — säkerställ att hela flödet (skapa förfrågan → konsult signerar → intyg genereras → publik /verify-länk) är friktionsfritt end-to-end. Lägg till statusfilter & sökfält.

---

## Fas 3 — Go-to-market-prerequisites (1 sprint)

**Mål:** Vi kan dela länken brett och ta in betalande kunder.

1. **Landningssidans CTA-arkitektur** — LandingV2 ska tydligt leda till de fyra produkterna (löneanalys, faktura, referenser, uppdragsradar). Idag är fokus tungt på löneanalys.
2. **Prissida / pakettering** — idag är fakturakontroll "no cure no pay" och övrigt gratis. Behöver en `/priser`-sida som tydligt förklarar:
   - Konsult: gratis
   - Byrå: prismodell (sätts av dig)
   - Datapartner (Avropsplatsen Next): API-prismodell
3. **Avropsplatsen Next-integration live** — generera produktionsnyckel, dela `radar-api-README.md`, kör testbatch av deras POST `/calloff_imports`, säkerställ att `partner_share_data=true` fungerar i radarvyn för publik trafik. Logga första 1000 inkommande rader manuellt för att kalibrera tolerant validering.
4. **E-postsekvenser audit** — kontrollera att dag 3/7/14-e-post (`mem://marketing/email-sequences`) faktiskt skickas korrekt och leder tillbaka in. Lägg till unsubscribe-länk om saknas.
5. **SEO-finish** — sitemap, robots, llms.txt, openapi.json är på plats. Verifiera att alla statiska rapporter (`/rapport/anestesisjukskoterska` osv) renderar korrekt och har kanoniska länkar.

---

## Fas 4 — Validering före lansering

**Mål:** Bevisa att tratten fungerar.

1. **End-to-end-test som CI-job** — utöka `e2e-test`-funktionen till att täcka: lead → signup → rapport → fakturaupload → admin-review → publicerad rapport.
2. **10 betatestare** — 5 konsulter, 3 byråer, 2 datapartners. Mätbart mål: 80 % slutför första kärnflödet utan support.
3. **Analytics-baseline** — definiera Aha-moment (sannolikt: "första rapport sedd" + "första referens verifierad"). Mät tid till Aha. Allt under 7 dagar = MVP klar.

---

## Tekniska detaljer

**Inga stora arkitekturskift behövs** — all kärninfrastruktur (Supabase, Edge Functions, Lovable AI, PostHog, Resend via PGMQ) är på plats. Roadmapen handlar om:

- **Polering** av befintliga vyer (Profile, AgencyDashboard, Fakturakontroll)
- **Två nya små features**: notisinkorg + onboarding-checklist
- **En ny sida**: `/priser`
- **Inga nya tabeller** utöver `notifications` (3 kolumner: user_id, payload jsonb, read_at)
- **Inga nya secrets** krävs

**Risker att hålla koll på:**
- Avropsplatsen Next:s första data-batch kan kräva justering av tolerant-validering
- Notisinkorg behöver Realtime-prenumeration — kostnad/throughput bör övervakas
- Onboarding-checklist får inte ändra completenessChecks-logik så att befintliga användare plötsligt "tappar poäng"

**Ungefärlig tidsåtgång:** 4–6 sprintar (4–6 veckor solo). Fas 1 är blockande för riktig publik lansering; Fas 2–4 kan delas upp.

**Vad som EJ ingår i MVP** (medvetet uppskjutet):
- "Smart Context / Focus Today" dashboard (din förra fråga)
- Network-funktioner (konsult-till-konsult)
- IVO/HOSP API-automation (saknas öppet API enligt `mem://constraints/no-ivo-hosp-automation`)
- Stripe-prenumerationer
- Compcare Academy bortom Cosmic-modulen

