CREATE OR REPLACE FUNCTION public.revoke_document_share(_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _uid uuid := auth.uid();
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  UPDATE public.document_shares
    SET expires_at = now()
    WHERE id = _id AND user_id = _uid AND expires_at > now();
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Share not found, not owned by you, or already expired';
  END IF;
END;
$$;