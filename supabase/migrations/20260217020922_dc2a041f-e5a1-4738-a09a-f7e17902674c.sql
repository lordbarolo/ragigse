
-- Salary benchmark data for permanent employment (fast tjänst)
-- Completely separate from consultant rates/margin_models

CREATE TABLE public.salary_benchmarks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occupation TEXT NOT NULL,
  occupation_code TEXT,              -- SSYK code
  region TEXT,                       -- NULL = rikssnitt
  sector TEXT NOT NULL,              -- 'kommunal', 'region', 'privat'
  source TEXT NOT NULL,              -- 'SCB', 'MI', 'SKR'
  year INTEGER NOT NULL,
  average_monthly INTEGER NOT NULL,  -- genomsnittlig månadslön
  percentile_10 INTEGER,
  percentile_25 INTEGER,
  percentile_50 INTEGER,             -- median
  percentile_75 INTEGER,
  percentile_90 INTEGER,
  sample_size INTEGER,
  industry TEXT NOT NULL DEFAULT 'healthcare',
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(occupation_code, sector, region, source, year)
);

ALTER TABLE public.salary_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read salary benchmarks"
  ON public.salary_benchmarks FOR SELECT
  USING (true);

CREATE INDEX idx_salary_benchmarks_lookup 
  ON public.salary_benchmarks (occupation_code, sector, year);
