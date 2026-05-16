
-- Constants baseline + runs
CREATE TABLE public.constants_verification_baseline (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  expected_value JSONB NOT NULL,
  source_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE public.constants_verification_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  status TEXT NOT NULL,
  total_keys INT NOT NULL DEFAULT 0,
  mismatch_count INT NOT NULL DEFAULT 0,
  diff_json JSONB,
  error_message TEXT
);

CREATE TABLE public.rate_baseline_acknowledgments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  version_id UUID NOT NULL,
  yrkeskategori TEXT NOT NULL,
  zon TEXT NOT NULL,
  typ TEXT NOT NULL,
  old_value NUMERIC,
  new_value NUMERIC NOT NULL,
  reason TEXT NOT NULL,
  acknowledged_by UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.constants_verification_baseline ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.constants_verification_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_baseline_acknowledgments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage constants baseline" ON public.constants_verification_baseline
  FOR ALL USING (public.ref_has_role(auth.uid(),'admin'::ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(),'admin'::ref_app_role));

CREATE POLICY "Admins read constants runs" ON public.constants_verification_runs
  FOR SELECT USING (public.ref_has_role(auth.uid(),'admin'::ref_app_role));

CREATE POLICY "Admins read baseline acks" ON public.rate_baseline_acknowledgments
  FOR SELECT USING (public.ref_has_role(auth.uid(),'admin'::ref_app_role));

CREATE INDEX idx_constants_runs_run_at ON public.constants_verification_runs(run_at DESC);
CREATE INDEX idx_rate_ack_version ON public.rate_baseline_acknowledgments(version_id, created_at DESC);

-- Seed sjuksköterskor v1.7 baseline from current live data
INSERT INTO public.rate_verification_baseline (version_id, yrkeskategori, zon, typ, timpris_kund, source_note)
SELECT version_id, yrkeskategori, zon, typ, timpris_kund, 'Initial seed v1.7 2026-05-16'
FROM public.contract_version_rates
WHERE version_id = 'ab717f02-602e-4969-8aa6-632b777c6d49'
ON CONFLICT DO NOTHING;

-- Seed constants baseline
INSERT INTO public.constants_verification_baseline (key, expected_value, source_note) VALUES
  ('margin.specialist.share_min', '0.85'::jsonb, 'calc.ts SPECIALIST_DOCTOR_SHARE_MIN'),
  ('margin.specialist.share_max', '0.90'::jsonb, 'calc.ts SPECIALIST_DOCTOR_SHARE_MAX'),
  ('margin.standard.share_min',  '0.80'::jsonb, 'calc.ts STANDARD_SHARE_MIN'),
  ('margin.standard.share_max',  '0.85'::jsonb, 'calc.ts STANDARD_SHARE_MAX'),
  ('employer.factor',            '1.42'::jsonb, 'calc.ts EMPLOYER_FACTOR'),
  ('hours.per_month',            '167'::jsonb,  'calc.ts HOURS_PER_MONTH'),
  ('ob.sjukskoterska.factor',    '1.3142'::jsonb,'Invoice rules nurse OB multiplier'),
  ('role_aliases.count',         '117'::jsonb,  'role_aliases row count drift detector'),
  ('locations.total.count',      '290'::jsonb,  'locations total count'),
  ('locations.with_zon.count',   '290'::jsonb,  'locations.zon coverage');
