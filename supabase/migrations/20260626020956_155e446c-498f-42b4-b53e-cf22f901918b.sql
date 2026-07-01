-- 1) Remove duplicate "Legitimerad läkare" rows with typ='Läkare' (keep typ='Grundpris')
DELETE FROM public.contract_version_rates r
USING public.contract_versions cv
WHERE r.version_id = cv.id
  AND cv.version_label = 'v1.6'
  AND r.yrkeskategori = 'Legitimerad läkare'
  AND r.typ = 'Läkare';

-- 2) Dedupe Klinisk genetik / Klinisk kemi Zon 3 — keep oldest row per (yrkeskategori, zon, typ)
DELETE FROM public.contract_version_rates r
USING (
  SELECT id FROM (
    SELECT r2.id,
           row_number() OVER (
             PARTITION BY r2.version_id, r2.yrkeskategori, r2.zon, r2.typ, r2.timpris_kund
             ORDER BY r2.id
           ) AS rn
    FROM public.contract_version_rates r2
    JOIN public.contract_versions cv2 ON cv2.id = r2.version_id
    WHERE cv2.version_label = 'v1.6'
      AND r2.yrkeskategori IN ('Specialistläkare Klinisk genetik', 'Specialistläkare Klinisk kemi')
      AND r2.zon = 'Zon 3'
  ) ranked
  WHERE rn > 1
) dupes
WHERE r.id = dupes.id;