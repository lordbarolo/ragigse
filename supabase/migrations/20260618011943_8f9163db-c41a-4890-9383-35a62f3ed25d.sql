
CREATE TABLE IF NOT EXISTS public.system_health_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  check_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('ok','warn','error')),
  error_message text,
  details jsonb DEFAULT '{}'::jsonb,
  duration_ms integer,
  alert_sent_at timestamptz,
  alert_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.system_health_log TO authenticated;
GRANT ALL ON public.system_health_log TO service_role;

ALTER TABLE public.system_health_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read health log"
ON public.system_health_log FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE INDEX IF NOT EXISTS idx_system_health_log_created_at ON public.system_health_log(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_system_health_log_status ON public.system_health_log(status, created_at DESC);
