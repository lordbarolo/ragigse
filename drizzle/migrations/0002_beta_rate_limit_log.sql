CREATE TABLE public.beta_rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_hash text NOT NULL,
  scope text NOT NULL DEFAULT 'analyze',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX beta_rate_limit_log_lookup_idx
  ON public.beta_rate_limit_log (ip_hash, scope, created_at DESC);

GRANT ALL ON public.beta_rate_limit_log TO service_role;
REVOKE ALL ON TABLE public.beta_rate_limit_log FROM anon;
REVOKE ALL ON TABLE public.beta_rate_limit_log FROM authenticated;

ALTER TABLE public.beta_rate_limit_log ENABLE ROW LEVEL SECURITY;
-- Medvetet inga policies: endast service role.