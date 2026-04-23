-- Tabell: radar_api_keys (hash genereras i edge-funktion via Web Crypto SHA-256)
CREATE TABLE public.radar_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  consumer_project text,
  key_prefix text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  scopes text[] NOT NULL DEFAULT ARRAY['predictions','customer_intelligence','calloff_imports']::text[],
  rate_limit_per_hour integer NOT NULL DEFAULT 100,
  rate_limit_per_day integer NOT NULL DEFAULT 1000,
  max_rows_per_request integer NOT NULL DEFAULT 100,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid,
  last_used_at timestamptz,
  revoked_at timestamptz,
  notes text
);

CREATE INDEX idx_radar_api_keys_hash ON public.radar_api_keys(key_hash) WHERE is_active = true;

ALTER TABLE public.radar_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api keys"
ON public.radar_api_keys FOR SELECT
TO authenticated
USING (ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE POLICY "Admins can insert api keys"
ON public.radar_api_keys FOR INSERT
TO authenticated
WITH CHECK (ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE POLICY "Admins can update api keys"
ON public.radar_api_keys FOR UPDATE
TO authenticated
USING (ref_has_role(auth.uid(), 'admin'::ref_app_role))
WITH CHECK (ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE POLICY "Service role manages api keys"
ON public.radar_api_keys FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

-- Tabell: radar_api_log
CREATE TABLE public.radar_api_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id uuid REFERENCES public.radar_api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL,
  query_params jsonb DEFAULT '{}'::jsonb,
  row_count integer DEFAULT 0,
  status text NOT NULL,
  client_ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_radar_api_log_key_time ON public.radar_api_log(api_key_id, created_at DESC);
CREATE INDEX idx_radar_api_log_created ON public.radar_api_log(created_at DESC);

ALTER TABLE public.radar_api_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read api log"
ON public.radar_api_log FOR SELECT
TO authenticated
USING (ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE POLICY "Service role manages api log"
ON public.radar_api_log FOR ALL
TO service_role
USING (true)
WITH CHECK (true);