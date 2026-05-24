
ALTER TABLE public.consultant_documents
  ADD COLUMN IF NOT EXISTS extracted_name text,
  ADD COLUMN IF NOT EXISTS name_check_status text,
  ADD COLUMN IF NOT EXISTS name_check_at timestamptz;
