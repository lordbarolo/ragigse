

# Analytics Audit: Identifierade problem och åtgärdsplan

## Identifierade problem

### 1. ALLOWED_EVENTS ur synk (KRITISKT — events tappas tyst)
Frontend (`trackEvent.ts`) definierar 60 event-typer. Backend (`track-event/index.ts`) har bara 50 i sin `ALLOWED_EVENTS`-lista. **10 events skickas från klienten men avvisas med 400-fel av edge-funktionen** — de sparas aldrig i databasen.

Saknade events i backend:
- `b2b_landing_viewed`
- `fakturakontroll_interest_submitted`
- `negotiation_email_gate_completed`
- `chat_answer_reported`
- `fakturakontroll_ny_viewed`
- `fakturakontroll_uploaded`
- `fakturakontroll_confirmed`
- `fakturakontroll_completed`
- `teaser_page_viewed`
- `teaser_scrolled`

Dessutom har backend gamla events som inte längre finns i frontend:
- `checkout_started`, `payment_verified`, `paywall_viewed`, `paywall_scrolled`, `paywall_cta_clicked`, `payment_completed`

### 2. analytics-dashboard: 10 000-radsgräns
Dashboarden hämtar max 10 000 rader. Med 3 400+ events/månad nås detta efter ~3 månader, och äldre data klipps bort utan varning.

### 3. analytics-dashboard: Föråldrad funnelmodell
- Funnel-stegen saknar `analysis_completed` och `email_submitted`
- `payment_verified` räknas som revenue — men betalflödet är borttaget
- A/B-variant-logik (`ab_variant`) används inte längre i frontend

### 4. `as any` type-casts i klientkoden
Flera `trackEvent`-anrop använder `as any` (t.ex. ReijdarChat, MarketDiagnosisCard) — tecken på att event-typerna i frontend inte heller är kompletta.

### 5. Intern trafik-filter saknar `.lovable.app`
`isInternalTraffic()` blockerar `.lovableproject.com` men inte `.lovable.app`. Den publicerade URL:en (`compcare-se.lovable.app`) passerar — men **preview-trafik via den publicerade subdomänen** kan läcka in som "riktiga" besök.

---

## Åtgärdsplan

### Steg 1: Synka ALLOWED_EVENTS i track-event
- Lägg till alla 10 saknade events
- Ta bort 6 föråldrade payment/paywall-events
- Gör listan identisk med frontend-typerna

### Steg 2: Rensa `as any`-casts i frontend
- Säkerställ att `EventName`-typen i `trackEvent.ts` matchar alla events som faktiskt skickas

### Steg 3: Uppdatera analytics-dashboard
- Höj `limit` till 50 000 (eller paginera)
- Uppdatera funnelsteg till: `landing_viewed → survey_started → survey_completed → analysis_started → email_collected → analysis_completed → report_viewed`
- Ta bort `payment_verified`-revenue-logik
- Ta bort A/B-variant-uppdelning (eller gör den valfri)

### Steg 4: Förbättra intern-trafikfilter
- Lägg till `.lovable.app` i `isInternalTraffic()` för att blockera preview-domänen

---

## Tekniska detaljer

**Filer som ändras:**
- `supabase/functions/track-event/index.ts` — synka ALLOWED_EVENTS
- `src/lib/trackEvent.ts` — uppdatera EventName-typ, fixa intern-trafikfilter
- `supabase/functions/analytics-dashboard/index.ts` — uppdatera funnel, ta bort föråldrad logik, höj limit
- `src/components/radar/ReijdarChat.tsx` — ta bort `as any`
- `src/components/teaser/MarketDiagnosisCard.tsx` — ta bort `as any`

