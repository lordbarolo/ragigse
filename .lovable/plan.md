

## Diagnos — varför PostHog är "nere"

PostHog och `analytics_events` är **inte tekniskt nere**. Problemet är att huvudsidan `/` bytte komponent (`SalaryCheck` → `LandingV2`) men spårnings-koden flyttades aldrig med.

**Bevis:**
- `LandingV2.tsx` (renderas på `/`) innehåller **inga** `trackEvent`-anrop alls.
- `landing_viewed` finns bara i `SalaryCheck.tsx` (nu på `/v1`) och `b2b_landing_viewed` i `Index.tsx` (på `/b2b`).
- DB-tabellen `analytics_events` har 0 rader sedan 18 april (3 dagar). Senaste `landing_viewed` = 18 april.
- Edge function `track-event` har **inga loggar alls** — den anropas inte.
- Lovable-analytics visar att 6 besökare faktiskt funnits dessa dagar — så trafik finns, men inget spåras.

Posthog-init-koden, cookie-consent, edge function, RLS, super-properties och `identify()` — allt är intakt. Det saknas bara faktiska `trackEvent`-anrop på de sidor som nu utgör trafiken.

## Plan — återupprätta tracking

### 1. Lägg in `landing_viewed` + `useTimeOnPage` i `LandingV2.tsx`
Den primära ytan. Ska skicka `landing_viewed` direkt vid mount + `time_on_page` vid unmount. Detta återställer toppen av tratten.

### 2. Lägg in spårning för CTA-klick i `LandingV2`
Identifiera de viktigaste CTA-knapparna i LandingV2 (t.ex. "Starta löneanalys", "Granska faktura", "Logga in") och fyr `product_cta_clicked` med `cta`-metadata för varje. Gör även en `product_page_viewed` om den fungerar som produktöversikt.

### 3. Lägg till en safety-net i `useEffect` på rotnivå
Lägg en `pageview`-spårare i `App.tsx` (lyssnar på `useLocation()`) som fyrar ett enkelt PostHog `$pageview` och vår egen `landing_viewed`/route-baserad event vid varje route-byte. Detta garanterar att framtida sidbyten (som det här) inte tappar tracking igen.

   - Endast PostHog `posthog.capture('$pageview', { path })` — ingen edge-function-call (för att undvika rate-limits).
   - Vår egen `analytics_events`-tabell behåller endast namngivna funnel-events.

### 4. Lägg till en CI-skydd: lint-regel/manuell checklista
Skapa `.lovable/memory/tech/tracking-coverage.md` som kräver att varje ny landningssida måste:
   - kalla `trackEvent("landing_viewed")` ELLER ett unikt `*_page_viewed`-event,
   - lägga till eventet i både `EventName`-typen i `trackEvent.ts` och `ALLOWED_EVENTS` i `track-event/index.ts`.

### 5. Verifiering efter deploy
   - Öppna `compcare.se` i ny inkognitoflik, acceptera cookies.
   - Kör SQL: `SELECT count(*) FROM analytics_events WHERE created_at > now() - interval '5 minutes';` → ska vara > 0.
   - I PostHog Live Events ska `landing_viewed` och `$pageview` synas inom sekunder.
   - Kör `posthog-health-check` edge function dagen efter — ska visa events > 0 och unique leads > 0.

## Tekniska detaljer

**Filer som ändras:**
- `src/pages/demo/LandingV2.tsx` — lägg till `useEffect` med `trackEvent("landing_viewed")` + `useTimeOnPage("landing")` + CTA-spårning.
- `src/App.tsx` — global route-watcher som fyrar `posthog.capture('$pageview')` på `useLocation()`-ändring.
- `.lovable/memory/tech/tracking-coverage.md` — ny memory om kravet att alla landningssidor spåras.
- `.lovable/memory/index.md` — index-rad för nya memory-filen.

**Vad ändras inte:**
- `src/lib/posthog.ts`, `src/lib/trackEvent.ts`, `src/lib/identify.ts`, `track-event/index.ts`, RLS-policies, cookie-consent — all befintlig infrastruktur är korrekt.
- Inga DB-migrations behövs.

**Risker:** Inga. Endast tilläggsspårning på publika sidor. Cookie-consent-gating är redan på plats (PostHog respekterar `opt_out_capturing` by default).

