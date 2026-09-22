-- Trust v1, steg 6: datadriven kravmodell + utvärdering.
-- Sanningslagret är trust_credentials/trust_claims. Kraven är data, inte kod,
-- och utvärderingen svarar met / not_met / unknown (aldrig "godkänt vid tveksamhet").

CREATE TABLE public.trust_requirement_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  owner_kind text NOT NULL CHECK (owner_kind IN ('region','agency','platform')),
  source_ref text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

REVOKE ALL ON public.trust_requirement_sets FROM anon, authenticated;
GRANT SELECT ON public.trust_requirement_sets TO authenticated;
GRANT ALL ON public.trust_requirement_sets TO service_role;
ALTER TABLE public.trust_requirement_sets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read requirement sets" ON public.trust_requirement_sets
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage requirement sets" ON public.trust_requirement_sets
  FOR ALL TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE TABLE public.trust_requirements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  set_id uuid NOT NULL REFERENCES public.trust_requirement_sets(id) ON DELETE CASCADE,
  credential_type_slug text NOT NULL,
  claim_key text,
  operator text NOT NULL CHECK (operator IN ('exists','equals','gte','lte','in','not_expired')),
  expected_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  min_assurance_level text NOT NULL DEFAULT 'evidence_submitted'
    CHECK (min_assurance_level IN ('self_asserted','evidence_submitted','document_verified','issuer_verified','authority_verified')),
  is_mandatory boolean NOT NULL DEFAULT true,
  weight numeric,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX trust_requirements_uniq
  ON public.trust_requirements (set_id, credential_type_slug, COALESCE(claim_key, ''), operator);
CREATE INDEX trust_requirements_set_idx ON public.trust_requirements (set_id);

REVOKE ALL ON public.trust_requirements FROM anon, authenticated;
GRANT SELECT ON public.trust_requirements TO authenticated;
GRANT ALL ON public.trust_requirements TO service_role;
ALTER TABLE public.trust_requirements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read requirements" ON public.trust_requirements
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage requirements" ON public.trust_requirements
  FOR ALL TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE TRIGGER trust_requirement_sets_set_updated_at BEFORE UPDATE ON public.trust_requirement_sets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trust_requirements_set_updated_at BEFORE UPDATE ON public.trust_requirements
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Utvärdering. Subjektet får bara utvärdera sig själv; admin och service_role får alla.
CREATE OR REPLACE FUNCTION public.trust_evaluate_requirements(
  _subject_user_id uuid,
  _set_slug text
)
RETURNS TABLE (
  requirement_id uuid,
  credential_type_slug text,
  claim_key text,
  operator text,
  is_mandatory boolean,
  outcome text,
  credential_id uuid
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _is_service boolean := (current_setting('request.jwt.claims', true)::jsonb ->> 'role') = 'service_role';
  _set_id uuid;
  _levels text[] := ARRAY['self_asserted','evidence_submitted','document_verified','issuer_verified','authority_verified'];
  _req record;
  _match uuid;
  _any_of_type boolean;
BEGIN
  IF NOT _is_service THEN
    IF _uid IS NULL THEN
      RAISE EXCEPTION 'Inloggning krävs';
    END IF;
    IF _uid <> _subject_user_id AND NOT public.ref_has_role(_uid, 'admin'::ref_app_role) THEN
      RAISE EXCEPTION 'Behörighet saknas';
    END IF;
  END IF;

  SELECT s.id INTO _set_id
    FROM public.trust_requirement_sets s
   WHERE s.slug = _set_slug AND s.is_active;

  IF _set_id IS NULL THEN
    RAISE EXCEPTION 'Kravlistan hittades inte';
  END IF;

  FOR _req IN
    SELECT r.* FROM public.trust_requirements r WHERE r.set_id = _set_id ORDER BY r.created_at
  LOOP
    SELECT EXISTS (
      SELECT 1 FROM public.trust_credentials c
        JOIN public.trust_credential_types t ON t.id = c.credential_type_id
       WHERE c.subject_user_id = _subject_user_id
         AND t.slug = _req.credential_type_slug
    ) INTO _any_of_type;

    SELECT c.id INTO _match
      FROM public.trust_credentials c
      JOIN public.trust_credential_types t ON t.id = c.credential_type_id
      LEFT JOIN public.trust_claims cl
             ON cl.credential_id = c.id AND cl.claim_key = _req.claim_key
     WHERE c.subject_user_id = _subject_user_id
       AND t.slug = _req.credential_type_slug
       AND c.status = 'active'
       AND c.revoked_at IS NULL
       AND (c.valid_to IS NULL OR c.valid_to >= CURRENT_DATE)
       AND (c.valid_from IS NULL OR c.valid_from <= CURRENT_DATE)
       AND array_position(_levels, c.assurance_level) >= array_position(_levels, _req.min_assurance_level)
       AND (
         CASE _req.operator
           WHEN 'exists' THEN (_req.claim_key IS NULL OR cl.id IS NOT NULL)
           WHEN 'not_expired' THEN true
           WHEN 'equals' THEN cl.id IS NOT NULL AND (
                cl.value_text = (_req.expected_json ->> 'value')
             OR (cl.value_num IS NOT NULL AND cl.value_num = NULLIF(_req.expected_json ->> 'value', '')::numeric)
             OR (cl.value_bool IS NOT NULL AND cl.value_bool = NULLIF(_req.expected_json ->> 'value', '')::boolean)
             OR (cl.value_date IS NOT NULL AND cl.value_date = NULLIF(_req.expected_json ->> 'value', '')::date)
           )
           WHEN 'gte' THEN cl.value_num IS NOT NULL
             AND cl.value_num >= NULLIF(_req.expected_json ->> 'value', '')::numeric
           WHEN 'lte' THEN cl.value_num IS NOT NULL
             AND cl.value_num <= NULLIF(_req.expected_json ->> 'value', '')::numeric
           WHEN 'in' THEN cl.value_text IS NOT NULL
             AND cl.value_text IN (
               SELECT jsonb_array_elements_text(COALESCE(_req.expected_json -> 'values', '[]'::jsonb))
             )
           ELSE false
         END
       )
     ORDER BY array_position(_levels, c.assurance_level) DESC
     LIMIT 1;

    RETURN QUERY SELECT
      _req.id,
      _req.credential_type_slug,
      _req.claim_key,
      _req.operator,
      _req.is_mandatory,
      CASE
        WHEN _match IS NOT NULL THEN 'met'
        WHEN _any_of_type THEN 'not_met'
        ELSE 'unknown'
      END,
      _match;

    _match := NULL;
  END LOOP;
END;
$function$;

REVOKE ALL ON FUNCTION public.trust_evaluate_requirements(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.trust_evaluate_requirements(uuid, text) TO authenticated, service_role;