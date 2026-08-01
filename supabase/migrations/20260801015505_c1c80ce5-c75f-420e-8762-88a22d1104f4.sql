-- 1. Internal alias table: synonym slug -> exact yrkeskategori (1:1, never a group label)
CREATE TABLE IF NOT EXISTS public.rate_slug_aliases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alias_slug text NOT NULL UNIQUE,
  yrkeskategori text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.rate_slug_aliases TO service_role;

ALTER TABLE public.rate_slug_aliases ENABLE ROW LEVEL SECURITY;
-- No policies: table is only read by SECURITY DEFINER functions / service_role.

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS update_rate_slug_aliases_updated_at ON public.rate_slug_aliases;
CREATE TRIGGER update_rate_slug_aliases_updated_at
BEFORE UPDATE ON public.rate_slug_aliases
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_rate_slug_aliases_slug
  ON public.rate_slug_aliases (alias_slug);

-- 2. Seed synonyms (nurses from existing frontend alias map + common doctor synonyms)
INSERT INTO public.rate_slug_aliases (alias_slug, yrkeskategori) VALUES
  -- Sjuksköterskor
  ('legitimerad-sjukskoterska', 'Sjuksköterska'),
  ('leg-sjukskoterska', 'Sjuksköterska'),
  ('allmansjukskoterska', 'Sjuksköterska'),
  ('grundutbildad-sjukskoterska', 'Sjuksköterska'),
  ('ssk', 'Sjuksköterska'),
  ('leg-ssk', 'Sjuksköterska'),
  ('dsk', 'Distriktssjuksköterska'),
  ('distriktsskoterska', 'Distriktssjuksköterska'),
  ('anestesisjukskoterska', 'Specialistsjuksköterska anestesi'),
  ('narkossjukskoterska', 'Specialistsjuksköterska anestesi'),
  ('iva-sjukskoterska', 'Specialistsjuksköterska intensivvård'),
  ('intensivvardssjukskoterska', 'Specialistsjuksköterska intensivvård'),
  ('operationssjukskoterska', 'Specialistsjuksköterska operationssjukvård'),
  ('akutsjukskoterska', 'Specialistsjuksköterska akutsjukvård'),
  ('ambulanssjukskoterska', 'Specialistsjuksköterska ambulanssjukvård'),
  ('barnsjukskoterska', 'Specialistsjuksköterska barn och ungdom'),
  ('diabetessjukskoterska', 'Specialistsjuksköterska diabetesvård'),
  ('foretagsskoterska', 'Specialistsjuksköterska företagshälsovård'),
  ('foretagshalsosjukskoterska', 'Specialistsjuksköterska företagshälsovård'),
  ('hjartsjukskoterska', 'Specialistsjuksköterska hjärtsjukvård'),
  ('infektionssjukskoterska', 'Specialistsjuksköterska infektionssjukvård'),
  ('kirurgsjukskoterska', 'Specialistsjuksköterska kirurgisk vård'),
  ('medicinsjukskoterska', 'Specialistsjuksköterska medicinsk vård'),
  ('onkologisjukskoterska', 'Specialistsjuksköterska onkologisk vård'),
  ('palliativsjukskoterska', 'Specialistsjuksköterska palliativ vård'),
  ('psykiatrisjukskoterska', 'Specialistsjuksköterska psykiatrisk vård'),
  ('geriatriksjukskoterska', 'Specialistsjuksköterska vård av äldre'),
  ('aldresjukskoterska', 'Specialistsjuksköterska vård av äldre'),
  ('ogonsjukskoterska', 'Specialistsjuksköterska ögonsjukvård'),
  ('rontgensjukskoterska', 'Röntgensjuksköterska'),
  ('skolsjukskoterska', 'Skolsköterska'),
  -- Läkare
  ('anestesilakare', 'Specialistläkare Anestesi och intensivvård'),
  ('anestesiolog', 'Specialistläkare Anestesi och intensivvård'),
  ('narkoslakare', 'Specialistläkare Anestesi och intensivvård'),
  ('allmanlakare', 'Specialistläkare Allmänmedicin'),
  ('huslakare', 'Specialistläkare Allmänmedicin'),
  ('distriktslakare', 'Specialistläkare Allmänmedicin'),
  ('barnlakare', 'Specialistläkare Barn- och ungdomsmedicin'),
  ('pediatriker', 'Specialistläkare Barn- och ungdomsmedicin'),
  ('bup-lakare', 'Specialistläkare Barn- och ungdomspsykiatri'),
  ('barnpsykiater', 'Specialistläkare Barn- och ungdomspsykiatri'),
  ('dermatolog', 'Specialistläkare Hud- och könssjukdomar'),
  ('hudlakare', 'Specialistläkare Hud- och könssjukdomar'),
  ('kardiolog', 'Specialistläkare Kardiologi'),
  ('hjartlakare', 'Specialistläkare Kardiologi'),
  ('internmedicinare', 'Specialistläkare Internmedicin'),
  ('hematolog', 'Specialistläkare Hematologi'),
  ('nefrolog', 'Specialistläkare Njurmedicin'),
  ('njurlakare', 'Specialistläkare Njurmedicin'),
  ('neurolog', 'Specialistläkare Neurologi'),
  ('onh-lakare', 'Specialistläkare Öron-, näs- och halssjukdomar'),
  ('oronlakare', 'Specialistläkare Öron-, näs- och halssjukdomar'),
  ('psykiater', 'Specialistläkare Psykiatri'),
  ('psykiatriker', 'Specialistläkare Psykiatri'),
  ('rattspsykiater', 'Specialistläkare Rättspsykiatri'),
  ('radiolog', 'Specialistläkare Radiologi'),
  ('rontgenlakare', 'Specialistläkare Radiologi'),
  ('neuroradiolog', 'Specialistläkare Neuroradiologi'),
  ('ogonlakare', 'Specialistläkare Ögonsjukdomar'),
  ('oftalmolog', 'Specialistläkare Ögonsjukdomar'),
  ('gynekolog', 'Specialistläkare Obstetrik och gynekologi'),
  ('kirurg', 'Specialistläkare Kirurgi'),
  ('ortoped', 'Specialistläkare Ortopedi'),
  ('urolog', 'Specialistläkare Urologi'),
  ('onkolog', 'Specialistläkare Onkologi'),
  ('lunglakare', 'Specialistläkare Lungsjukdomar'),
  ('pulmonolog', 'Specialistläkare Lungsjukdomar'),
  ('reumatolog', 'Specialistläkare Reumatologi'),
  ('geriatriker', 'Specialistläkare Geriatrik'),
  ('infektionslakare', 'Specialistläkare Infektionssjukdomar'),
  ('akutlakare', 'Specialistläkare Akutsjukvård'),
  ('patolog', 'Specialistläkare Klinisk patologi'),
  ('endokrinolog', 'Specialistläkare Endokrinologi och diabetologi'),
  ('gastroenterolog', 'Specialistläkare Medicinsk gastroenterologi och hepatologi'),
  ('smartlakare', 'Specialistläkare Smärtlindring'),
  ('rehablakare', 'Specialistläkare Rehabiliteringsmedicin'),
  ('plastikkirurg', 'Specialistläkare Plastikkirurgi'),
  ('thoraxkirurg', 'Specialistläkare Thoraxkirurgi'),
  ('neurokirurg', 'Specialistläkare Neurokirurgi'),
  ('karlkirurg', 'Specialistläkare Kärlkirurgi'),
  ('handkirurg', 'Specialistläkare Handkirurgi'),
  ('barnkirurg', 'Specialistläkare Barn- och ungdomskirurgi'),
  ('palliativlakare', 'Specialistläkare Palliativ medicin'),
  ('neonatolog', 'Specialistläkare Neonatologi'),
  ('allergolog', 'Specialistläkare Allergologi'),
  ('barnneurolog', 'Specialistläkare Barn- och ungdomsneurologi med habilitering'),
  ('barnkardiolog', 'Specialistläkare Barn- och ungdomskardiologi'),
  ('aldrepsykiater', 'Specialistläkare Äldrepsykiatri'),
  ('beroendelakare', 'Specialistläkare Beroendemedicin'),
  ('socialmedicinare', 'Specialistläkare Socialmedicin'),
  ('rattslakare', 'Specialistläkare Rättsmedicin')
ON CONFLICT (alias_slug) DO UPDATE SET yrkeskategori = EXCLUDED.yrkeskategori;

-- 3. Validate: every alias must resolve to exactly one active, non-group rate row
DO $$
DECLARE
  _bad text;
BEGIN
  SELECT string_agg(a.alias_slug || ' -> ' || a.yrkeskategori, ', ')
    INTO _bad
  FROM public.rate_slug_aliases a
  WHERE NOT EXISTS (
    SELECT 1
    FROM public.contract_version_rates r
    JOIN public.contract_versions v ON v.id = r.version_id AND v.is_active
    WHERE lower(r.yrkeskategori) = lower(a.yrkeskategori)
  );
  IF _bad IS NOT NULL THEN
    RAISE EXCEPTION 'Invalid rate_slug_aliases targets: %', _bad;
  END IF;

  SELECT string_agg(a.alias_slug, ', ') INTO _bad
  FROM public.rate_slug_aliases a
  WHERE a.yrkeskategori ILIKE '%grupp a%'
     OR a.yrkeskategori ILIKE '%grupp b%'
     OR a.yrkeskategori ILIKE '%annan specialistlakarkompetens%'
     OR a.yrkeskategori ILIKE '%annan specialistläkarkompetens%'
     OR a.yrkeskategori ILIKE 'OB-tillägg%'
     OR lower(a.yrkeskategori) = 'specialistsjuksköterska'
     OR lower(a.yrkeskategori) = 'specialistläkare';
  IF _bad IS NOT NULL THEN
    RAISE EXCEPTION 'Alias points at a group label: %', _bad;
  END IF;
END $$;

-- 4. lookup_rate with alias fallback
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
  _target text;
BEGIN
  IF _sp = '' OR _loc = '' THEN
    RETURN;
  END IF;

  -- Never resolve bare group labels
  IF _sp IN ('specialistsjukskoterska', 'specialistlakare', 'specialistlakare-grupp-a',
             'specialistlakare-grupp-b', 'specialistlakare-annan-specialistlakarkompetens') THEN
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

  -- Direct match on the official role name?
  SELECT r.yrkeskategori INTO _target
  FROM public.contract_version_rates r
  JOIN public.contract_versions v ON v.id = r.version_id AND v.is_active
  WHERE public.cc_slugify(r.yrkeskategori) = _sp
    AND r.yrkeskategori NOT ILIKE 'OB-tillägg%'
  LIMIT 1;

  -- Fallback: synonym alias -> official role name
  IF _target IS NULL THEN
    SELECT a.yrkeskategori INTO _target
    FROM public.rate_slug_aliases a
    WHERE a.alias_slug = _sp
    LIMIT 1;
  END IF;

  IF _target IS NULL THEN
    RETURN;
  END IF;

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
  WHERE lower(r.yrkeskategori) = lower(_target)
    AND r.zon = _zon
    AND r.yrkeskategori NOT ILIKE 'OB-tillägg%'
  ORDER BY r.timpris_kund DESC
  LIMIT 1;
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_rate(text, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_rate(text, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lookup_rate(text, text) TO authenticated, service_role;