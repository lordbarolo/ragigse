CREATE TABLE public.seo_scan_runs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  finished_at TIMESTAMP WITH TIME ZONE,
  pages_checked INTEGER NOT NULL DEFAULT 0,
  error_count INTEGER NOT NULL DEFAULT 0,
  warning_count INTEGER NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'running',
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.seo_scan_findings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  run_id UUID NOT NULL REFERENCES public.seo_scan_runs(id) ON DELETE CASCADE,
  path TEXT NOT NULL,
  check_id TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX idx_seo_scan_findings_run ON public.seo_scan_findings(run_id);
CREATE INDEX idx_seo_scan_runs_started ON public.seo_scan_runs(started_at DESC);

GRANT ALL ON public.seo_scan_runs TO service_role;
GRANT ALL ON public.seo_scan_findings TO service_role;
GRANT SELECT ON public.seo_scan_runs TO authenticated;
GRANT SELECT ON public.seo_scan_findings TO authenticated;

ALTER TABLE public.seo_scan_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_scan_findings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read seo scan runs"
  ON public.seo_scan_runs FOR SELECT TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE POLICY "Admins can read seo scan findings"
  ON public.seo_scan_findings FOR SELECT TO authenticated
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));