
-- ============================================
-- STEG 1: Komplett migration — roles, geographies, salary_benchmarks
-- ============================================

-- 1. ROLES
CREATE TABLE public.roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  name text NOT NULL,
  parent_role_id uuid REFERENCES public.roles(id),
  active boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read roles" ON public.roles FOR SELECT USING (true);

-- 2. GEOGRAPHIES
CREATE TYPE public.geography_type AS ENUM ('nation', 'region', 'zone', 'municipality');

CREATE TABLE public.geographies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type public.geography_type NOT NULL,
  name text NOT NULL,
  code text,
  parent_id uuid REFERENCES public.geographies(id),
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.geographies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read geographies" ON public.geographies FOR SELECT USING (true);
CREATE INDEX idx_geographies_type ON public.geographies(type);
CREATE INDEX idx_geographies_parent_id ON public.geographies(parent_id);
CREATE INDEX idx_geographies_code ON public.geographies(code);

-- 3. Rename old salary_benchmarks
ALTER TABLE public.salary_benchmarks RENAME TO salary_benchmarks_legacy;

-- 4. New SALARY_BENCHMARKS per spec
CREATE TABLE public.salary_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  period_key text NOT NULL,
  role_id uuid NOT NULL REFERENCES public.roles(id),
  region_id uuid REFERENCES public.geographies(id),
  municipality_id uuid REFERENCES public.geographies(id),
  sample_size integer NOT NULL DEFAULT 0,
  mean_salary numeric,
  median_salary numeric,
  p25_salary numeric,
  p75_salary numeric,
  threshold_passed boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.salary_benchmarks ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read published benchmarks" ON public.salary_benchmarks FOR SELECT USING (threshold_passed = true);
CREATE INDEX idx_salary_benchmarks_role ON public.salary_benchmarks(role_id);
CREATE INDEX idx_salary_benchmarks_region ON public.salary_benchmarks(region_id);
CREATE INDEX idx_salary_benchmarks_period ON public.salary_benchmarks(period_key);
CREATE INDEX idx_salary_benchmarks_threshold ON public.salary_benchmarks(threshold_passed);
