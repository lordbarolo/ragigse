-- Add email tracking columns
ALTER TABLE public.ref_representation_requests
  ADD COLUMN IF NOT EXISTS email_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS email_status text DEFAULT 'pending';

-- Unique partial index: only ONE signed representation per (consultant_email, assignment_id)
CREATE UNIQUE INDEX IF NOT EXISTS ref_representation_unique_signed
  ON public.ref_representation_requests (lower(consultant_email), assignment_id)
  WHERE status = 'signed';

-- Lookup index for collision checks
CREATE INDEX IF NOT EXISTS ref_representation_lookup
  ON public.ref_representation_requests (lower(consultant_email), assignment_id, status);