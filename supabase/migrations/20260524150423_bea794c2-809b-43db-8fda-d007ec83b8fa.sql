-- Fix: tighten RLS so raw calloff_imports is no longer publicly readable.
-- Public access moves to the safe view calloff_imports_public, which is
-- switched to SECURITY DEFINER (security_invoker=false) so it exposes only
-- non-sensitive columns and bypasses the now-restrictive base policy.

-- 1. Replace the flawed OR policy with a strict one: only explicitly shared
--    partner rows are readable via direct SELECT on the base table.
DROP POLICY IF EXISTS "Public reads only shared or own calloff_imports" ON public.calloff_imports;

CREATE POLICY "Public reads only explicitly shared partner calloffs"
ON public.calloff_imports
FOR SELECT
TO public
USING (partner_share_data = true);

-- 2. Make the safe view a definer-style safe view so anon/authenticated can
--    still see aggregate-friendly columns from CompCare's own historical data
--    (partner_source IS NULL) without exposing raw_data / validation_flags /
--    dedup_hash / source. Service-role edge functions are unaffected.
ALTER VIEW public.calloff_imports_public SET (security_invoker = false);

-- Re-assert grants (idempotent).
GRANT SELECT ON public.calloff_imports_public TO anon, authenticated;

-- Service-role full-access policy on the base table remains in place from a
-- prior migration and is intentionally untouched here.

COMMENT ON POLICY "Public reads only explicitly shared partner calloffs" ON public.calloff_imports IS
  'Direct SELECT on raw calloff_imports is restricted to rows a partner explicitly opted to share. All other public access must go through the calloff_imports_public safe view, which excludes raw_data, validation_flags, dedup_hash and source.';