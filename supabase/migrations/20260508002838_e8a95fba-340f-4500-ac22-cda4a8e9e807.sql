
CREATE TABLE public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_ids uuid[] NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL,
  recipient_label text,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_document_shares_user ON public.document_shares(user_id);
CREATE INDEX idx_document_shares_token ON public.document_shares(token);

ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner reads own shares"
  ON public.document_shares FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Owner inserts own shares"
  ON public.document_shares FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Owner updates own shares"
  ON public.document_shares FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Owner deletes own shares"
  ON public.document_shares FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.create_document_share(
  _document_ids uuid[],
  _expires_in_hours integer,
  _recipient_label text DEFAULT NULL
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
  IF _expires_in_hours IS NULL OR _expires_in_hours < 1 OR _expires_in_hours > 24*365 THEN
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
  _expires := now() + (_expires_in_hours || ' hours')::interval;

  INSERT INTO public.document_shares (user_id, document_ids, token, expires_at, recipient_label)
  VALUES (_uid, _document_ids, _token, _expires, _recipient_label)
  RETURNING document_shares.id INTO _new_id;

  RETURN QUERY SELECT _new_id, _token, _expires;
END;
$$;

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
  IF _share.expires_at < now() THEN
    RETURN jsonb_build_object('expired', true, 'expires_at', _share.expires_at);
  END IF;

  UPDATE public.document_shares
  SET view_count = view_count + 1, last_viewed_at = now()
  WHERE id = _share.id;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', cd.id,
    'file_name', cd.file_name,
    'document_type', cd.document_type,
    'file_url', cd.file_url,
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
$$;
