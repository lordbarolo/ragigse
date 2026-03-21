
-- Lightweight rate limit log table
CREATE TABLE public.rate_limit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint text NOT NULL,
  client_ip text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Index for fast lookups by endpoint + IP + time window
CREATE INDEX idx_rate_limit_log_lookup ON public.rate_limit_log (endpoint, client_ip, created_at DESC);

-- Enable RLS — no public access
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

-- Only service_role can read/write
CREATE POLICY "Service role only on rate_limit_log"
  ON public.rate_limit_log
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Auto-cleanup: delete entries older than 24h (via scheduled job or manual)
-- For now we keep it simple — the index + time-bounded queries keep it fast.
