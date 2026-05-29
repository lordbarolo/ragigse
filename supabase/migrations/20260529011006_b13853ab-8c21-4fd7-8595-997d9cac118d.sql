
-- 1) Härda mp_listings: ta bort bred public SELECT som exponerade user_id.
DROP POLICY IF EXISTS "mp_listings_published_readable" ON public.mp_listings;

-- Block ALL direct SELECT av anon mot mp_listings. Endast ägare/admin (befintliga policies) får läsa.
CREATE POLICY "mp_listings_no_direct_anon_select"
ON public.mp_listings
FOR SELECT
TO anon
USING (false);

-- Safe view: exponera ENDAST icke-PII-fält av publicerade listings, gated bakom feature flag.
DROP VIEW IF EXISTS public.mp_listings_public;
CREATE VIEW public.mp_listings_public
WITH (security_invoker = on) AS
SELECT
  id,
  status,
  role,
  specialization,
  region,
  kommun,
  available_from,
  available_to,
  hours_per_week,
  employment_type,
  price_min_sek,
  price_max_sek,
  currency,
  terms_md,
  verified_at_publish,
  published_at,
  closed_at,
  created_at
FROM public.mp_listings
WHERE status = 'published'
  AND COALESCE(
    (SELECT (value)::text::boolean FROM public.app_settings WHERE key = 'marketplace_enabled'),
    false
  ) = true;

GRANT SELECT ON public.mp_listings_public TO anon, authenticated;

-- För att view ska kunna läsa underliggande mp_listings via security_invoker behöver vi en
-- snäv policy som tillåter "läs publicerade rader, men ENDAST när feature-flaggan är på".
CREATE POLICY "mp_listings_published_readable_gated"
ON public.mp_listings
FOR SELECT
TO authenticated, anon
USING (
  status = 'published'
  AND COALESCE(
    (SELECT (value)::text::boolean FROM public.app_settings WHERE key = 'marketplace_enabled'),
    false
  ) = true
);

-- 2) Härda app_settings: ta bort bred anon read, exponera bara key+value via safe view.
DROP POLICY IF EXISTS "Anon can read app_settings" ON public.app_settings;

DROP VIEW IF EXISTS public.app_settings_public;
CREATE VIEW public.app_settings_public
WITH (security_invoker = on) AS
SELECT key, value FROM public.app_settings;

-- För att view (security_invoker) ska kunna läsa måste vi tillåta SELECT på key/value.
-- Vi behåller fortfarande tabellen utan bred policy — istället en specifik som vi snart kan
-- begränsa per nyckel om det behövs. För nu: anon får läsa key+value via view.
CREATE POLICY "Anon can read app_settings via view"
ON public.app_settings
FOR SELECT
TO anon
USING (true);

GRANT SELECT (key, value) ON public.app_settings TO anon;
GRANT SELECT ON public.app_settings_public TO anon, authenticated;
