
-- ============================================================
-- CompCare Consultant OS – Core Data Model
-- ============================================================

-- 1. REFERENCE TABLES ─────────────────────────────────────────

-- specialties (doctor/nurse categories)
CREATE TABLE public.specialties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  name text NOT NULL,
  code text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.specialties ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read specialties" ON public.specialties FOR SELECT TO public USING (true);

-- regions (geographic reference)
CREATE TABLE public.regions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  region text NOT NULL,
  kommun text NOT NULL,
  lat double precision,
  lng double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.regions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read regions" ON public.regions FOR SELECT TO public USING (true);

-- zones (contract-specific geographic groupings)
CREATE TABLE public.zones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  region_id uuid REFERENCES public.regions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.zones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read zones" ON public.zones FOR SELECT TO public USING (true);

-- organizations (buyers + staffing agencies)
CREATE TABLE public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  org_number text,
  type text NOT NULL,
  headquarters_region_id uuid REFERENCES public.regions(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read organizations" ON public.organizations FOR SELECT TO public USING (true);

-- 2. IDENTITY LAYER ──────────────────────────────────────────

-- consultant_profiles (extends auth.users via profiles)
CREATE TABLE public.consultant_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  specialty_id uuid REFERENCES public.specialties(id),
  region_id uuid REFERENCES public.regions(id),
  employment_type text,
  experience_years integer,
  sector text,
  care_setting text,
  shift_pattern text,
  on_call boolean DEFAULT false,
  leadership boolean DEFAULT false,
  current_hourly_rate integer,
  current_monthly_salary integer,
  salary_type text,
  staffing_agency_id uuid REFERENCES public.organizations(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.consultant_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own consultant profile" ON public.consultant_profiles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Users can insert own consultant profile" ON public.consultant_profiles FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update own consultant profile" ON public.consultant_profiles FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 3. MARKET BENCHMARK DATA ───────────────────────────────────

CREATE TABLE public.benchmark_rates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id uuid REFERENCES public.specialties(id),
  zone_id uuid REFERENCES public.zones(id),
  rate_type text NOT NULL,
  value integer NOT NULL,
  percentile integer NOT NULL,
  source text,
  contract_version_id uuid REFERENCES public.contract_versions(id),
  valid_from date,
  valid_to date,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.benchmark_rates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read benchmark rates" ON public.benchmark_rates FOR SELECT TO public USING (true);

-- 4. COMPENSATION ANALYSIS ───────────────────────────────────

CREATE TABLE public.compensation_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  current_rate integer,
  market_p50 integer,
  market_p75 integer,
  market_p90 integer,
  negotiation_gap integer,
  result_json jsonb,
  calc_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.compensation_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own compensation reports" ON public.compensation_reports FOR SELECT TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own compensation reports" ON public.compensation_reports FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));

-- 5. ASSIGNMENTS ─────────────────────────────────────────────

CREATE TABLE public.assignments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  specialty_id uuid REFERENCES public.specialties(id),
  region_id uuid REFERENCES public.regions(id),
  buyer_org_id uuid REFERENCES public.organizations(id),
  agency_org_id uuid REFERENCES public.organizations(id),
  hourly_rate integer,
  start_date date,
  end_date date,
  duration_weeks integer,
  invoiced_total integer,
  status text NOT NULL DEFAULT 'planned',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.assignments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own assignments" ON public.assignments FOR SELECT TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own assignments" ON public.assignments FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own assignments" ON public.assignments FOR UPDATE TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()))
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));

-- 6. OFFERS ──────────────────────────────────────────────────

CREATE TABLE public.offers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  specialty_id uuid REFERENCES public.specialties(id),
  region_id uuid REFERENCES public.regions(id),
  buyer_org_id uuid REFERENCES public.organizations(id),
  agency_org_id uuid REFERENCES public.organizations(id),
  hourly_rate integer,
  contract_length_weeks integer,
  housing_included boolean DEFAULT false,
  travel_included boolean DEFAULT false,
  on_call boolean DEFAULT false,
  accepted boolean,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own offers" ON public.offers FOR SELECT TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own offers" ON public.offers FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own offers" ON public.offers FOR UPDATE TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()))
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));

-- 7. MARKET REQUESTS ─────────────────────────────────────────

CREATE TABLE public.market_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid REFERENCES public.consultant_profiles(id) ON DELETE SET NULL,
  specialty_id uuid REFERENCES public.specialties(id),
  region_id uuid REFERENCES public.regions(id),
  employment_type text,
  request_type text,
  result_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.market_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own market requests" ON public.market_requests FOR SELECT TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own market requests" ON public.market_requests FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));

-- 8. WORK PATTERNS ───────────────────────────────────────────

CREATE TABLE public.work_patterns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  pattern_type text NOT NULL,
  hours_per_week integer,
  ob_eligible boolean DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.work_patterns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own work patterns" ON public.work_patterns FOR SELECT TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own work patterns" ON public.work_patterns FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can update own work patterns" ON public.work_patterns FOR UPDATE TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()))
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));

-- 9. INVOICE LINES ───────────────────────────────────────────

CREATE TABLE public.invoice_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assignment_id uuid NOT NULL REFERENCES public.assignments(id) ON DELETE CASCADE,
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  date date NOT NULL,
  hours numeric NOT NULL,
  rate integer NOT NULL,
  ob_type text,
  on_call boolean DEFAULT false,
  invoiced_amount integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.invoice_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own invoice lines" ON public.invoice_lines FOR SELECT TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));
CREATE POLICY "Users can insert own invoice lines" ON public.invoice_lines FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));

-- 10. INDEXES FOR PERFORMANCE ────────────────────────────────

CREATE INDEX idx_consultant_profiles_user_id ON public.consultant_profiles(user_id);
CREATE INDEX idx_compensation_reports_consultant_id ON public.compensation_reports(consultant_id);
CREATE INDEX idx_assignments_consultant_id ON public.assignments(consultant_id);
CREATE INDEX idx_offers_consultant_id ON public.offers(consultant_id);
CREATE INDEX idx_invoice_lines_assignment_id ON public.invoice_lines(assignment_id);
CREATE INDEX idx_benchmark_rates_specialty_zone ON public.benchmark_rates(specialty_id, zone_id);
CREATE INDEX idx_market_requests_consultant_id ON public.market_requests(consultant_id);
CREATE INDEX idx_work_patterns_consultant_id ON public.work_patterns(consultant_id);
