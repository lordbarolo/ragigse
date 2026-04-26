
-- 1. Pipeline health logs (liveness + sanity checks)
CREATE TABLE public.pipeline_health_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task_name text NOT NULL,
  status text NOT NULL CHECK (status IN ('started','success','partial','failed')),
  rows_processed integer,
  sanity_checks jsonb DEFAULT '[]'::jsonb,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_pipeline_health_logs_task_created
  ON public.pipeline_health_logs (task_name, created_at DESC);

ALTER TABLE public.pipeline_health_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages pipeline health"
  ON public.pipeline_health_logs FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read pipeline health"
  ON public.pipeline_health_logs FOR SELECT
  TO authenticated
  USING (ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- 2. Prediction backtests (audit trail of accuracy over time)
CREATE TABLE public.prediction_backtests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  forecast_run_id uuid NOT NULL,
  customer text NOT NULL,
  region text,
  profession text,
  specialization text,
  month text NOT NULL,
  expected_calloffs numeric NOT NULL,
  actual_calloffs integer NOT NULL,
  abs_error numeric NOT NULL,
  drift_ratio numeric, -- |expected-actual|/expected, NULL om expected=0
  confidence text,
  is_drift_alert boolean NOT NULL DEFAULT false,
  evaluated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_prediction_backtests_month
  ON public.prediction_backtests (month, evaluated_at DESC);
CREATE INDEX idx_prediction_backtests_drift
  ON public.prediction_backtests (is_drift_alert, evaluated_at DESC)
  WHERE is_drift_alert = true;

ALTER TABLE public.prediction_backtests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role manages backtests"
  ON public.prediction_backtests FOR ALL
  TO service_role USING (true) WITH CHECK (true);

CREATE POLICY "Admins can read backtests"
  ON public.prediction_backtests FOR SELECT
  TO authenticated
  USING (ref_has_role(auth.uid(), 'admin'::ref_app_role));

-- 3. Add is_under_review flag to predictions
ALTER TABLE public.uppdragsradar_predictions
  ADD COLUMN IF NOT EXISTS is_under_review boolean NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_uppdragsradar_predictions_under_review
  ON public.uppdragsradar_predictions (is_under_review)
  WHERE is_under_review = true;
