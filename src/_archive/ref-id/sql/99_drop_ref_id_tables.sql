-- Archived track: Ref-ID
DROP TABLE IF EXISTS public.ref_verification_comments CASCADE;
DROP TABLE IF EXISTS public.ref_reference_verifications CASCADE;
DROP TABLE IF EXISTS public.ref_reference_artifacts CASCADE;
DROP TABLE IF EXISTS public.ref_application_references CASCADE;
DROP TABLE IF EXISTS public.ref_representation_requests CASCADE;
DROP TABLE IF EXISTS public.ref_profile_views CASCADE;
DROP TABLE IF EXISTS public.ref_access_logs CASCADE;
DROP TABLE IF EXISTS public.ref_verifications CASCADE;
DROP TABLE IF EXISTS public.ref_verified_domains CASCADE;
DROP TABLE IF EXISTS public.ref_role_profiles CASCADE;
DROP TABLE IF EXISTS public.ref_user_roles CASCADE;
DROP TABLE IF EXISTS public.ref_pings CASCADE;
DROP TABLE IF EXISTS public.ref_references CASCADE;
DROP TABLE IF EXISTS public.ref_profiles CASCADE;
DROP TABLE IF EXISTS public.representation_events CASCADE;

-- Archived track: Dokhus / document sharing
DROP TABLE IF EXISTS public.document_share_views CASCADE;
DROP TABLE IF EXISTS public.document_shares CASCADE;
DROP TABLE IF EXISTS public.consultant_documents CASCADE;

-- Archived track: Marketplace
DROP TABLE IF EXISTS public.mp_negotiation_events CASCADE;
DROP TABLE IF EXISTS public.mp_offers CASCADE;
DROP TABLE IF EXISTS public.mp_agent_runs CASCADE;
DROP TABLE IF EXISTS public.mp_listings CASCADE;

-- Archived track: digital signing
DROP TABLE IF EXISTS public.bankid_signatures CASCADE;

-- Archived track: coupons
DROP TABLE IF EXISTS public.coupon_usages CASCADE;
DROP TABLE IF EXISTS public.coupons CASCADE;