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
    _ref.consultant_id, _type_id, 'pending', 'self_asserted',
    'import', 'consultant_references', _ref.id,
    jsonb_build_object('legacy_created_at', _ref.created_at)
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

REVOKE ALL ON FUNCTION public.trust_project_consultant_reference(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trust_project_consultant_reference(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.trust_project_consultant_reference(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trust_project_consultant_reference(uuid) TO service_role;

COMMENT ON FUNCTION public.trust_project_consultant_reference(uuid) IS 'Idempotent legacy-projektion av en consultant_references-rad till trust_credentials + trust_claims + trust_evidence. Endast service_role/admin.';

CREATE OR REPLACE FUNCTION public.trust_backfill_legacy(_limit integer DEFAULT 500)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_service boolean := current_user IN ('service_role','postgres','supabase_admin');
  _batch integer := LEAST(GREATEST(coalesce(_limit, 500), 1), 2000);
  _rec record;
  _res jsonb;
  _docs_created integer := 0;
  _docs_skipped integer := 0;
  _docs_failed integer := 0;
  _refs_created integer := 0;
  _refs_skipped integer := 0;
  _refs_failed integer := 0;
  _errors jsonb := '[]'::jsonb;
BEGIN
  IF NOT _is_service THEN
    IF _uid IS NULL OR NOT public.ref_has_role(_uid, 'admin'::ref_app_role) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  FOR _rec IN
    SELECT d.id
    FROM public.consultant_documents d
    WHERE d.user_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.trust_credentials c
        WHERE c.legacy_table = 'consultant_documents' AND c.legacy_ref_id = d.id
      )
    ORDER BY d.created_at
    LIMIT _batch
  LOOP
    BEGIN
      _res := public.trust_project_consultant_document(_rec.id);
      IF (_res->>'created')::boolean THEN
        _docs_created := _docs_created + 1;
      ELSE
        _docs_skipped := _docs_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      _docs_failed := _docs_failed + 1;
      _errors := _errors || jsonb_build_object('table', 'consultant_documents', 'id', _rec.id, 'error', SQLERRM);
    END;
  END LOOP;

  FOR _rec IN
    SELECT r.id
    FROM public.consultant_references r
    WHERE r.consultant_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM public.trust_credentials c
        WHERE c.legacy_table = 'consultant_references' AND c.legacy_ref_id = r.id
      )
    ORDER BY r.created_at
    LIMIT _batch
  LOOP
    BEGIN
      _res := public.trust_project_consultant_reference(_rec.id);
      IF (_res->>'created')::boolean THEN
        _refs_created := _refs_created + 1;
      ELSE
        _refs_skipped := _refs_skipped + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      _refs_failed := _refs_failed + 1;
      _errors := _errors || jsonb_build_object('table', 'consultant_references', 'id', _rec.id, 'error', SQLERRM);
    END;
  END LOOP;

  RETURN jsonb_build_object(
    'batch_limit', _batch,
    'documents', jsonb_build_object('created', _docs_created, 'skipped', _docs_skipped, 'failed', _docs_failed),
    'references', jsonb_build_object('created', _refs_created, 'skipped', _refs_skipped, 'failed', _refs_failed),
    'remaining_documents', (
      SELECT count(*) FROM public.consultant_documents d
      WHERE NOT EXISTS (SELECT 1 FROM public.trust_credentials c WHERE c.legacy_table='consultant_documents' AND c.legacy_ref_id=d.id)
    ),
    'remaining_references', (
      SELECT count(*) FROM public.consultant_references r
      WHERE NOT EXISTS (SELECT 1 FROM public.trust_credentials c WHERE c.legacy_table='consultant_references' AND c.legacy_ref_id=r.id)
    ),
    'errors', _errors
  );
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_backfill_legacy(integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trust_backfill_legacy(integer) FROM anon;
REVOKE ALL ON FUNCTION public.trust_backfill_legacy(integer) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trust_backfill_legacy(integer) TO service_role;

COMMENT ON FUNCTION public.trust_backfill_legacy(integer) IS 'Batch-backfill av legacy consultant_documents + consultant_references till trust-karnan. Idempotent, rapporterar created/skipped/failed. Endast service_role/admin.';
