
-- 1. Ta bort dubblett-SELECT-policy på organizations (publik åtkomst)
DROP POLICY IF EXISTS "Anyone can read organizations" ON public.organizations;

-- 2. Lägg till DELETE policy på invoice_reviews
CREATE POLICY "Users can delete own reviews"
  ON public.invoice_reviews
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- 3. Återkalla läsrättigheter på känsliga token-kolumner
-- Edge functions använder service_role som bypassar RLS, så detta påverkar inte dem.
REVOKE SELECT (invite_token) ON public.ref_references FROM authenticated, anon;
REVOKE SELECT (response_token) ON public.ref_pings FROM authenticated, anon;
REVOKE SELECT (secret_token) ON public.ref_representation_requests FROM authenticated, anon;

-- 4. Avrop intelligence: bara redacted rader synliga för icke-service-role
DROP POLICY IF EXISTS "Agency can read own avrop intelligence" ON public.avrop_intelligence;
CREATE POLICY "Agency can read own redacted avrop intelligence"
  ON public.avrop_intelligence
  FOR SELECT
  TO authenticated
  USING (
    agency_id = auth.uid()
    AND pii_redacted_at IS NOT NULL
  );

-- 5. Publik safe view för calloff_imports (utan raw_data)
CREATE OR REPLACE VIEW public.calloff_imports_public AS
SELECT
  id,
  imported_at,
  calloff_date,
  customer,
  customer_type,
  region,
  role,
  specialization,
  level,
  duration_weeks,
  unit,
  price_min,
  price_median,
  price_max,
  filled,
  partner_source,
  partner_share_data
FROM public.calloff_imports
WHERE partner_source IS NULL OR partner_share_data = true;

GRANT SELECT ON public.calloff_imports_public TO anon, authenticated;
