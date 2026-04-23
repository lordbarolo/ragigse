-- 1. Lock down ALL direct read access — server-mediated only
DROP POLICY IF EXISTS "Authenticated users can read predictions" ON public.uppdragsradar_predictions;
DROP POLICY IF EXISTS "Authenticated users can read customer intelligence" ON public.customer_intelligence;

CREATE POLICY "No direct read access to predictions"
ON public.uppdragsradar_predictions
FOR SELECT
USING (false);

CREATE POLICY "No direct read access to customer intelligence"
ON public.customer_intelligence
FOR SELECT
USING (false);

-- 2. Access audit log
CREATE TABLE public.radar_access_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  endpoint text NOT NULL,
  filters jsonb,
  row_count integer NOT NULL,
  client_ip text,
  user_agent text,
  status text NOT NULL DEFAULT 'success',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_radar_access_log_user_created
  ON public.radar_access_log (user_id, created_at DESC);

CREATE INDEX idx_radar_access_log_created
  ON public.radar_access_log (created_at DESC);

ALTER TABLE public.radar_access_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read radar access log"
ON public.radar_access_log
FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));