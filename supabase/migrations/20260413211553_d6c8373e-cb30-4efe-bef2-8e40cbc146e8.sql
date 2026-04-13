
ALTER TABLE public.invoice_reviews
  ADD COLUMN IF NOT EXISTS grundpris numeric,
  ADD COLUMN IF NOT EXISTS yrkeskategori text,
  ADD COLUMN IF NOT EXISTS user_rates jsonb,
  ADD COLUMN IF NOT EXISTS is_handwritten boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS manual_tidrapport jsonb,
  ADD COLUMN IF NOT EXISTS extracted_faktura jsonb,
  ADD COLUMN IF NOT EXISTS extracted_tidrapport jsonb,
  ADD COLUMN IF NOT EXISTS extraction_confidence jsonb,
  ADD COLUMN IF NOT EXISTS extraction_model text,
  ADD COLUMN IF NOT EXISTS confirmed_tidrapport jsonb,
  ADD COLUMN IF NOT EXISTS confirmed_at timestamptz;
