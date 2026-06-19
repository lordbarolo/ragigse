-- ============================================================
-- Point 3: mp_offers.response_token safe-view
-- ============================================================
DROP POLICY IF EXISTS mp_offers_listing_owner_select ON public.mp_offers;

REVOKE SELECT ON public.mp_offers FROM anon, authenticated;

DROP VIEW IF EXISTS public.mp_offers_for_listing_owner;
CREATE VIEW public.mp_offers_for_listing_owner
WITH (security_invoker = on) AS
SELECT
  o.id,
  o.listing_id,
  o.parent_offer_id,
  o.agent_id,
  o.agent_org,
  o.agent_signature,
  o.offered_price_sek,
  o.start_date,
  o.end_date,
  o.hours_per_week,
  o.message_md,
  o.metadata,
  o.status,
  o.responded_at,
  o.responded_message_md,
  o.created_at,
  o.updated_at
FROM public.mp_offers o
WHERE EXISTS (
  SELECT 1 FROM public.mp_listings l
  WHERE l.id = o.listing_id AND l.user_id = auth.uid()
);

GRANT SELECT ON public.mp_offers_for_listing_owner TO authenticated;

-- Re-add admin & listing-owner update policies on base (still needed for writes
-- by edge functions running as the listing owner via supabase-js, plus admins).
-- Admin policy was already in place; keep it untouched.
-- Re-create listing-owner UPDATE policy (was implicitly removed if dependent on SELECT? No — it's independent).
-- listing_owner_update policy remains unchanged.

-- ============================================================
-- Point 4: ref_references.invite_token — drop dead SELECT policies
-- Clients already read via ref_references_safe (excludes invite_token,
-- giver_email). Edge functions use service_role and bypass RLS.
-- ============================================================
DROP POLICY IF EXISTS "Givers can read given references" ON public.ref_references;
DROP POLICY IF EXISTS "Individuals can read own references" ON public.ref_references;

-- Explicit REVOKE for defense in depth (no SELECT grant existed, make it permanent)
REVOKE SELECT ON public.ref_references FROM anon, authenticated;