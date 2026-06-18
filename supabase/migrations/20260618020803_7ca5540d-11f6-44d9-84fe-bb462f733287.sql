-- Tighten get_document_share_by_token: never return raw storage path from DB
CREATE OR REPLACE FUNCTION public.get_document_share_by_token(_token text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _share public.document_shares%ROWTYPE;
  _docs jsonb;
  _owner_name text;
BEGIN
  SELECT * INTO _share FROM public.document_shares WHERE token = _token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF _share.expires_at < now() THEN
    RETURN jsonb_build_object('expired', true, 'expires_at', _share.expires_at);
  END IF;

  UPDATE public.document_shares
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE id = _share.id;

  -- NOTE: file_url (storage path) intentionally excluded from the public payload.
  -- Edge function get-shared-documents must look up the path via service_role and
  -- return only short-lived signed URLs to the recipient.
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', cd.id,
    'file_name', cd.file_name,
    'document_type', cd.document_type,
    'uploaded_at', cd.uploaded_at
  ) ORDER BY cd.uploaded_at DESC), '[]'::jsonb)
  INTO _docs
  FROM public.consultant_documents cd
  WHERE cd.id = ANY(_share.document_ids);

  SELECT COALESCE(p.full_name, '') INTO _owner_name
  FROM public.ref_profiles p WHERE p.id = _share.user_id;

  RETURN jsonb_build_object(
    'expired', false,
    'expires_at', _share.expires_at,
    'recipient_label', _share.recipient_label,
    'owner_name', _owner_name,
    'documents', _docs
  );
END;
$function$;

-- Constrain document_type values at the DB level
ALTER TABLE public.consultant_documents
  DROP CONSTRAINT IF EXISTS consultant_documents_document_type_check;

ALTER TABLE public.consultant_documents
  ADD CONSTRAINT consultant_documents_document_type_check
  CHECK (document_type IN (
    'cv','certificate','license','contract','ivo','hosp',
    'samarbetsintyg','reference','diploma','insurance','other'
  ));