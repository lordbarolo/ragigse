
-- Tabell för att lagra resultat från nattlig prisverifiering
CREATE TABLE public.rate_verification_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  version_id UUID REFERENCES public.contract_versions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending' | 'ok' | 'mismatch' | 'error'
  total_rows INTEGER NOT NULL DEFAULT 0,
  mismatch_count INTEGER NOT NULL DEFAULT 0,
  current_checksum TEXT,
  baseline_checksum TEXT,
  diff_json JSONB,
  error_message TEXT
);

ALTER TABLE public.rate_verification_runs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view rate verification runs"
ON public.rate_verification_runs
FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rate_verification_runs_run_at ON public.rate_verification_runs (run_at DESC);

-- Tabell för baseline-snapshot (referensvärden som DB jämförs mot)
CREATE TABLE public.rate_verification_baseline (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  version_id UUID NOT NULL REFERENCES public.contract_versions(id) ON DELETE CASCADE,
  yrkeskategori TEXT NOT NULL,
  zon TEXT NOT NULL,
  typ TEXT NOT NULL,
  timpris_kund NUMERIC NOT NULL,
  source_note TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (version_id, yrkeskategori, zon, typ)
);

ALTER TABLE public.rate_verification_baseline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view baseline"
ON public.rate_verification_baseline
FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'));

CREATE INDEX idx_rate_verification_baseline_version ON public.rate_verification_baseline (version_id);
