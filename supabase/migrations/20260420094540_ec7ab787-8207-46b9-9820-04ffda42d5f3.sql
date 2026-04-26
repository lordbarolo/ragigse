-- =====================================================
-- Helper: update_updated_at_column (skapas om saknas)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- =====================================================
-- AVROP INTELLIGENCE — Long-term market data
-- =====================================================
CREATE TABLE public.avrop_intelligence (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID,
  agency_org_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
  representation_request_id UUID REFERENCES public.ref_representation_requests(id) ON DELETE SET NULL,

  region TEXT,
  unit TEXT,
  competence TEXT,
  period_start DATE,
  period_end DATE,
  response_deadline DATE,
  assignment_id TEXT,

  avrop_received_at DATE,
  awarded_at DATE,
  source TEXT,
  customer_type TEXT,
  buyer_name TEXT,

  price_type TEXT,
  price_min NUMERIC,
  price_max NUMERIC,
  price_unit TEXT,
  on_call_required BOOLEAN,
  ob_required BOOLEAN,

  hours_per_week NUMERIC,
  shifts_count INTEGER,
  duration_weeks INTEGER,

  requirements JSONB DEFAULT '{}'::jsonb,
  housing_included BOOLEAN,
  travel_included BOOLEAN,

  consultant_email TEXT,
  consultant_name TEXT,

  raw_text TEXT,
  raw_image_path TEXT,
  pii_redacted_at TIMESTAMPTZ,

  extraction_model TEXT,
  extraction_confidence JSONB,
  extraction_latency_ms INTEGER,
  input_type TEXT,

  extra_fields JSONB DEFAULT '{}'::jsonb,

  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_avrop_intel_region ON public.avrop_intelligence(region);
CREATE INDEX idx_avrop_intel_competence ON public.avrop_intelligence(competence);
CREATE INDEX idx_avrop_intel_period_start ON public.avrop_intelligence(period_start);
CREATE INDEX idx_avrop_intel_response_deadline ON public.avrop_intelligence(response_deadline);
CREATE INDEX idx_avrop_intel_avrop_received_at ON public.avrop_intelligence(avrop_received_at);
CREATE INDEX idx_avrop_intel_consultant_email ON public.avrop_intelligence(lower(consultant_email));
CREATE INDEX idx_avrop_intel_agency_id ON public.avrop_intelligence(agency_id);
CREATE INDEX idx_avrop_intel_pii_pending ON public.avrop_intelligence(created_at) WHERE pii_redacted_at IS NULL;

ALTER TABLE public.avrop_intelligence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can read own avrop intelligence"
ON public.avrop_intelligence
FOR SELECT
TO authenticated
USING (agency_id = auth.uid());

CREATE POLICY "Service role manages avrop intelligence"
ON public.avrop_intelligence
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- =====================================================
-- REPRESENTATION EVENTS — Funnel tracking
-- =====================================================
CREATE TABLE public.representation_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  representation_request_id UUID NOT NULL REFERENCES public.ref_representation_requests(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  actor TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_rep_events_request_id ON public.representation_events(representation_request_id);
CREATE INDEX idx_rep_events_type ON public.representation_events(event_type);
CREATE INDEX idx_rep_events_created_at ON public.representation_events(created_at);

ALTER TABLE public.representation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency can read events for own intyg"
ON public.representation_events
FOR SELECT
TO authenticated
USING (
  representation_request_id IN (
    SELECT id FROM public.ref_representation_requests WHERE agency_id = auth.uid()
  )
);

CREATE POLICY "Service role manages representation events"
ON public.representation_events
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

CREATE TRIGGER update_avrop_intelligence_updated_at
BEFORE UPDATE ON public.avrop_intelligence
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- =====================================================
-- PII redaction function — runs daily via cron
-- =====================================================
CREATE OR REPLACE FUNCTION public.redact_avrop_intelligence_pii()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  redacted_count INTEGER;
BEGIN
  WITH updated AS (
    UPDATE public.avrop_intelligence
    SET
      raw_text = NULL,
      raw_image_path = NULL,
      pii_redacted_at = now()
    WHERE pii_redacted_at IS NULL
      AND created_at < now() - interval '3 days'
    RETURNING id
  )
  SELECT COUNT(*) INTO redacted_count FROM updated;

  RETURN redacted_count;
END;
$$;

-- Schemalägg dagligen kl 03:00 UTC (hanteras via pg_cron om aktiverat)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    PERFORM cron.unschedule('redact-avrop-pii-daily');
    PERFORM cron.schedule(
      'redact-avrop-pii-daily',
      '0 3 * * *',
      $cron$ SELECT public.redact_avrop_intelligence_pii(); $cron$
    );
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- pg_cron ej installerat; cron-uppgift hoppas över. Funktionen kan ändå köras manuellt.
  NULL;
END $$;