CREATE OR REPLACE FUNCTION public.beta_resolve_zone(p_region text)
RETURNS int
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tokens text[];
  v_token text;
  v_needle text;
  v_zone int;
BEGIN
  IF p_region IS NULL OR length(trim(p_region)) = 0 THEN
    RETURN NULL;
  END IF;

  -- Hela strängen först, därefter delarna ("Region Värmland (Torsby)" → "Region Värmland", "Torsby")
  v_tokens := ARRAY[trim(p_region)]
    || string_to_array(regexp_replace(p_region, '[()\[\],;/|–—-]+', ',', 'g'), ',');

  -- Steg 1: kommunnamn (mest specifikt) för samtliga delar
  FOREACH v_token IN ARRAY v_tokens LOOP
    v_needle := trim(regexp_replace(trim(v_token), '^(region|landstinget)\s+', '', 'i'));
    CONTINUE WHEN length(v_needle) < 3;

    SELECT CASE l.zon WHEN 'Zon 1' THEN 1 WHEN 'Zon 2' THEN 2 WHEN 'Zon 3' THEN 3 END
    INTO v_zone
    FROM public.locations l
    WHERE lower(l.kommun) = lower(v_needle)
    LIMIT 1;
    IF v_zone IS NOT NULL THEN RETURN v_zone; END IF;
  END LOOP;

  -- Steg 2: regionnamn (vanligaste zonen i regionen)
  FOREACH v_token IN ARRAY v_tokens LOOP
    v_needle := trim(regexp_replace(trim(v_token), '^(region|landstinget)\s+', '', 'i'));
    CONTINUE WHEN length(v_needle) < 3;

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
  END LOOP;

  -- Steg 3: geografialias → geografins namn → locations
  FOREACH v_token IN ARRAY v_tokens LOOP
    v_needle := trim(regexp_replace(trim(v_token), '^(region|landstinget)\s+', '', 'i'));
    CONTINUE WHEN length(v_needle) < 3;

    SELECT CASE l.zon WHEN 'Zon 1' THEN 1 WHEN 'Zon 2' THEN 2 WHEN 'Zon 3' THEN 3 END
    INTO v_zone
    FROM public.geography_aliases ga
    JOIN public.geographies g ON g.id = ga.geo_id
    JOIN public.locations l
      ON lower(l.kommun) = lower(g.name) OR lower(l.region) = lower(g.name)
    WHERE lower(ga.alias) = lower(v_needle)
    LIMIT 1;
    IF v_zone IS NOT NULL THEN RETURN v_zone; END IF;
  END LOOP;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.beta_resolve_zone(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.beta_resolve_zone(text) TO anon, authenticated, service_role;