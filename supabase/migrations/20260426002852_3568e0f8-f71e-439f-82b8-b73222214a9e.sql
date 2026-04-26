ALTER TABLE public.uppdragsradar_predictions
  ADD COLUMN IF NOT EXISTS forecast_run_id uuid NOT NULL DEFAULT gen_random_uuid();

CREATE INDEX IF NOT EXISTS idx_urdp_run ON public.uppdragsradar_predictions(forecast_run_id);
CREATE INDEX IF NOT EXISTS idx_urdp_month_conf ON public.uppdragsradar_predictions(month, confidence);