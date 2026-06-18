## Plan: MVP "Måste"-lista före lansering

### 1. GA4 bakom samtycke (B1)
**Åtgärd:** Ta bort ovillkorlig GA4-laddning från `<head>` i `index.html`. PostHog täcker analysbehovet.

**Kodändringar:**
- `index.html`: Ta bort `<script async src="https://www.googletagmanager.com/gtag/js">` och in-line `gtag('config', ...)`.
- `src/lib/trackEvent.ts`: Ersätt alla `window.gtag('event', ...)` med no-op eller PostHog-ekvivalent.
- Eftersom PostHog redan är korrekt inställt (opt-out-by-default, rad 66-67 i `src/lib/posthog.ts`) krävs ingen ytterligare consent-logik.

**GDPR-påverkan:** Eliminerar icke-nödvändiga cookies före samtycke. Policyn behöver inte längre nämna Google som biträde.

---

### 2. Gat­a server-side track-event bakom samtycke (D)
**Åtgärd:** Lägg till cookie-consent-kontroll i `src/lib/trackEvent.ts` före varje `posthog.capture()` och server-side track-event.

**Kodändringar:**
- Läs consent-state (t.ex. från `localStorage` eller ett nytt `consent_status`-värde) i `trackEvent.ts`.
- Om `consent === 'rejected'` eller ej satt: hoppa över `posthog.capture()`, logga inget till PostHog.
- Fortsätt tillåta anonymisering av `isInternalTraffic()` oavsett consent.

**Not:** Detta är ett minimum — om ni väljer en full CMP-lösning senare kan den ersätta denna logik.

---

### 3. Skriv om integritetspolicyn till live-produkten + företagsidentitet (B3)
**Åtgärd:** Uppdatera `src/pages/PrivacyPolicy.tsx` så att den endast beskriver funktioner som är live idag.

**Kodändringar:**
- Ta bort avsnitt om Dokumentvalv, Referenser, Fakturagranskning, Uppdragsprognos, Förhandlingsassistent (om dessa inte längre har aktiva flöden).
- Förklara insamlade uppgifter från löneenkäten: yrke, region, anställningsform, timersättning, e-post.
- Personuppgiftsansvarig: Piemonte Invest AB (med org.nr, adress, kontakt).
- Personuppgiftsbiträden: Supabase EU (hosting/databas), PostHog (analys), ev. e-postleverantör.
- Rättslig grund: samtycke (enkät) / avtal (konto) / berättigat intresse (analys, med opt-out).
- Användarrättigheter: rätt till information, rättelse, radering, dataportabilitet.
- Kontakt: info@compcare.se + IMY-länk.
- Lägg till cookie-tabell (endast nödvändiga + PostHog efter samtycke).

**UI-ändringar:**
- Lägg footer på Hem (`src/pages/Home.tsx` eller motsvarande): Piemonte Invest AB · org.nr · info@compcare.se · Integritetspolicy · Vanliga frågor.
- Lägg badge/microcopy "Anonymt · Data lagras inom EU" nära enkäten.
- Lägg consent-microcopy under e-poststeget i enkäten.

---

### 4. Beslut + ev. kodfix på get-report (B2)
**Åtgärd:** Väntar på produktbeslut — men koden är förberedd för båda scenarier.

**Alternativ A (Låst — rekommenderas för GDPR):**
- `supabase/functions/get-report/index.ts` rad 66: Ändra `const fullAccess = true || isPaid || isReferralUnlocked || isOwner;` till `const fullAccess = isPaid || isReferralUnlocked || isOwner;`.
- Resultat: Endast betalande, referral-unlocked eller ägare ser full rapport.

**Alternativ B (Öppen länkdelning):**
- Behåll nuvarande kod.
- Lägg till dokumenterad risk-anteckning i policyn ("Rapporter kan delas via unik länk").
- Lägg till utgångstid på länkar (t.ex. 30 dagar) eller tokenisering.

**Rekommendation:** Alternativ A. Det är enklast, säkrast GDPR-mässigt, och alignar med att rapporten innehåller personuppgifter (lön, region, yrke).

---

### 5. Fixa/dölj döda CTA:er på Profil + Campaign (B4)
**Åtgärd:** Dölj eller rätta länkar som pekar på redirect-till-/ routes.

**Kodändringar:**
- `src/pages/Profile.tsx` rad ~499: Dölj "Öppna förhandlingsassistenten"-knappen helt (ingen funktion).
- `src/pages/Profile.tsx` rad ~474: Fixa "Redigera"-knappen så den antingen döljes (om profilredigering är avstängd) eller pekar på rätt redigeringsvy (inte no-op-loop).
- `src/components/profile/DashboardReferences.tsx`: Dölj referens-widgeten helt (route redirectar till /).
- `src/components/profile/DashboardInvoiceCheck.tsx`: Dölj fakturakontroll-widgeten helt (route redirectar till /).
- `src/pages/Campaign.tsx` rad ~238: Dölj faktura-CTA-knappen (redirectar till /).

**Princip:** Endast CTA:er som leder till fungerande flöden ska visas.

---

### 6. Lägg felhantering på AnalysisScreen (F)
**Åtgärd:** Hantera backend-fel i kärnflödet (`/resultat/:leadId`).

**Kodändringar:**
- I `AnalysisScreen.tsx` (eller motsvarande): Lägg `try/catch` eller `.catch()` på Supabase-anropet som hämtar rapportdata.
- Vid fel: Visa ett användarvänligt felmeddelande (inte tom sida), t.ex. "Något gick fel när din analys skulle hämtas. Försök igen eller kontakta oss."
- Erbjud knapp "Försök igen" som omladdar datan.
- Logga felet till PostHog (`posthog.capture('analysis_error', { error: ... })`) för övervakning.

---

### 7. .env ur git + robots.txt + noindex /resultat (B6)
**Åtgärd:** Förhindra att .env checkas in + styr sökmotorindexering.

**Kodändringar:**
- Kör `git rm --cached .env`.
- Uppdatera `.gitignore`: Lägg till `.env` och `.env.*`.
- Skapa `.env.example` med alla publika nycklar/URL:er (används som mall).
- `public/robots.txt`:
  - Lägg till `Disallow: /admin`
  - Lägg till `Disallow: /resultat/`
- `AnalysisScreen.tsx`: Lägg `<meta name="robots" content="noindex, nofollow">` (via react-helmet-async eller enklast en `<Helmet>`-komponent i route-komponenten).

---

### 8. Generera om sitemap.xml (E)
**Åtgärd:** Uppdatera `public/sitemap.xml` till endast aktiva 200-routes.

**Kodändringar:**
- Ta bort borttagna routes: `/b2b`, `/v1`, `/consultant/forhandla`, `/consultant/fakturakontroll`, `/uppdragsradar`, `/agency/market-edge`, `/din-data`, `/for-bemanningsforetag`, `/eget-bolag`, `/registrera/bemanning`.
- Lägg till live routes: `/`, `/resultat/:leadId`, `/rapport/:reportId`, `/rapport/anestesisjukskoterska`, `/bollnas/lakare-alm`, `/kampanj/:role`, `/vanliga-fragor`, `/integritetspolicy`, `/logga-in`, `/registrera`, `/aterstall-losenord`, `/unsubscribe`.
- Notera att dynamiska routes (`:leadId`, `:reportId`, `:role`) inte kan listas statiskt utan specifika värden — använd endast de statiska URLerna. För `/kampanj/:role`, generera en entry per live kampanj-roll om möjligt, annars hoppa över.

**Om en generator används:** Uppdatera `scripts/generate-sitemap.ts` eller motsvarande mekanism med korrekt entries-array.

---

### Implementeringsordning (föreslagen)
1. .env ur git (B6) — snabb win, ingen kodpåverkan.
2. GA4 bort (B1) + trackEvent consent-gate (D) — GDPR-grund.
3. get-report fix (B2) — säkerhet.
4. Döda CTAs (B4) — UX.
5. AnalysisScreen felhantering — kärnflöde robusthet.
6. Privacy policy + footer + microcopy (B3) — juridik & förtroende.
7. robots.txt + noindex — SEO-hårdning.
8. sitemap.xml — SEO.

Totalt beräknad arbetsinsats: ~2–3 dagar fokuserat arbete.
