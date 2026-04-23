
-- Tabell för månadsvisa avropsprognoser per kund × region × yrke
CREATE TABLE IF NOT EXISTS public.uppdragsradar_predictions (
    id                       uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer                 text NOT NULL,
    region                   text,
    profession               text,
    specialization           text,
    month                    text NOT NULL,
    expected_calloffs        numeric,
    expected_calloffs_display integer,
    seasonal_index           numeric,
    yoy_ratio                numeric,
    ytd_ratio                numeric,
    trend_ratio              numeric,
    confidence               text CHECK (confidence IN ('low','med','high')),
    is_seasonal_peak         boolean DEFAULT false,
    is_trend_break           boolean DEFAULT false,
    generated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_urdp_month      ON public.uppdragsradar_predictions(month);
CREATE INDEX IF NOT EXISTS idx_urdp_customer   ON public.uppdragsradar_predictions(customer);
CREATE INDEX IF NOT EXISTS idx_urdp_profession ON public.uppdragsradar_predictions(profession);
CREATE INDEX IF NOT EXISTS idx_urdp_region     ON public.uppdragsradar_predictions(region);

-- Tabell för kundprofiler (historisk volym, trend, säsongstoppar)
CREATE TABLE IF NOT EXISTS public.customer_intelligence (
    id                  uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    customer            text NOT NULL,
    region              text,
    profession          text,
    vol_2023            integer,
    vol_2024            integer,
    vol_2025            integer,
    vol_2026_ytd        integer,
    yoy_ratio           numeric,
    ytd_ratio           numeric,
    trend_ratio         numeric,
    trend_label         text,
    history_months      integer,
    seasonal_peaks      jsonb,
    seasonal_lows       jsonb,
    last_calloff_date   date,
    generated_at        timestamptz NOT NULL DEFAULT now(),
    UNIQUE (customer, region, profession)
);

CREATE INDEX IF NOT EXISTS idx_ci_customer   ON public.customer_intelligence(customer);
CREATE INDEX IF NOT EXISTS idx_ci_profession ON public.customer_intelligence(profession);

-- RLS: läsbart för alla (publik marknadsdata, ingen PII), skrivning endast service role
ALTER TABLE public.uppdragsradar_predictions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customer_intelligence    ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Predictions are publicly readable"
  ON public.uppdragsradar_predictions FOR SELECT
  USING (true);

CREATE POLICY "Customer intelligence is publicly readable"
  ON public.customer_intelligence FOR SELECT
  USING (true);
