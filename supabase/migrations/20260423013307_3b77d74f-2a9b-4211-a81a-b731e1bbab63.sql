-- 1. Lock down read access on prediction tables to authenticated users + admins only
DROP POLICY IF EXISTS "Predictions are publicly readable" ON public.uppdragsradar_predictions;
DROP POLICY IF EXISTS "Customer intelligence is publicly readable" ON public.customer_intelligence;

CREATE POLICY "Authenticated users can read predictions"
ON public.uppdragsradar_predictions
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can read customer intelligence"
ON public.customer_intelligence
FOR SELECT
TO authenticated
USING (true);

-- 2. Audit log table for radar imports
CREATE TABLE public.radar_import_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  table_name text NOT NULL,
  row_count integer NOT NULL,
  truncated boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'success',
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_radar_import_log_user_created
  ON public.radar_import_log (user_id, created_at DESC);

ALTER TABLE public.radar_import_log ENABLE ROW LEVEL SECURITY;

-- Only admins can read the audit log; only service role can write (no INSERT policy = service role bypass only)
CREATE POLICY "Admins can read radar import log"
ON public.radar_import_log
FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));