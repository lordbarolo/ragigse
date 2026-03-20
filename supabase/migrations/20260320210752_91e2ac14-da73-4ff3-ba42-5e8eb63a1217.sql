
-- ============================================================
-- Compensation Intelligence Platform — Fas 1: Core Tables
-- ============================================================

-- 1. role_aliases — maps aliases to canonical yrkeskategori
CREATE TABLE public.role_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,
  canonical_name text NOT NULL,
  language text NOT NULL DEFAULT 'sv',
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX role_aliases_alias_lang_idx ON public.role_aliases (lower(alias), language);

ALTER TABLE public.role_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read role_aliases"
  ON public.role_aliases FOR SELECT
  TO public
  USING (true);

-- 2. geography_aliases — maps aliases to canonical kommun/zon/region
CREATE TABLE public.geography_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias text NOT NULL,
  canonical_kommun text NOT NULL,
  canonical_zon text NOT NULL,
  canonical_region text NOT NULL,
  language text NOT NULL DEFAULT 'sv',
  source text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX geography_aliases_alias_lang_idx ON public.geography_aliases (lower(alias), language);

ALTER TABLE public.geography_aliases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read geography_aliases"
  ON public.geography_aliases FOR SELECT
  TO public
  USING (true);

-- 3. capability_definitions — registry of available capabilities
CREATE TABLE public.capability_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  capability_key text NOT NULL UNIQUE,
  version integer NOT NULL DEFAULT 1,
  name text NOT NULL,
  description text,
  input_schema_json jsonb,
  output_schema_json jsonb,
  human_label text,
  agent_label text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.capability_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read capability_definitions"
  ON public.capability_definitions FOR SELECT
  TO public
  USING (true);

-- 4. client_profiles — access control and policy rules per client type
CREATE TABLE public.client_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_key text NOT NULL UNIQUE,
  client_type text NOT NULL,
  rate_limit_per_minute integer NOT NULL DEFAULT 30,
  rate_limit_per_day integer NOT NULL DEFAULT 500,
  max_entities_per_query integer NOT NULL DEFAULT 2,
  allowed_capabilities jsonb NOT NULL DEFAULT '["lookup_rate","salary_benchmark","salary_position","compare_roles"]'::jsonb,
  policy_rules jsonb NOT NULL DEFAULT '{"sample_size_min":10,"anti_enum_window_minutes":10,"anti_enum_max_sequential":5}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.client_profiles ENABLE ROW LEVEL SECURITY;

-- No public access to client_profiles — only service_role
CREATE POLICY "No public reads on client_profiles"
  ON public.client_profiles FOR SELECT
  TO public
  USING (false);

-- 5. compensation_queries — audit log for all CI queries
CREATE TABLE public.compensation_queries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel text,
  client_type text,
  client_ip text,
  capability_key text NOT NULL,
  capability_version integer NOT NULL DEFAULT 1,
  raw_input_text text,
  normalized_input_json jsonb,
  resolved_entities_json jsonb,
  resolution_method text,
  confidence_score numeric,
  policy_result_json jsonb,
  response_payload_json jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.compensation_queries ENABLE ROW LEVEL SECURITY;

-- No public access to compensation_queries — only service_role
CREATE POLICY "No public reads on compensation_queries"
  ON public.compensation_queries FOR SELECT
  TO public
  USING (false);

-- Index for rate limiting queries
CREATE INDEX compensation_queries_rate_limit_idx
  ON public.compensation_queries (client_ip, created_at DESC);

CREATE INDEX compensation_queries_anti_enum_idx
  ON public.compensation_queries (client_ip, capability_key, created_at DESC);
