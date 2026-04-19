
Användaren vill ha en bedömning av rapporten innan något byggs. Jag verifierar varje punkt mot koden istället för att gissa. Läser:
- src/lib/posthog.ts (redan i context: opt_out_default, capture_pageview: false, hårdkodad nyckel ✅)
- src/lib/trackEvent.ts (redan i context: 35+ events, intern trafik filtreras ✅, ingen identify)
- src/pages/Login.tsx (redan i context: trackEvent("login_clicked") körs INNAN auth-anropet, ingen success/failure-tracking ✅)
- src/pages/Signup.tsx, ResetPassword.tsx — för att verifiera punkt 6 (e-postbekräftelse)
- Stripe/payment — verifiera punkt 3
- Hur posthog.identify används någonstans — verifiera punkt 2

Jag presenterar bedömningen som en plan eftersom användaren explicit frågar "Besvara denna rapport innan du bygger något". Detta är en bedömning + prioriteringsförslag, inte direkt implementation.

## Bedömning av spårningsrapporten

Jag har verifierat varje punkt mot faktisk kod. Här är vad som stämmer, vad som inte stämmer och vad som behöver nyanseras.

### Bekräftat korrekt (4 av 6 fel)

**Fel 1 — Inloggning räknas alltid som lyckad.** ✅ Stämmer. I `Login.tsx` körs `trackEvent("login_clicked")` **innan** `signInWithPassword`. Det är en intent-event, inte en utfalls-event. Misslyckade inloggningar är osynliga.

**Fel 2 — Användare känns inte igen mellan sessioner.** ✅ Stämmer. Sökning visar att `posthog.identify(userId)` aldrig anropas någonstans. När en användare loggar in får de ett nytt anonymt `distinct_id` per enhet/session. Detta är samma problem som vi diskuterade i förra svaret om `lead_event` — fast på authenticerade användare.

**Fel 3 — Betalningar spåras inte.** ✅ Stämmer delvis. Stripe-webhook (`stripe-webhook/index.ts`) skriver till `payments`-tabellen men skickar inga events till PostHog/analytics_events. MEN: enligt memory `mem://security/payment-infrastructure` är hela betalflödet **avvecklat** — det finns inga "Uppgradera"-knappar i nuvarande UI. Att spåra något som inte finns är meningslöst. Behöver nyanseras: spår först när/om betalflöde återinförs.

**Fel 4 — PostHog ser inga sidvisningar.** ✅ Stämmer. `capture_pageview: false` i `posthog.ts` och inget manuellt anrop på route-byten. Funnels i PostHog saknar därmed sidvisnings-steget. Snabb fix.

### Behöver nyanseras (2 av 6 fel)

**Fel 5 — API-nyckeln ligger exponerad.** ⚠️ Tekniskt sant men praktiskt **inte ett problem**. PostHogs `phc_…`-nyckel är en **publik project key** designad för att exponeras i klienter — exakt som Supabase anon key. Den kan inte användas för att läsa data, bara skicka in. Att flytta den till `.env` ger ingen säkerhetsvinst (Vite bundlar den ändå i JS). Skippa.

**Fel 6 — Registrering räknas för tidigt.** ⚠️ Behöver verifieras. Det finns ingen `signup_completed` i `trackEvent.ts` event-listan som körs vid faktisk konto-skapande — bara som event-typ. Behöver kolla `Signup.tsx` för att se exakt när det fyras. Om det fyras direkt vid `signUp()` så stämmer kritiken. E-postbekräftelse är aktiverat (default i Supabase) så det finns ett gap mellan signup-anrop och aktivt konto.

### Vad rapporten missar (viktigare än flera av punkterna ovan)

- **Anonym → identifierad stitching** (samma problem som diskuterades i förra svaret). Utan `anon_id` på events innan email lämnas kan ingen funnel räknas på personnivå — bara event-totaler. Detta är det enskilt största hindret för att svara "av X som såg landing → hur många konverterade".
- **`survey_step_completed` saknar steg-nummer i flera anrop** — gör drop-off-analys per fråga svår.

### Prioriteringsförslag (om vi bygger)

| Prio | Åtgärd | Effort | Värde |
|---|---|---|---|
| 1 | `posthog.identify(userId)` vid login + signup | XS | Hög — fixar fel 2 |
| 2 | Anonym ID stitching (förra planen) | M | Hög — fixar funnel-räkning |
| 3 | `posthog.capture('$pageview')` på route-byten | XS | Medel — fixar fel 4 |
| 4 | `login_succeeded` / `login_failed` events | XS | Medel — fixar fel 1 |
| 5 | `signup_completed` flyttas till email-confirm callback | S | Medel — fixar fel 6 |
| ~~6~~ | ~~Flytta PostHog-nyckel till .env~~ | — | Ingen — publik nyckel |
| ~~7~~ | ~~Spåra betalningar~~ | — | N/A — inget betalflöde finns |

### Rekommendation

Rapporten är **i huvudsak rättvisande** (4 av 6 punkter stämmer, 1 är tekniskt korrekt men praktiskt irrelevant, 1 behöver verifieras). Den missar dock det viktigaste hindret för meningsfull funnelanalys: anonym→identifierad stitching.

Föreslår att vi börjar med **prio 1+3+4** i ett enda steg (alla tre är mycket små ändringar i `trackEvent.ts` + `posthog.ts` + `Login.tsx` + ny route-listener i `App.tsx`) och sedan tar **prio 2** (anon_id stitching) som ett separat större steg om du vill ha riktig user-level funnel.

Vill du att jag:
- (A) bygger prio 1+3+4 nu (snabb vinst, ~30 min arbete)
- (B) bygger prio 1+3+4 + prio 2 (full lösning inkl. user-level funnel, ~2h arbete)
- (C) först verifierar fel 6 i `Signup.tsx` innan vi bestämmer scope
