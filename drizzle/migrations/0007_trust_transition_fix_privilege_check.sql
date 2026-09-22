-- Rättning: i en SECURITY DEFINER-funktion är current_user alltid ägaren (postgres),
-- så den tidigare service-kontrollen släppte igenom vilken inloggad användare som helst.
-- Behörighet avgörs nu av JWT-rollen (service_role) eller admin via ref_has_role.
CREATE OR REPLACE FUNCTION public.trust_transition_credential(
  _credential_id uuid,
  _to_status text,
  _reason text DEFAULT NULL,
  _assurance_level text DEFAULT NULL,
  _issuer_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _jwt_role text;
  _is_service boolean;
  _cred public.trust_credentials%ROWTYPE;
  _allowed text[];
  _event text;
  _actor text;
BEGIN
  BEGIN
    _jwt_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  EXCEPTION WHEN others THEN
    _jwt_role := NULL;
  END;

  _is_service := coalesce(_jwt_role, '') = 'service_role';

  IF NOT _is_service THEN
    IF _uid IS NULL OR NOT public.ref_has_role(_uid, 'admin'::ref_app_role) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT * INTO _cred FROM public.trust_credentials WHERE id = _credential_id FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Credential not found';
  END IF;

  _allowed := CASE _cred.status
    WHEN 'pending'    THEN ARRAY['active','rejected','revoked','superseded']
    WHEN 'active'     THEN ARRAY['expired','revoked','superseded']
    WHEN 'expired'    THEN ARRAY['active','revoked','superseded']
    WHEN 'rejected'   THEN ARRAY['pending']
    ELSE ARRAY[]::text[]
  END;

  IF NOT (_to_status = ANY (_allowed)) THEN
    RAISE EXCEPTION 'Transition % -> % is not allowed', _cred.status, _to_status;
  END IF;

  IF _assurance_level IS NOT NULL
     AND _assurance_level NOT IN ('self_asserted','evidence_submitted','document_verified','issuer_verified','authority_verified') THEN
    RAISE EXCEPTION 'Invalid assurance_level: %', _assurance_level;
  END IF;

  _event := CASE _to_status
    WHEN 'active' THEN 'verified'
    WHEN 'rejected' THEN 'rejected'
    WHEN 'revoked' THEN 'revoked'
    WHEN 'expired' THEN 'expired'
    WHEN 'superseded' THEN 'superseded'
    WHEN 'pending' THEN 'submitted'
  END;

  UPDATE public.trust_credentials SET
    status = _to_status,
    assurance_level = COALESCE(_assurance_level, assurance_level),
    issuer_id = COALESCE(_issuer_id, issuer_id),
    verified_at = CASE WHEN _to_status = 'active' THEN now() ELSE verified_at END,
    revoked_at = CASE WHEN _to_status = 'revoked' THEN now() ELSE revoked_at END,
    revoked_reason = CASE WHEN _to_status = 'revoked' THEN _reason ELSE revoked_reason END,
    updated_at = now()
  WHERE id = _credential_id;

  _actor := CASE WHEN _is_service THEN 'system' ELSE 'admin' END;

  INSERT INTO public.trust_verification_events (
    credential_id, event_type, actor_kind, actor_user_id, from_status, to_status, reason, payload
  )
  VALUES (
    _credential_id, _event, _actor, _uid, _cred.status, _to_status, _reason,
    jsonb_build_object('assurance_level', COALESCE(_assurance_level, _cred.assurance_level))
  );

  RETURN jsonb_build_object(
    'credential_id', _credential_id,
    'from_status', _cred.status,
    'to_status', _to_status,
    'event_type', _event
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_transition_credential(uuid, text, text, text, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trust_transition_credential(uuid, text, text, text, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.trust_transition_credential(uuid, text, text, text, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trust_transition_credential(uuid, text, text, text, uuid) TO service_role;
