-- Skapa self-asserted credential atomiskt (subject = auth.uid(), aldrig från klienten).
CREATE OR REPLACE FUNCTION public.trust_create_self_asserted_credential(
  _type_slug text,
  _claims jsonb DEFAULT '[]'::jsonb,
  _evidence jsonb DEFAULT '[]'::jsonb,
  _valid_from date DEFAULT NULL,
  _valid_to date DEFAULT NULL,
  _metadata jsonb DEFAULT '{}'::jsonb
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _type public.trust_credential_types%ROWTYPE;
  _credential_id uuid;
  _claim jsonb;
  _ev jsonb;
  _value_count int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;

  SELECT * INTO _type FROM public.trust_credential_types
  WHERE slug = _type_slug AND is_active;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Unknown or inactive credential type: %', _type_slug;
  END IF;

  IF _claims IS NULL OR jsonb_typeof(_claims) <> 'array' THEN
    RAISE EXCEPTION 'claims must be a json array';
  END IF;
  IF _evidence IS NULL OR jsonb_typeof(_evidence) <> 'array' THEN
    RAISE EXCEPTION 'evidence must be a json array';
  END IF;
  IF _metadata IS NULL OR jsonb_typeof(_metadata) <> 'object' THEN
    RAISE EXCEPTION 'metadata must be a json object';
  END IF;

  INSERT INTO public.trust_credentials (
    subject_user_id, credential_type_id, status, assurance_level,
    valid_from, valid_to, source, metadata
  )
  VALUES (_uid, _type.id, 'pending', 'self_asserted', _valid_from, _valid_to, 'user', _metadata)
  RETURNING id INTO _credential_id;

  FOR _claim IN SELECT jsonb_array_elements(_claims) LOOP
    IF coalesce(_claim->>'claim_key', '') = '' THEN
      RAISE EXCEPTION 'claim_key is required for every claim';
    END IF;

    _value_count :=
        (CASE WHEN _claim ? 'value_text' AND _claim->>'value_text' IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN _claim ? 'value_num'  AND _claim->>'value_num'  IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN _claim ? 'value_date' AND _claim->>'value_date' IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN _claim ? 'value_bool' AND _claim->>'value_bool' IS NOT NULL THEN 1 ELSE 0 END)
      + (CASE WHEN _claim ? 'value_json' AND jsonb_typeof(_claim->'value_json') <> 'null' THEN 1 ELSE 0 END);

    IF _value_count <> 1 THEN
      RAISE EXCEPTION 'claim % must set exactly one value field', _claim->>'claim_key';
    END IF;

    INSERT INTO public.trust_claims (
      credential_id, claim_key, value_text, value_num, value_date, value_bool, value_json
    )
    VALUES (
      _credential_id,
      _claim->>'claim_key',
      _claim->>'value_text',
      NULLIF(_claim->>'value_num','')::numeric,
      NULLIF(_claim->>'value_date','')::date,
      NULLIF(_claim->>'value_bool','')::boolean,
      CASE WHEN _claim ? 'value_json' AND jsonb_typeof(_claim->'value_json') <> 'null'
           THEN _claim->'value_json' END
    );
  END LOOP;

  FOR _ev IN SELECT jsonb_array_elements(_evidence) LOOP
    IF coalesce(_ev->>'evidence_kind','') = '' THEN
      RAISE EXCEPTION 'evidence_kind is required for every evidence row';
    END IF;

    INSERT INTO public.trust_evidence (
      credential_id, evidence_kind, storage_bucket, storage_path, document_id,
      collected_by, metadata
    )
    VALUES (
      _credential_id,
      _ev->>'evidence_kind',
      _ev->>'storage_bucket',
      _ev->>'storage_path',
      NULLIF(_ev->>'document_id','')::uuid,
      _uid,
      COALESCE(CASE WHEN jsonb_typeof(_ev->'metadata') = 'object' THEN _ev->'metadata' END, '{}'::jsonb)
    );
  END LOOP;

  INSERT INTO public.trust_verification_events (
    credential_id, event_type, actor_kind, actor_user_id, from_status, to_status, payload
  )
  VALUES (
    _credential_id, 'created', 'subject', _uid, NULL, 'pending',
    jsonb_build_object(
      'credential_type', _type.slug,
      'claim_count', jsonb_array_length(_claims),
      'evidence_count', jsonb_array_length(_evidence)
    )
  );

  RETURN _credential_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_create_self_asserted_credential(text, jsonb, jsonb, date, date, jsonb) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trust_create_self_asserted_credential(text, jsonb, jsonb, date, date, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION public.trust_create_self_asserted_credential(text, jsonb, jsonb, date, date, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.trust_create_self_asserted_credential(text, jsonb, jsonb, date, date, jsonb) TO service_role;


-- Admin/service-väg för statusövergångar med audit-event.
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
  _is_service boolean := current_user IN ('service_role','postgres','supabase_admin');
  _cred public.trust_credentials%ROWTYPE;
  _allowed text[];
  _event text;
  _actor text;
BEGIN
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

  _actor := CASE WHEN _is_service AND _uid IS NULL THEN 'system' ELSE 'admin' END;

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
