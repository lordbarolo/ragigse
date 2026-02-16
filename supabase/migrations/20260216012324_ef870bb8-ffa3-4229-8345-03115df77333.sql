
-- Gate G3: Create margin_models table to replace hardcoded constants
CREATE TABLE public.margin_models (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  share_min numeric NOT NULL DEFAULT 0.85,
  share_max numeric NOT NULL DEFAULT 0.90,
  employer_factor numeric NOT NULL DEFAULT 1.42,
  hours_per_month integer NOT NULL DEFAULT 167,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.margin_models ENABLE ROW LEVEL SECURITY;

-- Public read access (needed by pricing-engine and frontend)
CREATE POLICY "Anyone can read active margin models"
  ON public.margin_models FOR SELECT
  USING (true);

-- No public write access
-- (managed via service role in admin/migrations only)

-- Seed with current hardcoded values
INSERT INTO public.margin_models (name, share_min, share_max, employer_factor, hours_per_month)
VALUES ('default', 0.85, 0.90, 1.42, 167);
