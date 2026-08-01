-- 1. Immutable slugify helper (internal)
CREATE OR REPLACE FUNCTION public.cc_slugify(_input text)
RETURNS text
LANGUAGE sql
IMMUTABLE
STRICT
PARALLEL SAFE
SET search_path = public
AS $$
  SELECT trim(both '-' from regexp_replace(
    lower(
      translate(_input,
        'ÅÄÖÉÜÀÁÂÈÊÍÓÔÚåäöéüàáâèêíóôú',
        'AAOEUAAAEEIOOUaaoeuaaaeeioou')
    ),
    '[^a-z0-9]+', '-', 'g'))
$$;

REVOKE ALL ON FUNCTION public.cc_slugify(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cc_slugify(text) FROM anon, authenticated;

-- 2. Indexes for fast slug lookups
CREATE INDEX IF NOT EXISTS idx_cvr_slug_role_zone
  ON public.contract_version_rates (public.cc_slugify(yrkeskategori), zon);
CREATE INDEX IF NOT EXISTS idx_locations_slug_kommun
  ON public.locations (public.cc_slugify(kommun));
CREATE INDEX IF NOT EXISTS idx_locations_slug_region
  ON public.locations (public.cc_slugify(region));

-- 3. Secure lookup RPC
CREATE OR REPLACE FUNCTION public.lookup_rate(
  specialty_slug text,
  location_slug text
)
RETURNS TABLE (
  specialty_name text,
  location_name text,
  client_rate integer,
  contractor_rate integer,
  employee_rate integer,
  source text
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _sp text := public.cc_slugify(coalesce(specialty_slug, ''));
  _loc text := public.cc_slugify(coalesce(location_slug, ''));
  _kommun text;
  _region text;
  _zon text;
  _share numeric;
  _employer_factor numeric;
BEGIN
  IF _sp = '' OR _loc = '' THEN
    RETURN;
  END IF;

  -- Resolve location -> zone (kommun first, then region)
  SELECT l.kommun, l.region, l.zon
    INTO _kommun, _region, _zon
  FROM public.locations l
  WHERE public.cc_slugify(l.kommun) = _loc
  LIMIT 1;

  IF _zon IS NULL THEN
    SELECT NULL, l.region, l.zon
      INTO _kommun, _region, _zon
    FROM public.locations l
    WHERE public.cc_slugify(l.region) = _loc
    ORDER BY l.zon
    LIMIT 1;
  END IF;

  IF _zon IS NULL THEN
    RETURN;
  END IF;

  SELECT m.share_max, m.employer_factor
    INTO _share, _employer_factor
  FROM public.margin_models m
  WHERE m.is_active
  ORDER BY m.name = 'default' DESC
  LIMIT 1;

  _share := coalesce(_share, 0.90);
  _employer_factor := coalesce(_employer_factor, 1.38);

  RETURN QUERY
  SELECT
    r.yrkeskategori::text AS specialty_name,
    (coalesce(_kommun || ', ', '') || _region)::text AS location_name,
    r.timpris_kund AS client_rate,
    round(r.timpris_kund * CASE WHEN r.yrkeskategori ILIKE '%läkare%'
                                THEN _share ELSE _share - 0.05 END)::integer AS contractor_rate,
    round(r.timpris_kund * CASE WHEN r.yrkeskategori ILIKE '%läkare%'
                                THEN _share ELSE _share - 0.05 END
          / _employer_factor)::integer AS employee_rate,
    'SKR Ramavtal 2026'::text AS source
  FROM public.contract_version_rates r
  JOIN public.contract_versions v ON v.id = r.version_id AND v.is_active
  WHERE public.cc_slugify(r.yrkeskategori) = _sp
    AND r.zon = _zon
    AND r.yrkeskategori NOT ILIKE 'OB-tillägg%'
  ORDER BY r.timpris_kund DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_rate(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_rate(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lookup_rate(text, text) TO authenticated, service_role;