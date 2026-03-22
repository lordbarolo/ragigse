
-- 1. Add credentialing columns to ref_references
ALTER TABLE public.ref_references
  ADD COLUMN IF NOT EXISTS verification_level text NOT NULL DEFAULT 'submitted',
  ADD COLUMN IF NOT EXISTS last_confirmed_at timestamptz,
  ADD COLUMN IF NOT EXISTS verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS attachable boolean NOT NULL DEFAULT false;

-- Backfill: references with status='active' and confirmed_at set get 'email' level + attachable
UPDATE public.ref_references
SET verification_level = 'email',
    last_confirmed_at = confirmed_at,
    verified_at = confirmed_at,
    expires_at = confirmed_at + interval '6 months',
    attachable = CASE WHEN confirmed_at + interval '6 months' > now() THEN true ELSE false END
WHERE status = 'active' AND confirmed_at IS NOT NULL;

-- 2. Reference verifications (audit trail for each verification step)
CREATE TABLE public.ref_reference_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.ref_references(id) ON DELETE CASCADE,
  verification_type text NOT NULL, -- 'email', 'domain', 'bankid', 'ping_confirmed'
  status text NOT NULL DEFAULT 'pending', -- 'pending', 'verified', 'failed'
  payload jsonb,
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_reference_verifications ENABLE ROW LEVEL SECURITY;

-- Owner of the reference can read verifications
CREATE POLICY "Reference owner can read verifications"
  ON public.ref_reference_verifications FOR SELECT
  TO authenticated
  USING (reference_id IN (
    SELECT id FROM public.ref_references WHERE individual_id = auth.uid()
  ));

-- Service role for inserts (edge functions handle verification)
CREATE POLICY "Service role manages verifications"
  ON public.ref_reference_verifications FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 3. Reference artifacts (immutable proof tokens for attached references)
CREATE TABLE public.ref_reference_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id uuid NOT NULL REFERENCES public.ref_references(id) ON DELETE CASCADE,
  artifact_type text NOT NULL DEFAULT 'compcare_attach', -- 'compcare_attach', 'pdf_snapshot'
  status text NOT NULL DEFAULT 'active', -- 'active', 'revoked', 'expired'
  token_hash text UNIQUE,
  document_sha256 text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz
);

ALTER TABLE public.ref_reference_artifacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Reference owner can read artifacts"
  ON public.ref_reference_artifacts FOR SELECT
  TO authenticated
  USING (reference_id IN (
    SELECT id FROM public.ref_references WHERE individual_id = auth.uid()
  ));

CREATE POLICY "Service role manages artifacts"
  ON public.ref_reference_artifacts FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 4. Application references (join table: which references are attached to which application)
CREATE TABLE public.ref_application_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  application_id uuid NOT NULL, -- links to external application/verify proof
  reference_id uuid NOT NULL REFERENCES public.ref_references(id) ON DELETE CASCADE,
  attached_by_user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(application_id, reference_id)
);

ALTER TABLE public.ref_application_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own attached references"
  ON public.ref_application_references FOR SELECT
  TO authenticated
  USING (attached_by_user_id = auth.uid());

CREATE POLICY "Users can attach own references"
  ON public.ref_application_references FOR INSERT
  TO authenticated
  WITH CHECK (attached_by_user_id = auth.uid());

CREATE POLICY "Service role manages application references"
  ON public.ref_application_references FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- 5. Function to compute freshness and update attachable status
CREATE OR REPLACE FUNCTION public.ref_refresh_attachability(p_reference_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  UPDATE public.ref_references
  SET attachable = CASE
    WHEN status = 'active'
      AND last_confirmed_at IS NOT NULL
      AND last_confirmed_at + interval '6 months' > now()
    THEN true
    ELSE false
  END
  WHERE id = p_reference_id;
END;
$$;

-- 6. Update ref_respond_to_ping to set credentialing fields on confirm
CREATE OR REPLACE FUNCTION public.ref_respond_to_ping(_token text, _status ref_ping_status)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _ref_id uuid;
BEGIN
  -- Get reference_id before update
  SELECT reference_id INTO _ref_id
  FROM public.ref_pings
  WHERE response_token = _token AND status = 'sent';

  IF _ref_id IS NULL THEN
    RAISE EXCEPTION 'Ping not found or already responded to';
  END IF;

  UPDATE public.ref_pings
  SET status = _status, responded_at = now(),
      confirmed_until = CASE WHEN _status = 'confirmed' THEN now() + interval '12 months' ELSE NULL END
  WHERE response_token = _token AND status = 'sent';

  -- Update reference credentialing fields on confirm
  IF _status = 'confirmed' THEN
    UPDATE public.ref_references
    SET verification_level = 'ping_confirmed',
        last_confirmed_at = now(),
        verified_at = now(),
        expires_at = now() + interval '6 months',
        attachable = true
    WHERE id = _ref_id;

    -- Log verification event
    INSERT INTO public.ref_reference_verifications (reference_id, verification_type, status, verified_at)
    VALUES (_ref_id, 'ping_confirmed', 'verified', now());
  ELSE
    -- Denied: mark as not attachable
    UPDATE public.ref_references
    SET attachable = false
    WHERE id = _ref_id;
  END IF;
END;
$$;

-- 7. Update ref_submit_reference to set initial verification_level
CREATE OR REPLACE FUNCTION public.ref_submit_reference(
  _token text, _giver_id uuid, _giver_name text,
  _reference_text text, _competencies jsonb, _recommendation_score integer
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
  -- Get the reference id
  SELECT id INTO _ref_id
  FROM public.ref_references
  WHERE invite_token = _token AND status = 'pending';

  IF _ref_id IS NULL THEN
    RAISE EXCEPTION 'Reference not found or already submitted';
  END IF;

  -- Extract domain from giver email
  SELECT split_part(r.giver_email, '@', 2) INTO _giver_domain
  FROM public.ref_references r WHERE r.id = _ref_id;

  -- Check if domain is verified
  SELECT EXISTS(
    SELECT 1 FROM public.ref_verified_domains WHERE domain = _giver_domain
  ) INTO _is_verified_domain;

  UPDATE public.ref_references
  SET
    giver_id = _giver_id,
    giver_name = _giver_name,
    reference_text = _reference_text,
    competencies = _competencies,
    recommendation_score = _recommendation_score,
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
  VALUES (_ref_id, CASE WHEN _is_verified_domain THEN 'domain' ELSE 'email' END, 'verified', now());
END;
$$;
