
-- ============================================================================
-- 1) profiles: revoke UPDATE on trust/status columns from client roles
-- ============================================================================
REVOKE UPDATE (has_required_references, has_valid_ivo, has_valid_hosp, has_bankid, profile_status, status_updated_at, email, user_id)
  ON public.profiles FROM anon, authenticated;

-- ============================================================================
-- 2) ref_profiles: revoke UPDATE on trust/status columns from client roles
-- ============================================================================
REVOKE UPDATE (bankid_verified, trust_score, trust_tier, score_breakdown, score_updated_at, profile_status, status_checklist, status_updated_at, email, id)
  ON public.ref_profiles FROM anon, authenticated;

-- ============================================================================
-- 3) ref_references: no direct client writes allowed
-- All legit updates go via SECURITY DEFINER RPCs
-- (ref_submit_reference, ref_respond_to_ping, ref_refresh_attachability)
-- ============================================================================
REVOKE UPDATE ON public.ref_references FROM anon, authenticated;

-- ============================================================================
-- 4) invoice_reviews: client may only confirm the timesheet
-- Status transitions go via invoice-extract / invoice-analyzer / admin-review-action
-- (all use service_role)
-- ============================================================================
REVOKE UPDATE ON public.invoice_reviews FROM anon, authenticated;
GRANT UPDATE (confirmed_tidrapport, confirmed_at, terms_accepted_at, konsult_godkand, phone, manual_tidrapport, is_handwritten)
  ON public.invoice_reviews TO authenticated;

-- CHECK-constraint for invoice_reviews.status (defence in depth against service_role bugs)
ALTER TABLE public.invoice_reviews DROP CONSTRAINT IF EXISTS invoice_reviews_status_check;
ALTER TABLE public.invoice_reviews
  ADD CONSTRAINT invoice_reviews_status_check
  CHECK (status IN ('extracting','extracted','analyzing','pending_review','approved','rejected','error','rate_limited','payment_required'));

-- ============================================================================
-- 5) consultant_documents: name-check fields are server-set only
-- ============================================================================
REVOKE UPDATE (name_check_status, name_check_at, extracted_name)
  ON public.consultant_documents FROM anon, authenticated;

-- ============================================================================
-- 6) mp_offers: drop the broad listing-owner UPDATE policy
-- Accept/reject/counter must go via marketplace-offer-respond edge function
-- ============================================================================
DROP POLICY IF EXISTS mp_offers_listing_owner_update ON public.mp_offers;

-- ============================================================================
-- 7) org_membership_requests: admins must go via approve/reject RPCs
-- ============================================================================
REVOKE UPDATE ON public.org_membership_requests FROM anon, authenticated;

ALTER TABLE public.org_membership_requests DROP CONSTRAINT IF EXISTS org_membership_requests_status_check;
ALTER TABLE public.org_membership_requests
  ADD CONSTRAINT org_membership_requests_status_check
  CHECK (status IN ('pending','approved','rejected'));
