-- ============================================================
-- Trust Core v1 — generisk trust-kärna (additiv, inga ändringar i befintliga tabeller)
-- ============================================================

-- A) trust_issuers ------------------------------------------------------------
CREATE TABLE public.trust_issuers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  issuer_kind text NOT NULL CHECK (issuer_kind IN ('authority','employer','education','platform','individual','self')),
  country char(2) DEFAULT 'SE',
  verified_domain text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trust_issuers TO authenticated;
GRANT ALL ON public.trust_issuers TO service_role;
ALTER TABLE public.trust_issuers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read issuers" ON public.trust_issuers
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage issuers" ON public.trust_issuers
  FOR ALL TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- B) trust_credential_types ---------------------------------------------------
CREATE TABLE public.trust_credential_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  display_name text NOT NULL,
  category text NOT NULL CHECK (category IN ('identity','license','specialty','certification','employment','reference','document')),
  requires_expiry boolean NOT NULL DEFAULT false,
  default_validity_months integer,
  expected_issuer_kind text,
  schema jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.trust_credential_types TO authenticated;
GRANT ALL ON public.trust_credential_types TO service_role;
ALTER TABLE public.trust_credential_types ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated read credential types" ON public.trust_credential_types
  FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage credential types" ON public.trust_credential_types
  FOR ALL TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- C) trust_credentials --------------------------------------------------------
CREATE TABLE public.trust_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL,
  credential_type_id uuid NOT NULL REFERENCES public.trust_credential_types(id) ON DELETE RESTRICT,
  issuer_id uuid REFERENCES public.trust_issuers(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','active','expired','revoked','rejected','superseded')),
  assurance_level text NOT NULL DEFAULT 'self_asserted' CHECK (assurance_level IN ('self_asserted','evidence_submitted','document_verified','issuer_verified','authority_verified')),
  valid_from date,
  valid_to date,
  verified_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  source text NOT NULL CHECK (source IN ('user','admin','import','legacy','system','agent')),
  legacy_table text,
  legacy_ref_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trust_credentials_subject_status_idx ON public.trust_credentials (subject_user_id, status);
CREATE INDEX trust_credentials_type_idx ON public.trust_credentials (credential_type_id);
CREATE INDEX trust_credentials_valid_to_idx ON public.trust_credentials (valid_to);
CREATE UNIQUE INDEX trust_credentials_legacy_uniq ON public.trust_credentials (legacy_table, legacy_ref_id)
  WHERE legacy_ref_id IS NOT NULL;

GRANT SELECT, INSERT, UPDATE ON public.trust_credentials TO authenticated;
GRANT ALL ON public.trust_credentials TO service_role;
ALTER TABLE public.trust_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subject reads own credentials" ON public.trust_credentials
  FOR SELECT TO authenticated USING (subject_user_id = auth.uid());
CREATE POLICY "Admins read all credentials" ON public.trust_credentials
  FOR SELECT TO authenticated USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));
CREATE POLICY "Subject creates own pending self-asserted credential" ON public.trust_credentials
  FOR INSERT TO authenticated
  WITH CHECK (
    subject_user_id = auth.uid()
    AND status = 'pending'
    AND assurance_level = 'self_asserted'
    AND source = 'user'
    AND verified_at IS NULL
    AND revoked_at IS NULL
    AND revoked_reason IS NULL
    AND legacy_table IS NULL
    AND legacy_ref_id IS NULL
  );
CREATE POLICY "Subject updates own credential metadata" ON public.trust_credentials
  FOR UPDATE TO authenticated
  USING (subject_user_id = auth.uid())
  WITH CHECK (subject_user_id = auth.uid());
-- Ingen DELETE-policy: klienter kan aldrig radera credentials (revoke sker server-side).

-- Skyddar derived/verifieringsfält mot klientskrivning.
CREATE OR REPLACE FUNCTION public.guard_trust_credentials_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND public.ref_has_role(auth.uid(), 'admin'::ref_app_role) THEN
    RETURN NEW;
  END IF;

  NEW.subject_user_id := OLD.subject_user_id;
  NEW.credential_type_id := OLD.credential_type_id;
  NEW.issuer_id := OLD.issuer_id;
  NEW.status := OLD.status;
  NEW.assurance_level := OLD.assurance_level;
  NEW.verified_at := OLD.verified_at;
  NEW.revoked_at := OLD.revoked_at;
  NEW.revoked_reason := OLD.revoked_reason;
  NEW.source := OLD.source;
  NEW.legacy_table := OLD.legacy_table;
  NEW.legacy_ref_id := OLD.legacy_ref_id;
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_trust_credentials_fields
BEFORE UPDATE ON public.trust_credentials
FOR EACH ROW EXECUTE FUNCTION public.guard_trust_credentials_fields();

-- D) trust_claims -------------------------------------------------------------
CREATE TABLE public.trust_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES public.trust_credentials(id) ON DELETE CASCADE,
  claim_key text NOT NULL,
  value_text text,
  value_num numeric,
  value_date date,
  value_bool boolean,
  value_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trust_claims_exactly_one_value CHECK (
    (CASE WHEN value_text IS NULL THEN 0 ELSE 1 END)
    + (CASE WHEN value_num IS NULL THEN 0 ELSE 1 END)
    + (CASE WHEN value_date IS NULL THEN 0 ELSE 1 END)
    + (CASE WHEN value_bool IS NULL THEN 0 ELSE 1 END)
    + (CASE WHEN value_json IS NULL THEN 0 ELSE 1 END) = 1
  ),
  CONSTRAINT trust_claims_unique_key UNIQUE (credential_id, claim_key)
);

CREATE INDEX trust_claims_key_text_idx ON public.trust_claims (claim_key, value_text);

GRANT SELECT, INSERT, UPDATE ON public.trust_claims TO authenticated;
GRANT ALL ON public.trust_claims TO service_role;
ALTER TABLE public.trust_claims ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subject reads own claims" ON public.trust_claims
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trust_credentials c
                 WHERE c.id = trust_claims.credential_id AND c.subject_user_id = auth.uid()));
CREATE POLICY "Admins read all claims" ON public.trust_claims
  FOR SELECT TO authenticated USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));
CREATE POLICY "Subject adds claims to own pending credential" ON public.trust_claims
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trust_credentials c
                      WHERE c.id = trust_claims.credential_id
                        AND c.subject_user_id = auth.uid()
                        AND c.status = 'pending'));
CREATE POLICY "Subject updates claims on own pending credential" ON public.trust_claims
  FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trust_credentials c
                 WHERE c.id = trust_claims.credential_id
                   AND c.subject_user_id = auth.uid()
                   AND c.status = 'pending'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.trust_credentials c
                      WHERE c.id = trust_claims.credential_id
                        AND c.subject_user_id = auth.uid()
                        AND c.status = 'pending'));

-- E) trust_evidence -----------------------------------------------------------
CREATE TABLE public.trust_evidence (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES public.trust_credentials(id) ON DELETE CASCADE,
  evidence_kind text NOT NULL CHECK (evidence_kind IN ('document','email_domain','signature','api_lookup','attestation','manual')),
  storage_bucket text,
  storage_path text,
  document_id uuid,
  sha256 text,
  collected_at timestamptz NOT NULL DEFAULT now(),
  collected_by uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trust_evidence_credential_idx ON public.trust_evidence (credential_id);

GRANT SELECT, INSERT ON public.trust_evidence TO authenticated;
GRANT ALL ON public.trust_evidence TO service_role;
ALTER TABLE public.trust_evidence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subject reads own evidence" ON public.trust_evidence
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trust_credentials c
                 WHERE c.id = trust_evidence.credential_id AND c.subject_user_id = auth.uid()));
CREATE POLICY "Admins read all evidence" ON public.trust_evidence
  FOR SELECT TO authenticated USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));
CREATE POLICY "Subject adds evidence to own pending credential" ON public.trust_evidence
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.trust_credentials c
                      WHERE c.id = trust_evidence.credential_id
                        AND c.subject_user_id = auth.uid()
                        AND c.status = 'pending'));

-- Klienten får aldrig sätta sha256 eller collected_by.
CREATE OR REPLACE FUNCTION public.guard_trust_evidence_fields()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  NEW.sha256 := NULL;
  NEW.collected_by := auth.uid();
  RETURN NEW;
END;
$function$;

CREATE TRIGGER guard_trust_evidence_fields
BEFORE INSERT ON public.trust_evidence
FOR EACH ROW EXECUTE FUNCTION public.guard_trust_evidence_fields();

-- F) trust_verification_events (append-only) ----------------------------------
CREATE TABLE public.trust_verification_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  credential_id uuid NOT NULL REFERENCES public.trust_credentials(id) ON DELETE CASCADE,
  event_type text NOT NULL CHECK (event_type IN ('created','submitted','attested','reconfirmed','verified','rejected','expired','revoked','superseded')),
  actor_kind text NOT NULL CHECK (actor_kind IN ('subject','admin','issuer','system','agent')),
  actor_user_id uuid,
  actor_api_key_id uuid REFERENCES public.agent_api_keys(id) ON DELETE SET NULL,
  from_status text,
  to_status text,
  reason text,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX trust_verification_events_credential_idx
  ON public.trust_verification_events (credential_id, occurred_at DESC);

GRANT SELECT ON public.trust_verification_events TO authenticated;
GRANT SELECT, INSERT ON public.trust_verification_events TO service_role;
ALTER TABLE public.trust_verification_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Subject reads own events" ON public.trust_verification_events
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.trust_credentials c
                 WHERE c.id = trust_verification_events.credential_id
                   AND c.subject_user_id = auth.uid()));
CREATE POLICY "Admins read all events" ON public.trust_verification_events
  FOR SELECT TO authenticated USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));
-- Ingen INSERT/UPDATE/DELETE-policy: endast service_role och SECURITY DEFINER-funktioner skriver.

-- Append-only i databasen: UPDATE/DELETE blockeras för alla roller.
CREATE OR REPLACE FUNCTION public.trust_events_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'trust_verification_events is append-only';
END;
$function$;

CREATE TRIGGER trust_events_no_update
BEFORE UPDATE ON public.trust_verification_events
FOR EACH ROW EXECUTE FUNCTION public.trust_events_append_only();

CREATE TRIGGER trust_events_no_delete
BEFORE DELETE ON public.trust_verification_events
FOR EACH ROW EXECUTE FUNCTION public.trust_events_append_only();

-- updated_at-underhåll för de nya tabellerna
CREATE TRIGGER trust_issuers_set_updated_at BEFORE UPDATE ON public.trust_issuers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trust_credential_types_set_updated_at BEFORE UPDATE ON public.trust_credential_types
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trust_claims_set_updated_at BEFORE UPDATE ON public.trust_claims
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
