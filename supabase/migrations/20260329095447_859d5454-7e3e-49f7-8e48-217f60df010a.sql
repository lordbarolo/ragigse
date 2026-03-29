
-- Enum for representation request status
CREATE TYPE public.ref_representation_status AS ENUM ('pending', 'signed', 'declined', 'expired');

-- Main table for BF → consultant representation requests
CREATE TABLE public.ref_representation_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id uuid NOT NULL,
  consultant_email text NOT NULL,
  consultant_user_id uuid,
  assignment_id text NOT NULL,
  region text NOT NULL,
  status public.ref_representation_status NOT NULL DEFAULT 'pending',
  secret_token uuid NOT NULL DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  signed_at timestamptz,
  bankid_ref text,
  payload jsonb,
  verification_id uuid,
  agency_name text NOT NULL DEFAULT ''
);

-- Indexes
CREATE INDEX idx_repr_req_token ON public.ref_representation_requests(secret_token);
CREATE INDEX idx_repr_req_agency ON public.ref_representation_requests(agency_id);
CREATE INDEX idx_repr_req_consultant ON public.ref_representation_requests(consultant_email);

-- Enable RLS
ALTER TABLE public.ref_representation_requests ENABLE ROW LEVEL SECURITY;

-- RLS: Agency can read their own requests
CREATE POLICY "Agency reads own requests"
  ON public.ref_representation_requests FOR SELECT
  TO authenticated
  USING (agency_id = auth.uid());

-- RLS: Agency can create requests
CREATE POLICY "Agency creates requests"
  ON public.ref_representation_requests FOR INSERT
  TO authenticated
  WITH CHECK (agency_id = auth.uid());

-- RLS: Service role full access (for edge functions)
CREATE POLICY "Service role full access on repr requests"
  ON public.ref_representation_requests FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- RLS: Consultant can read requests addressed to them
CREATE POLICY "Consultant reads own requests"
  ON public.ref_representation_requests FOR SELECT
  TO authenticated
  USING (consultant_user_id = auth.uid());
