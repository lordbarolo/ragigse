UPDATE public.contract_version_rates cvr
SET timpris_kund = 1953
FROM public.contract_versions cv
WHERE cvr.version_id = cv.id
  AND cv.version_label = 'v1.6'
  AND cvr.yrkeskategori = 'Specialistläkare Barn- och ungdomspsykiatri'
  AND cvr.zon = 'Zon 3'
  AND cvr.timpris_kund = 1678;