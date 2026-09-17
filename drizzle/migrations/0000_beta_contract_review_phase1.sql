-- FAS 1: isolerad beta-namnrymd för AI-avtalsgranskare

CREATE TABLE public.beta_skr_rate_benchmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profession text NOT NULL CHECK (profession IN ('Läkare','Sjuksköterska')),
  specialty text NOT NULL,
  zone int NOT NULL CHECK (zone BETWEEN 1 AND 4),
  ceiling_rate_sek numeric NOT NULL,
  source text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (profession, specialty, zone)
);

CREATE INDEX beta_skr_rate_benchmarks_lookup_idx
  ON public.beta_skr_rate_benchmarks (profession, specialty, zone);

GRANT SELECT ON public.beta_skr_rate_benchmarks TO anon;
GRANT SELECT ON public.beta_skr_rate_benchmarks TO authenticated;
GRANT ALL ON public.beta_skr_rate_benchmarks TO service_role;

ALTER TABLE public.beta_skr_rate_benchmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "beta_benchmarks_public_read"
  ON public.beta_skr_rate_benchmarks
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE TABLE public.beta_contract_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz DEFAULT now(),
  profession text NOT NULL,
  specialty text,
  region text NOT NULL,
  zone int,
  compensation_type text CHECK (compensation_type IN ('AB','Faktura','Anställd','Okänt')),
  offered_rate numeric NOT NULL,
  housing_included boolean DEFAULT false,
  travel_included boolean DEFAULT false,
  ob_specified boolean DEFAULT false,
  matched_benchmark_rate numeric,
  estimated_agency_margin_pct numeric,
  margin_tier text CHECK (margin_tier IN ('green','yellow','red')),
  flagged_issues jsonb DEFAULT '[]'::jsonb,
  generated_counter_offer text,
  user_email text,
  copied_counter_offer boolean DEFAULT false,
  lead_opt_in_agencies boolean DEFAULT false
);

GRANT ALL ON public.beta_contract_analyses TO service_role;

ALTER TABLE public.beta_contract_analyses ENABLE ROW LEVEL SECURITY;
-- Medvetet inga policies: ingen klientåtkomst, endast service role.

-- Seed från verifierad SKR-data (read-only källor)
INSERT INTO public.beta_skr_rate_benchmarks (profession, specialty, zone, ceiling_rate_sek, source)
SELECT
  CASE
    WHEN r.yrkeskategori LIKE 'Legitimerad läkare%' OR r.yrkeskategori LIKE 'Specialistläkare%'
      THEN 'Läkare'
    ELSE 'Sjuksköterska'
  END AS profession,
  r.yrkeskategori AS specialty,
  CASE r.zon WHEN 'Zon 1' THEN 1 WHEN 'Zon 2' THEN 2 WHEN 'Zon 3' THEN 3 END AS zone,
  r.timpris_kund::numeric,
  'SKR ramavtal 2026 ' || cv.version_label
FROM public.contract_version_rates r
JOIN public.contract_versions cv ON cv.id = r.version_id
WHERE cv.is_active = true
  AND r.typ = 'Grundpris'
  AND r.yrkeskategori NOT LIKE 'OB-tillägg%'
  AND r.zon IN ('Zon 1','Zon 2','Zon 3')
  AND r.timpris_kund IS NOT NULL
ON CONFLICT (profession, specialty, zone) DO UPDATE
  SET ceiling_rate_sek = EXCLUDED.ceiling_rate_sek,
      source = EXCLUDED.source;

CREATE OR REPLACE FUNCTION public.beta_match_benchmark(
  p_profession text,
  p_specialty text,
  p_zone int
)
RETURNS TABLE (
  ceiling_rate_sek numeric,
  specialty text,
  source text,
  match_quality text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- 1. Exakt
  RETURN QUERY
  SELECT b.ceiling_rate_sek, b.specialty, b.source, 'exact'::text
  FROM public.beta_skr_rate_benchmarks b
  WHERE b.profession = p_profession
    AND b.zone = p_zone
    AND lower(b.specialty) = lower(coalesce(p_specialty, ''))
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 2. Fuzzy på specialty
  IF p_specialty IS NOT NULL AND length(trim(p_specialty)) > 2 THEN
    RETURN QUERY
    SELECT b.ceiling_rate_sek, b.specialty, b.source, 'fuzzy'::text
    FROM public.beta_skr_rate_benchmarks b
    WHERE b.profession = p_profession
      AND b.zone = p_zone
      AND (b.specialty ILIKE '%' || trim(p_specialty) || '%'
           OR trim(p_specialty) ILIKE '%' || b.specialty || '%')
    ORDER BY length(b.specialty)
    LIMIT 1;
    IF FOUND THEN RETURN; END IF;
  END IF;

  -- 3. Profession-default
  RETURN QUERY
  SELECT b.ceiling_rate_sek, b.specialty, b.source, 'profession_default'::text
  FROM public.beta_skr_rate_benchmarks b
  WHERE b.profession = p_profession
    AND b.zone = p_zone
    AND b.specialty = CASE WHEN p_profession = 'Läkare'
                           THEN 'Legitimerad läkare'
                           ELSE 'Sjuksköterska' END
  LIMIT 1;
  IF FOUND THEN RETURN; END IF;

  -- 4. Ingen matchning
  RETURN QUERY SELECT NULL::numeric, NULL::text, NULL::text, 'none'::text;
END;
$$;

REVOKE ALL ON FUNCTION public.beta_match_benchmark(text, text, int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beta_match_benchmark(text, text, int) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.beta_resolve_zone(p_region text)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_needle text;
  v_zone int;
BEGIN
  IF p_region IS NULL OR length(trim(p_region)) = 0 THEN
    RETURN NULL;
  END IF;

  -- Normalisera bort prefix som "Region " / "Landstinget "
  v_needle := trim(regexp_replace(trim(p_region), '^(region|landstinget)\s+', '', 'i'));

  -- 1. Kommunnamn
  SELECT CASE l.zon WHEN 'Zon 1' THEN 1 WHEN 'Zon 2' THEN 2 WHEN 'Zon 3' THEN 3 END
  INTO v_zone
  FROM public.locations l
  WHERE lower(l.kommun) = lower(v_needle)
  LIMIT 1;
  IF v_zone IS NOT NULL THEN RETURN v_zone; END IF;

  -- 2. Regionnamn: vanligaste zonen i regionen
  SELECT z INTO v_zone
  FROM (
    SELECT CASE l.zon WHEN 'Zon 1' THEN 1 WHEN 'Zon 2' THEN 2 WHEN 'Zon 3' THEN 3 END AS z,
           count(*) AS c
    FROM public.locations l
    WHERE lower(l.region) = lower(v_needle)
       OR l.region ILIKE '%' || v_needle || '%'
    GROUP BY 1
    ORDER BY c DESC, z
  ) s
  WHERE s.z IS NOT NULL
  LIMIT 1;
  IF v_zone IS NOT NULL THEN RETURN v_zone; END IF;

  -- 3. Geografialias → geografins namn → locations
  SELECT CASE l.zon WHEN 'Zon 1' THEN 1 WHEN 'Zon 2' THEN 2 WHEN 'Zon 3' THEN 3 END
  INTO v_zone
  FROM public.geography_aliases ga
  JOIN public.geographies g ON g.id = ga.geo_id
  JOIN public.locations l
    ON lower(l.kommun) = lower(g.name) OR lower(l.region) = lower(g.name)
  WHERE lower(ga.alias) = lower(v_needle)
  LIMIT 1;

  RETURN v_zone;
END;
$$;

REVOKE ALL ON FUNCTION public.beta_resolve_zone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beta_resolve_zone(text) TO anon, authenticated, service_role;