
-- =====================================================
-- Agent API: API-nycklar för externa agenter
-- =====================================================
CREATE TABLE public.agent_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  key_prefix TEXT NOT NULL,
  key_hash TEXT NOT NULL UNIQUE,
  scopes TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  rate_limit_daily INT NOT NULL DEFAULT 1000,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  notes TEXT
);

CREATE INDEX idx_agent_api_keys_hash ON public.agent_api_keys(key_hash) WHERE revoked_at IS NULL;

ALTER TABLE public.agent_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins manage api keys"
  ON public.agent_api_keys FOR ALL
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role))
  WITH CHECK (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- =====================================================
-- Agent API: User-scoped tokens (consent-based)
-- =====================================================
CREATE TABLE public.agent_user_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  label TEXT NOT NULL,
  token_prefix TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ
);

CREATE INDEX idx_agent_user_tokens_hash ON public.agent_user_tokens(token_hash) WHERE revoked_at IS NULL;
CREATE INDEX idx_agent_user_tokens_user ON public.agent_user_tokens(user_id);

ALTER TABLE public.agent_user_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own tokens"
  ON public.agent_user_tokens FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users create their own tokens"
  ON public.agent_user_tokens FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users revoke their own tokens"
  ON public.agent_user_tokens FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins view all tokens"
  ON public.agent_user_tokens FOR SELECT
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- =====================================================
-- Agent API: Anropslogg
-- =====================================================
CREATE TABLE public.agent_api_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES public.agent_api_keys(id) ON DELETE SET NULL,
  user_token_id UUID REFERENCES public.agent_user_tokens(id) ON DELETE SET NULL,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL DEFAULT 'GET',
  status_code INT NOT NULL,
  latency_ms INT,
  ip TEXT,
  user_agent TEXT,
  params JSONB,
  response_size_bytes INT,
  error_message TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_agent_api_logs_key_day ON public.agent_api_logs(api_key_id, created_at DESC);
CREATE INDEX idx_agent_api_logs_token_day ON public.agent_api_logs(user_token_id, created_at DESC);
CREATE INDEX idx_agent_api_logs_created ON public.agent_api_logs(created_at DESC);

ALTER TABLE public.agent_api_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins view all logs"
  ON public.agent_api_logs FOR SELECT
  USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- =====================================================
-- Helper: count today's calls for rate limit
-- =====================================================
CREATE OR REPLACE FUNCTION public.agent_api_count_today(_key_id UUID)
RETURNS INT
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COUNT(*)::INT
  FROM public.agent_api_logs
  WHERE api_key_id = _key_id
    AND created_at >= date_trunc('day', now() AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm'
$$;
