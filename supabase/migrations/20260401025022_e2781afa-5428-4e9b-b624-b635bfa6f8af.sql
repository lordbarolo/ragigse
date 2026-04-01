
CREATE OR REPLACE FUNCTION public.ref_verify_imported_reference(
  _token text,
  _giver_id uuid,
  _giver_name text,
  _comment text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ref_id uuid;
  _giver_domain text;
  _is_verified_domain boolean := false;
BEGIN
  SELECT id INTO _ref_id
  FROM public.ref_references
  WHERE invite_token = _token AND status = 'pending' AND is_verification_only = true;

  IF _ref_id IS NULL THEN
    RAISE EXCEPTION 'Verification request not found or already completed';
  END IF;

  -- Extract domain from giver email
  SELECT split_part(r.giver_email, '@', 2) INTO _giver_domain
  FROM public.ref_references r WHERE r.id = _ref_id;

  SELECT EXISTS(
    SELECT 1 FROM public.ref_verified_domains WHERE domain = _giver_domain
  ) INTO _is_verified_domain;

  UPDATE public.ref_references
  SET
    giver_id = _giver_id,
    giver_name = _giver_name,
    status = 'active',
    confirmed_at = now(),
    verification_level = CASE WHEN _is_verified_domain THEN 'domain' ELSE 'email' END,
    last_confirmed_at = now(),
    verified_at = now(),
    expires_at = now() + interval '6 months',
    attachable = true
  WHERE id = _ref_id;

  -- Log verification
  INSERT INTO public.ref_reference_verifications (reference_id, verification_type, status, verified_at)
  VALUES (_ref_id, 'document_verification', 'verified', now());

  -- Add comment if provided
  IF _comment IS NOT NULL AND _comment <> '' THEN
    INSERT INTO public.ref_verification_comments (reference_id, author_id, author_name, comment)
    VALUES (_ref_id, _giver_id, _giver_name, _comment);
  END IF;
END;
$$;
