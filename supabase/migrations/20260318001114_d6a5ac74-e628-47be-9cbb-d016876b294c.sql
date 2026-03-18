
-- Flexible import table for assignments from various sources (avropsplatsen, bemlo, medlo, etc.)
-- All fields nullable except auto-generated id, to accommodate varying data formats.
CREATE TABLE public.calloff_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,                    -- e.g. 'avropsplatsen', 'bemlo', 'medlo', 'manual'
  calloff_date date,              -- when the assignment was created/published
  region text,                    -- region/län
  customer text,                  -- buyer/vårdgivare
  role text,                      -- yrkeskategori
  specialization text,
  filled boolean DEFAULT false,
  duration_weeks integer,
  price_median numeric,
  price_min numeric,
  price_max numeric,
  customer_type text,
  level text,
  unit text,
  raw_data jsonb,                 -- store the full original record for traceability
  imported_at timestamptz NOT NULL DEFAULT now()
);

-- Public read access (same as requests)
ALTER TABLE public.calloff_imports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read calloff_imports" ON public.calloff_imports FOR SELECT TO public USING (true);

-- Index for the most common query pattern
CREATE INDEX idx_calloff_imports_role ON public.calloff_imports (role);
CREATE INDEX idx_calloff_imports_region ON public.calloff_imports (region);
CREATE INDEX idx_calloff_imports_date ON public.calloff_imports (calloff_date);
