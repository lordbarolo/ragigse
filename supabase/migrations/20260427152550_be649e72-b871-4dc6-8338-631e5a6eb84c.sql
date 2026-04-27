-- Ta bort AT-läkare som rollprofil. AT-läkare ska inte förekomma på CompCare.
DELETE FROM public.ref_role_profiles WHERE id = 'at_lakare';