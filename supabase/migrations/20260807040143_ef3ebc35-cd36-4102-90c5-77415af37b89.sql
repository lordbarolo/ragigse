ALTER TABLE public.consultant_profiles
  ADD COLUMN IF NOT EXISTS role_name text,
  ADD COLUMN IF NOT EXISTS kommun_name text;

UPDATE public.consultant_profiles AS cp
SET role_name = s.name
FROM public.specialties AS s
WHERE cp.specialty_id = s.id
  AND cp.role_name IS NULL;

UPDATE public.consultant_profiles AS cp
SET kommun_name = r.kommun
FROM public.regions AS r
WHERE cp.region_id = r.id
  AND cp.kommun_name IS NULL;