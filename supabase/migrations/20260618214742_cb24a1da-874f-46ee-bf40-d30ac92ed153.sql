-- 1. Add recipient_email + allow null expiry
ALTER TABLE public.document_shares
  ADD COLUMN IF NOT EXISTS recipient_email text;

ALTER TABLE public.document_shares
  ALTER COLUMN expires_at DROP NOT NULL;

-- 2. Recreate create_document_share with recipient_email + optional expiry
CREATE OR REPLACE FUNCTION public.create_document_share(
  _document_ids uuid[],
  _expires_in_hours integer,
  _recipient_label text DEFAULT NULL,
  _recipient_email text DEFAULT NULL
)
RETURNS TABLE(id uuid, token text, expires_at timestamptz)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cp_id uuid;
  _valid_count int;
  _token text;
  _expires timestamptz;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF _document_ids IS NULL OR array_length(_document_ids, 1) IS NULL THEN
    RAISE EXCEPTION 'No documents selected';
  END IF;

  -- Expiry is now optional: NULL or 0 means "no expiry"
  IF _expires_in_hours IS NOT NULL AND (_expires_in_hours < 0 OR _expires_in_hours > 24*365*10) THEN
    RAISE EXCEPTION 'Invalid expiry duration';
  END IF;

  SELECT cp.id INTO _cp_id FROM public.consultant_profiles cp WHERE cp.user_id = _uid;
  IF _cp_id IS NULL THEN
    RAISE EXCEPTION 'No consultant profile';
  END IF;

  SELECT COUNT(*) INTO _valid_count
  FROM public.consultant_documents
  WHERE id = ANY(_document_ids) AND consultant_id = _cp_id;
  IF _valid_count <> array_length(_document_ids, 1) THEN
    RAISE EXCEPTION 'One or more documents do not belong to this user';
  END IF;

  _token := encode(gen_random_bytes(24), 'hex');
  IF _expires_in_hours IS NULL OR _expires_in_hours = 0 THEN
    _expires := NULL;
  ELSE
    _expires := now() + (_expires_in_hours || ' hours')::interval;
  END IF;

  INSERT INTO public.document_shares (user_id, document_ids, token, expires_at, recipient_label, recipient_email)
  VALUES (_uid, _document_ids, _token, _expires, _recipient_label, NULLIF(trim(lower(coalesce(_recipient_email,''))),''))
  RETURNING document_shares.id INTO _new_id;

  RETURN QUERY SELECT _new_id, _token, _expires;
END;
$$;

-- 3. get_document_share_by_token now treats NULL expires_at as "never expires" + returns recipient_email
CREATE OR REPLACE FUNCTION public.get_document_share_by_token(_token text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _share public.document_shares%ROWTYPE;
  _docs jsonb;
  _owner_name text;
BEGIN
  SELECT * INTO _share FROM public.document_shares WHERE token = _token;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;
  IF _share.expires_at IS NOT NULL AND _share.expires_at < now() THEN
    RETURN jsonb_build_object('expired', true, 'expires_at', _share.expires_at);
  END IF;

  UPDATE public.document_shares
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE id = _share.id;

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
    'recipient_email', _share.recipient_email,
    'owner_name', _owner_name,
    'documents', _docs
  );
END;
$$;

-- 4. list_my_document_shares: include recipient_email + handle null expiry in expired flag
CREATE OR REPLACE FUNCTION public.list_my_document_shares()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
        _result jsonb;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;

  SELECT COALESCE(jsonb_agg(row_to_jsonb(s) ORDER BY created_at DESC), '[]'::jsonb)
  INTO _result
  FROM (
    SELECT
      ds.id,
      ds.recipient_label,
      ds.recipient_email,
      ds.created_at,
      ds.expires_at,
      ds.view_count,
      ds.last_viewed_at,
      array_length(ds.document_ids, 1) AS document_count,
      (ds.expires_at IS NOT NULL AND ds.expires_at < now()) AS expired,
      COALESCE((
        SELECT jsonb_agg(jsonb_build_object(
          'viewed_at', v.viewed_at,
          'ip_address', v.ip_address,
          'user_agent', v.user_agent,
          'document_id', v.document_id,
          'action', v.action
        ) ORDER BY v.viewed_at DESC)
        FROM public.document_share_views v
        WHERE v.share_id = ds.id
      ), '[]'::jsonb) AS views
    FROM public.document_shares ds
    WHERE ds.user_id = _uid
  ) s;

  RETURN _result;
END;
$$;

-- 5. revoke_document_share: handle null expires_at (treat as active)
CREATE OR REPLACE FUNCTION public.revoke_document_share(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.document_shares
    SET expires_at = now()
    WHERE id = _id
      AND user_id = _uid
      AND (expires_at IS NULL OR expires_at > now());
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found, not owned by you, or already expired';
  END IF;
END;
$$;