-- Add write capability to radar_api_keys
ALTER TABLE public.radar_api_keys
  ADD COLUMN IF NOT EXISTS can_write boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS write_per_hour integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS write_per_day integer NOT NULL DEFAULT 1000,
  ADD COLUMN IF NOT EXISTS max_write_rows_per_request integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS share_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS partner_source text;

-- Add partner attribution to calloff_imports
ALTER TABLE public.calloff_imports
  ADD COLUMN IF NOT EXISTS partner_source text,
  ADD COLUMN IF NOT EXISTS partner_share_data boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS validation_flags jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS dedup_hash text;

-- Index för dedup-koll
CREATE INDEX IF NOT EXISTS idx_calloff_imports_dedup_hash 
  ON public.calloff_imports(dedup_hash) 
  WHERE dedup_hash IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_calloff_imports_partner_source 
  ON public.calloff_imports(partner_source) 
  WHERE partner_source IS NOT NULL;

-- Uppdatera publik läsbarhet: partner-data syns bara om share_data=true ELLER om ingen partner-källa
DROP POLICY IF EXISTS "Anyone can read calloff_imports" ON public.calloff_imports;

CREATE POLICY "Public reads only shared or own calloff_imports"
ON public.calloff_imports
FOR SELECT
TO public
USING (
  partner_source IS NULL 
  OR partner_share_data = true
);

-- Service role behåller full åtkomst (edge functions kan filtrera per nyckel)
CREATE POLICY "Service role full access calloff_imports"
ON public.calloff_imports
FOR ALL
TO service_role
USING (true)
WITH CHECK (true);