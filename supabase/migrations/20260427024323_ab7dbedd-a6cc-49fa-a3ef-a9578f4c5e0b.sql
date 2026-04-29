-- AI usage logs table
CREATE TABLE public.ai_usage_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  feature TEXT NOT NULL,
  model TEXT NOT NULL,
  input_tokens INTEGER NOT NULL DEFAULT 0,
  output_tokens INTEGER NOT NULL DEFAULT 0,
  total_tokens INTEGER GENERATED ALWAYS AS (input_tokens + output_tokens) STORED,
  cost_usd NUMERIC(10, 6) NOT NULL DEFAULT 0,
  cost_sek NUMERIC(10, 4) NOT NULL DEFAULT 0,
  duration_ms INTEGER,
  status TEXT NOT NULL DEFAULT 'success',
  error_message TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Indexes for common queries
CREATE INDEX idx_ai_usage_logs_user_id ON public.ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_feature ON public.ai_usage_logs(feature);
CREATE INDEX idx_ai_usage_logs_created_at ON public.ai_usage_logs(created_at DESC);
CREATE INDEX idx_ai_usage_logs_user_feature ON public.ai_usage_logs(user_id, feature, created_at DESC);

-- Enable RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

-- Admins can see everything (uses existing ref_has_role function)
CREATE POLICY "Admins can view all AI logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- Users can view their own logs (transparency)
CREATE POLICY "Users can view their own AI logs"
ON public.ai_usage_logs
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- No client-side INSERT/UPDATE/DELETE - only service role (edge functions) can write

-- Aggregation function: cost per user per feature for a given period
CREATE OR REPLACE FUNCTION public.ai_usage_summary(
  _days INTEGER DEFAULT 30,
  _user_id UUID DEFAULT NULL
)
RETURNS TABLE (
  user_id UUID,
  feature TEXT,
  model TEXT,
  call_count BIGINT,
  total_input_tokens BIGINT,
  total_output_tokens BIGINT,
  total_cost_usd NUMERIC,
  total_cost_sek NUMERIC,
  error_count BIGINT
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    l.user_id,
    l.feature,
    l.model,
    COUNT(*) AS call_count,
    SUM(l.input_tokens)::BIGINT AS total_input_tokens,
    SUM(l.output_tokens)::BIGINT AS total_output_tokens,
    ROUND(SUM(l.cost_usd)::NUMERIC, 4) AS total_cost_usd,
    ROUND(SUM(l.cost_sek)::NUMERIC, 2) AS total_cost_sek,
    COUNT(*) FILTER (WHERE l.status <> 'success')::BIGINT AS error_count
  FROM public.ai_usage_logs l
  WHERE l.created_at >= now() - (_days || ' days')::interval
    AND (_user_id IS NULL OR l.user_id = _user_id)
    AND (
      public.ref_has_role(auth.uid(), 'admin'::ref_app_role)
      OR l.user_id = auth.uid()
    )
  GROUP BY l.user_id, l.feature, l.model
  ORDER BY total_cost_sek DESC NULLS LAST
$$;

COMMENT ON TABLE public.ai_usage_logs IS 'Tracks every AI gateway call with token usage and cost in USD/SEK. Written by edge functions via service role. Read by admins (all) and users (own).';
COMMENT ON COLUMN public.ai_usage_logs.feature IS 'Feature name e.g. salary-assistant, market-explain, invoice-audit';
COMMENT ON COLUMN public.ai_usage_logs.cost_sek IS 'Computed at log time using current USD/SEK rate (~10.5)';