-- 1. Drop dead Ref-ID RPCs (archived feature; underlying tables removed)
DROP FUNCTION IF EXISTS public.ref_create_ping(uuid, text);
DROP FUNCTION IF EXISTS public.ref_get_ping_by_token(text);
DROP FUNCTION IF EXISTS public.ref_respond_to_ping(text, ref_ping_status);
DROP FUNCTION IF EXISTS public.ref_submit_reference(text, uuid, text, text, jsonb, integer);
DROP FUNCTION IF EXISTS public.ref_verify_imported_reference(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.ref_get_reference_by_invite_token(text);
DROP FUNCTION IF EXISTS public.ref_get_public_profile(uuid);
DROP FUNCTION IF EXISTS public.ref_log_profile_view(uuid, text, text);

-- 2. ROOT CAUSE: EXECUTE was held by PUBLIC, so REVOKE ... FROM anon had no effect.
--    Revoke EXECUTE from PUBLIC on every non-extension routine in public schema.
DO $$
DECLARE r record;
BEGIN
  FOR r IN
    SELECT p.oid::regprocedure::text AS sig
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    LEFT JOIN pg_depend d ON d.objid = p.oid AND d.deptype = 'e'
    WHERE n.nspname = 'public'
      AND d.objid IS NULL
      AND p.prorettype <> 'trigger'::regtype
      AND p.prokind IN ('f','p')
  LOOP
    EXECUTE format('REVOKE EXECUTE ON %s %s FROM PUBLIC',
      CASE WHEN r.sig LIKE 'procedure%' THEN 'PROCEDURE' ELSE 'FUNCTION' END, r.sig);
  END LOOP;
END $$;

-- 3. Prevent recurrence: new functions must be granted explicitly
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public REVOKE EXECUTE ON FUNCTIONS FROM PUBLIC;

-- 4. Restore explicit grants for intentionally public endpoints
GRANT EXECUTE ON FUNCTION public.get_document_share_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_feature_flag(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.top_kommuner(integer) TO anon, authenticated;

-- 5. Ensure authenticated-only RPCs still work for logged-in users
GRANT EXECUTE ON FUNCTION public.create_org_with_admin(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_org_membership_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_org_membership_request(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_document_share(uuid[], integer, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.ai_usage_summary(integer, uuid) TO authenticated;