
-- ============================================
-- STEG 2: Populera roles + geographies, migrera alias-tabeller
-- ============================================

-- ==================
-- 2A: Populera roles från befintliga canonical_name
-- ==================
INSERT INTO public.roles (code, name)
SELECT DISTINCT canonical_name, canonical_name
FROM public.role_aliases
ORDER BY canonical_name;

-- ==================
-- 2B: Populera geographies-hierarkin från locations
-- ==================

-- Nation (root)
INSERT INTO public.geographies (id, type, name, code, parent_id)
VALUES (gen_random_uuid(), 'nation', 'Sverige', 'SE', NULL);

-- Regioner
INSERT INTO public.geographies (type, name, code, parent_id)
SELECT DISTINCT 'region'::geography_type, l.region, l.region,
  (SELECT id FROM public.geographies WHERE type = 'nation' AND code = 'SE')
FROM public.locations l
ORDER BY l.region;

-- Zoner
INSERT INTO public.geographies (type, name, code, parent_id)
SELECT DISTINCT 'zone'::geography_type, l.zon, l.zon,
  (SELECT id FROM public.geographies WHERE type = 'nation' AND code = 'SE')
FROM public.locations l
ORDER BY l.zon;

-- Kommuner (med parent = region)
INSERT INTO public.geographies (type, name, code, parent_id)
SELECT DISTINCT 'municipality'::geography_type, l.kommun, l.kommun,
  (SELECT g.id FROM public.geographies g WHERE g.type = 'region' AND g.name = l.region)
FROM public.locations l
ORDER BY l.kommun;

-- ==================
-- 2C: Migrera role_aliases — lägg till role_id, populera, ta bort canonical_name
-- ==================
ALTER TABLE public.role_aliases ADD COLUMN role_id uuid REFERENCES public.roles(id);

UPDATE public.role_aliases ra
SET role_id = r.id
FROM public.roles r
WHERE r.code = ra.canonical_name;

-- Verifiera att alla rader har role_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.role_aliases WHERE role_id IS NULL) THEN
    RAISE EXCEPTION 'role_aliases has rows with NULL role_id after migration';
  END IF;
END $$;

ALTER TABLE public.role_aliases ALTER COLUMN role_id SET NOT NULL;
ALTER TABLE public.role_aliases DROP COLUMN canonical_name;

CREATE INDEX idx_role_aliases_role_id ON public.role_aliases(role_id);
CREATE INDEX idx_role_aliases_alias ON public.role_aliases(alias);

-- ==================
-- 2D: Migrera geography_aliases — lägg till geo_id, populera, ta bort flat-kolumner
-- ==================
ALTER TABLE public.geography_aliases ADD COLUMN geo_id uuid REFERENCES public.geographies(id);

-- Matcha mot kommun (mest specifik nivå)
UPDATE public.geography_aliases ga
SET geo_id = g.id
FROM public.geographies g
WHERE g.type = 'municipality' AND g.name = ga.canonical_kommun;

-- Verifiera
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM public.geography_aliases WHERE geo_id IS NULL) THEN
    RAISE EXCEPTION 'geography_aliases has rows with NULL geo_id after migration';
  END IF;
END $$;

ALTER TABLE public.geography_aliases ALTER COLUMN geo_id SET NOT NULL;
ALTER TABLE public.geography_aliases DROP COLUMN canonical_kommun;
ALTER TABLE public.geography_aliases DROP COLUMN canonical_zon;
ALTER TABLE public.geography_aliases DROP COLUMN canonical_region;

CREATE INDEX idx_geography_aliases_geo_id ON public.geography_aliases(geo_id);
CREATE INDEX idx_geography_aliases_alias ON public.geography_aliases(alias);
