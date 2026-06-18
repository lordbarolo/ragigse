
-- Security fix #1: ref_profiles safe-view (defense in depth)
-- Base table SELECT policy already restricts to id = auth.uid() (owner only),
-- but we add a dedicated public view that excludes PII (email, phone, license_number)
-- so any future join/RPC that needs profile data for non-owners uses the safe channel.

CREATE OR REPLACE VIEW public.ref_profiles_public
WITH (security_invoker = on) AS
SELECT
  id,
  full_name,
  specialty,
  role_type,
  bio,
  linkedin_url,
  years_licensed,
  bankid_verified,
  trust_score,
  trust_tier,
  score_breakdown,
  score_updated_at,
  profile_status,
  status_checklist,
  status_updated_at,
  created_at,
  updated_at
FROM public.ref_profiles;

GRANT SELECT ON public.ref_profiles_public TO anon, authenticated;

COMMENT ON VIEW public.ref_profiles_public IS
  'Safe-view of ref_profiles excluding PII (email, phone, license_number). Use this for any non-owner read. Base table remains owner-only via RLS.';
