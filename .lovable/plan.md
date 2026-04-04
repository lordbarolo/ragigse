

## Plan: Ta bort rapport-betalflödet, behåll webhook + grundstruktur

### Vad behålls
- `supabase/functions/stripe-webhook/index.ts` — behålls intakt
- `payments`-tabellen i databasen — behålls
- `STRIPE_SECRET_KEY` och `STRIPE_WEBHOOK_SECRET` — behålls som secrets

### Vad tas bort

**Edge Functions (radera filer + avdeploya):**
1. `supabase/functions/create-checkout/` — hela mappen
2. `supabase/functions/verify-payment/` — hela mappen

**Frontend:**
3. `src/pages/PaymentSuccess.tsx` — radera filen
4. `src/App.tsx` — ta bort importen av `PaymentSuccess` och routen `/betalning-klar`

**Teaser paywall-spårning (rensa):**
5. `src/pages/Teaser.tsx` — ta bort `paywallViewedRef`, `paywall_viewed`-event och `paywall_scrolled`-event (dessa refererar till ett betalflöde som inte längre finns)

**E2E-test:**
6. `supabase/functions/e2e-test/index.ts` — ta bort det simulerade "verify-payment"-steget (steg 4 i testet)

### Vad behålls men justeras
- `src/pages/AnalyticsDashboard.tsx` — behåll checkout/payment-kolumnerna i dashboarden (historisk data finns kvar i databasen)

### Teknisk ordning
1. Radera `create-checkout` och `verify-payment` edge function-filer
2. Avdeploya båda funktionerna via `delete_edge_functions`
3. Radera `PaymentSuccess.tsx`
4. Uppdatera `App.tsx` (ta bort import + route)
5. Rensa paywall-tracking i `Teaser.tsx`
6. Rensa e2e-test

