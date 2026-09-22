-- Dual-read: strukturerad, granskningsbar avvikelselogg mellan legacy och trust_*.
-- Additivt och reversibelt. Ingen klientåtkomst utöver admin-SELECT; loggen är
-- append-only och innehåller aldrig dokumentinnehåll eller kontaktuppgifter.

CREATE TABLE public.trust_dualread_discrepancies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_user_id uuid NOT NULL,
  legacy_table text NOT NULL,
  legacy_ref_id uuid,
  credential_id uuid,
  discrepancy_kind text NOT NULL CHECK (discrepancy_kind IN (
    'missing_trust', 'missing_legacy', 'status_mismatch', 'assurance_mismatch', 'type_mismatch'
  )),
  expected_value text,
  actual_value text,
  detail_hash text NOT NULL,
  observed_at timestamptz NOT NULL DEFAULT now()
);

-- Idempotens: samma avvikelse för samma rad loggas bara en gång.
CREATE UNIQUE INDEX trust_dualread_discrepancies_unique
  ON public.trust_dualread_discrepancies (
    subject_user_id, legacy_table, coalesce(legacy_ref_id, '00000000-0000-0000-0000-000000000000'::uuid),
    discrepancy_kind, detail_hash
  );

CREATE INDEX trust_dualread_discrepancies_observed_at
  ON public.trust_dualread_discrepancies (observed_at DESC);

REVOKE ALL ON public.trust_dualread_discrepancies FROM anon, authenticated;
GRANT SELECT ON public.trust_dualread_discrepancies TO authenticated;
REVOKE ALL ON public.trust_dualread_discrepancies FROM service_role;
GRANT SELECT, INSERT ON public.trust_dualread_discrepancies TO service_role;

ALTER TABLE public.trust_dualread_discrepancies ENABLE ROW LEVEL SECURITY;

-- Loggen får inte bli en väg runt RLS: endast admin läser den.
CREATE POLICY "Admins read dualread discrepancies"
  ON public.trust_dualread_discrepancies
  FOR SELECT TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- Append-only, samma mönster som trust_verification_events.
CREATE OR REPLACE FUNCTION public.trust_dualread_append_only()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  RAISE EXCEPTION 'trust_dualread_discrepancies is append-only';
END;
$$;

CREATE TRIGGER trust_dualread_discrepancies_append_only
  BEFORE UPDATE OR DELETE ON public.trust_dualread_discrepancies
  FOR EACH ROW EXECUTE FUNCTION public.trust_dualread_append_only();

COMMENT ON TABLE public.trust_dualread_discrepancies IS
  'Append-only dual-read-avvikelser mellan legacy-källor och trust_*. Legacy är fortsatt primär källa. Endast admin läser; skrivning endast service_role.';