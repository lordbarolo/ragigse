CREATE OR REPLACE FUNCTION public.trust_project_consultant_document(_document_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_service boolean := current_user IN ('service_role','postgres','supabase_admin');
  _doc public.consultant_documents%ROWTYPE;
  _type_id uuid;
  _type_slug text;
  _credential_id uuid;
  _is_verified boolean;
BEGIN
  IF NOT _is_service THEN
    IF _uid IS NULL OR NOT public.ref_has_role(_uid, 'admin'::ref_app_role) THEN
      RAISE EXCEPTION 'Forbidden';
    END IF;
  END IF;

  SELECT * INTO _doc FROM public.consultant_documents WHERE id = _document_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Document not found';
  END IF;

  SELECT id INTO _credential_id
  FROM public.trust_credentials
  WHERE legacy_table = 'consultant_documents' AND legacy_ref_id = _doc.id;

  IF _credential_id IS NOT NULL THEN
    RETURN jsonb_build_object('credential_id', _credential_id, 'created', false);
  END IF;

  _type_slug := CASE lower(coalesce(_doc.doc_type, ''))
    WHEN 'hosp' THEN 'hosp_extract'
    WHEN 'hosp_extract' THEN 'hosp_extract'
    WHEN 'ivo' THEN 'ivo_extract'
    WHEN 'ivo_extract' THEN 'ivo_extract'
    WHEN 'legitimation' THEN 'swedish_healthcare_license'
    WHEN 'specialistbevis' THEN 'specialist_qualification'
    WHEN 'anstallningsintyg' THEN 'employment_attestation'
    ELSE 'consultant_document'
  END;

  SELECT id INTO _type_id FROM public.trust_credential_types
  WHERE slug = _type_slug AND is_active;
  IF _type_id IS NULL THEN
    RAISE EXCEPTION 'Missing credential type: %', _type_slug;
  END IF;

  _is_verified := lower(coalesce(_doc.status, '')) IN ('verified', 'approved');

  INSERT INTO public.trust_credentials (
    subject_user_id, credential_type_id, status, assurance_level,
    verified_at, source, legacy_table, legacy_ref_id, metadata
  )
  VALUES (
    _doc.user_id,
    _type_id,
    CASE WHEN _is_verified THEN 'active' ELSE 'pending' END,
    CASE WHEN _is_verified THEN 'document_verified' ELSE 'self_asserted' END,
    CASE WHEN _is_verified THEN now() ELSE NULL END,
    'import',
    'consultant_documents',
    _doc.id,
    jsonb_build_object('doc_type', _doc.doc_type, 'file_name', _doc.file_name, 'legacy_status', _doc.status)
  )
  RETURNING id INTO _credential_id;

  INSERT INTO public.trust_evidence (
    credential_id, evidence_kind, storage_bucket, storage_path, document_id, collected_by, metadata
  )
  VALUES (
    _credential_id, 'document', 'verifications', _doc.file_path, _doc.id,
    NULL, jsonb_build_object('source', 'consultant_documents')
  );

  INSERT INTO public.trust_verification_events (
    credential_id, event_type, actor_kind, actor_user_id, from_status, to_status, reason, payload
  )
  VALUES (
    _credential_id, 'created',
    CASE WHEN _is_service AND _uid IS NULL THEN 'system' ELSE 'admin' END,
    _uid, NULL,
    CASE WHEN _is_verified THEN 'active' ELSE 'pending' END,
    'legacy projection from consultant_documents',
    jsonb_build_object('legacy_document_id', _doc.id)
  );

  IF _is_verified THEN
    INSERT INTO public.trust_verification_events (
      credential_id, event_type, actor_kind, actor_user_id, from_status, to_status, reason, payload
    )
    VALUES (
      _credential_id, 'verified',
      CASE WHEN _is_service AND _uid IS NULL THEN 'system' ELSE 'admin' END,
      _uid, 'pending', 'active',
      'legacy document already admin-verified',
      jsonb_build_object('assurance_level', 'document_verified')
    );
  END IF;

  RETURN jsonb_build_object('credential_id', _credential_id, 'created', true);
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_project_consultant_document(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.trust_project_consultant_document(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.trust_project_consultant_document(uuid) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.trust_project_consultant_document(uuid) TO service_role;

COMMENT ON FUNCTION public.trust_project_consultant_document(uuid) IS 'Idempotent legacy-projektion av en consultant_documents-rad till trust_credentials + trust_evidence. Endast service_role/admin.';