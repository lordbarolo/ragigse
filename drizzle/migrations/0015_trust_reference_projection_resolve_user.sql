CREATE OR REPLACE FUNCTION public.trust_project_consultant_reference(_reference_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_service boolean := current_user IN ('service_role','postgres','supabase_admin');
  _ref public.consultant_references%ROWTYPE;
  _subject_user_id uuid;
  _type_id uuid;
  _credential_id uuid;
  _actor text;
BEGIN
  IF NOT _is_service THEN
    IF _uid IS NULL OR NOT public.ref_has_role(_uid, 'admin'::ref_app_role) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT * INTO _ref FROM public.consultant_references WHERE id = _reference_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found';
  END IF;

  SELECT p.user_id INTO _subject_user_id
  FROM public.consultant_profiles p
  WHERE p.id = _ref.consultant_id;

  IF _subject_user_id IS NULL THEN
    RAISE EXCEPTION 'Reference % has no resolvable subject user', _ref.id;
  END IF;

  SELECT id INTO _credential_id
  FROM public.trust_credentials
  WHERE legacy_table = 'consultant_references' AND legacy_ref_id = _ref.id;

  IF _credential_id IS NOT NULL THEN
    RETURN jsonb_build_object('credential_id', _credential_id, 'created', false);
  END IF;

  SELECT id INTO _type_id FROM public.trust_credential_types
  WHERE slug = 'professional_reference' AND is_active;
  IF _type_id IS NULL THEN
    RAISE EXCEPTION 'Missing credential type: professional_reference';
  END IF;

  _actor := CASE WHEN _is_service AND _uid IS NULL THEN 'system' ELSE 'admin' END;

  INSERT INTO public.trust_credentials (
    subject_user_id, credential_type_id, status, assurance_level,
    source, legacy_table, legacy_ref_id, metadata
  )
  VALUES (
    _subject_user_id, _type_id, 'pending', 'self_asserted',
    'import', 'consultant_references', _ref.id,
    jsonb_build_object('legacy_created_at', _ref.created_at, 'legacy_consultant_id', _ref.consultant_id)
  )
  RETURNING id INTO _credential_id;

  INSERT INTO public.trust_claims (credential_id, claim_key, value_text)
  SELECT _credential_id, k, v
  FROM (VALUES
    ('reference_name', _ref.reference_name),
    ('reference_role', _ref.reference_role),
    ('reference_org', _ref.reference_org),
    ('relationship', _ref.relationship)
  ) AS t(k, v)
  WHERE v IS NOT NULL AND btrim(v) <> '';

  INSERT INTO public.trust_evidence (
    credential_id, evidence_kind, collected_by, metadata
  )
  VALUES (
    _credential_id, 'manual', NULL,
    jsonb_build_object('source', 'consultant_references', 'legacy_reference_id', _ref.id)
  );

  INSERT INTO public.trust_verification_events (
    credential_id, event_type, actor_kind, actor_user_id, from_status, to_status, reason, payload
  )
  VALUES (
    _credential_id, 'created', _actor, _uid, NULL, 'pending',
    'legacy projection from consultant_references',
    jsonb_build_object('legacy_reference_id', _ref.id)
  );

  RETURN jsonb_build_object('credential_id', _credential_id, 'created', true);
END;
$function$;
