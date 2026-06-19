
REVOKE SELECT (invite_token), UPDATE (invite_token) ON public.ref_references FROM authenticated;
REVOKE SELECT (invite_token), UPDATE (invite_token) ON public.ref_references FROM anon;

REVOKE SELECT (response_token), UPDATE (response_token) ON public.mp_offers FROM authenticated;
REVOKE SELECT (response_token), UPDATE (response_token) ON public.mp_offers FROM anon;

CREATE OR REPLACE VIEW public.mp_offers_safe
WITH (security_invoker = on) AS
SELECT
  id, listing_id, parent_offer_id, agent_id, agent_org, agent_contact, agent_signature,
  offered_price_sek, start_date, end_date, hours_per_week, message_md, metadata,
  status, responded_at, responded_message_md, created_at, updated_at
FROM public.mp_offers;

GRANT SELECT ON public.mp_offers_safe TO authenticated;
GRANT ALL ON public.mp_offers_safe TO service_role;

COMMENT ON VIEW public.mp_offers_safe IS
  'Safe projection of mp_offers without response_token. Use this for any read from client or non-service code.';
COMMENT ON COLUMN public.mp_offers.response_token IS
  'Sensitive — only service_role may read/write. Token validation must go through marketplace-offer-respond edge function.';
COMMENT ON COLUMN public.ref_references.invite_token IS
  'Sensitive — only service_role may read/write. Use ref_references_safe view for client reads.';
