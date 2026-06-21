## Fix: `mp_offers` SELECT-policy för listing-ägare

**Vad som ändras**
En ny RLS SELECT-policy på `public.mp_offers` som låter en konsult läsa bud som tillhör deras egna listings. Inget annat rörs.

**Migration (enda SQL-ändringen)**

```sql
CREATE POLICY "Listing owners can read their offers"
  ON public.mp_offers
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.mp_listings l
      WHERE l.id = mp_offers.listing_id
        AND l.user_id = auth.uid()
    )
  );
```

**Påverkan på övrig funktionalitet**
- Ingen. Marketplace är dubbel-gated (env-flag + `app_settings.marketplace_enabled`, default OFF).
- `MarketplaceHome.tsx` läser idag via vyn `mp_offers_for_listing_owner` — den vyn fortsätter fungera oförändrat. Den nya policyn ger bara *möjlighet* till direkt SELECT från basbordet för rätt ägare; ingen befintlig kodväg byter beteende.
- Befintliga policies (`UPDATE` för listing-ägare, `ALL` för admin) lämnas orörda.
- Inga ändringar i edge functions, klientkod, vyer, eller andra tabeller.

**Verifiering efter migration**
1. Bekräfta att policyn skapats: `SELECT polname FROM pg_policy WHERE polrelid = 'public.mp_offers'::regclass`.
2. Kör `supabase--linter` + `security--run_security_scan` — varningen `mp_offers_missing_select_for_listing_owner` ska försvinna.
3. Smoke-test: marketplace-flaggan är OFF i prod, så ingen UI-regression möjlig. Inget annat att testa.

**Scope-lock**
Endast denna policy. Punkt 2 (`ref_representation_requests`) och punkt 3 (`extension in public`) lämnas orörda enligt ditt direktiv.
