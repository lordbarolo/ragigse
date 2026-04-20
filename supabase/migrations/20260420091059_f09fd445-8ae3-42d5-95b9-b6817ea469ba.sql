
-- 1. Rensa testdata
DELETE FROM public.ref_representation_requests;

-- 2. Lägg till nya kolumner för det utvidgade intyget
ALTER TABLE public.ref_representation_requests
  ADD COLUMN IF NOT EXISTS unit text,
  ADD COLUMN IF NOT EXISTS consultant_name text,
  ADD COLUMN IF NOT EXISTS competence text,
  ADD COLUMN IF NOT EXISTS period_start date,
  ADD COLUMN IF NOT EXISTS period_end date,
  ADD COLUMN IF NOT EXISTS response_deadline date,
  ADD COLUMN IF NOT EXISTS agency_org_number text,
  ADD COLUMN IF NOT EXISTS superseded_by uuid REFERENCES public.ref_representation_requests(id);

-- 3. assignment_id ska inte längre vara obligatorisk
ALTER TABLE public.ref_representation_requests
  ALTER COLUMN assignment_id DROP NOT NULL;

-- 4. Ta bort gammalt unique-index och skapa nytt baserat på (email, region, deadline)
DROP INDEX IF EXISTS public.ref_representation_unique_signed;

CREATE UNIQUE INDEX ref_representation_active_exclusivity
  ON public.ref_representation_requests (
    lower(consultant_email),
    region,
    response_deadline
  )
  WHERE status = 'signed' AND superseded_by IS NULL;

-- 5. Index för att snabbt hitta aktiva exklusiviteter
CREATE INDEX IF NOT EXISTS idx_repr_active_lookup
  ON public.ref_representation_requests (consultant_email, region, response_deadline)
  WHERE status = 'signed' AND superseded_by IS NULL;
