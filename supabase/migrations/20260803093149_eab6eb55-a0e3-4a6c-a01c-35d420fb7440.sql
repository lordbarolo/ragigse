-- 1. Whitelist non-secret keys in get_feature_flag
CREATE OR REPLACE FUNCTION public.get_feature_flag(_key text)
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT value FROM public.app_settings
  WHERE key = _key
    AND key IN ('marketplace_enabled')
$function$;

-- 2. Revoke anon EXECUTE on internal / auth-required functions
REVOKE EXECUTE ON FUNCTION public.create_org_with_admin(text, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.approve_org_membership_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.reject_org_membership_request(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_document_share(uuid[], integer, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.redact_avrop_intelligence_pii() FROM anon;
REVOKE EXECUTE ON FUNCTION public.mp_can_publish(uuid) FROM anon;

-- Archived Ref-ID surface: no live client uses these, close anon access
REVOKE EXECUTE ON FUNCTION public.ref_create_ping(uuid, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ref_get_ping_by_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ref_get_public_profile(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ref_get_reference_by_invite_token(text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ref_log_profile_view(uuid, text, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ref_respond_to_ping(text, ref_ping_status) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ref_submit_reference(text, uuid, text, text, jsonb, integer) FROM anon;
REVOKE EXECUTE ON FUNCTION public.ref_verify_imported_reference(text, uuid, text, text) FROM anon;

-- 3. Drop dead create_document_share overload
DROP FUNCTION IF EXISTS public.create_document_share(uuid[], integer, text);

-- 4. Trim get_referral_by_token (no referrer_email leak)
DROP FUNCTION IF EXISTS public.get_referral_by_token(text);
CREATE OR REPLACE FUNCTION public.get_referral_by_token(_token text)
RETURNS TABLE(id uuid, lead_id uuid, clicked boolean, created_at timestamp with time zone)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT r.id, r.lead_id, r.clicked, r.created_at
  FROM public.referrals r
  WHERE r.token = _token
$function$;

-- 5. ref_create_ping: require auth + ownership
CREATE OR REPLACE FUNCTION public.ref_create_ping(_reference_id uuid, _requester_name text)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _ping_id UUID;
  _existing INTEGER;
  _uid UUID := auth.uid();
  _owns BOOLEAN;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.ref_references r
    WHERE r.id = _reference_id AND r.individual_id = _uid
  ) INTO _owns;

  IF NOT _owns THEN
    RAISE EXCEPTION 'Reference does not belong to this user';
  END IF;

  SELECT COUNT(*) INTO _existing
  FROM public.ref_pings
  WHERE reference_id = _reference_id AND status = 'sent' AND expires_at > now();

  IF _existing > 0 THEN
    RAISE EXCEPTION 'A pending ping already exists for this reference';
  END IF;

  INSERT INTO public.ref_pings (reference_id, requested_by, requester_name, response_token, expires_at)
  VALUES (_reference_id, _uid, _requester_name, encode(gen_random_bytes(16), 'hex'), now() + interval '14 days')
  RETURNING id INTO _ping_id;

  RETURN _ping_id;
END;
$function$;