-- Enum för signeringsstatus
CREATE TYPE public.bankid_signature_status AS ENUM (
  'pending',
  'complete',
  'failed',
  'cancelled',
  'expired'
);

-- Enum för flödestyp (utbyggbar)
CREATE TYPE public.bankid_signature_flow AS ENUM (
  'verify_representation'
  -- Framtida värden läggs till med ALTER TYPE när användaren godkänner
);

-- Huvudtabell
CREATE TABLE public.bankid_signatures (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Vem och vad
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  flow public.bankid_signature_flow NOT NULL,
  subject_type text NOT NULL,
  subject_id uuid,

  -- BankSignering-referens
  order_ref text NOT NULL UNIQUE,
  status public.bankid_signature_status NOT NULL DEFAULT 'pending',

  -- Initiering
  end_user_ip text,
  user_agent text,

  -- Resultat (fylls vid complete)
  personal_number_hash text,
  signer_name text,
  given_name text,
  surname text,
  signature text,
  ocsp_response text,
  completion_data jsonb,

  -- Felhantering
  hint_code text,
  error_message text,

  -- Tidsstämplar
  started_at timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Index
CREATE INDEX idx_bankid_signatures_user_id ON public.bankid_signatures(user_id);
CREATE INDEX idx_bankid_signatures_subject ON public.bankid_signatures(subject_type, subject_id);
CREATE INDEX idx_bankid_signatures_status ON public.bankid_signatures(status);
CREATE INDEX idx_bankid_signatures_flow ON public.bankid_signatures(flow);

-- Trigger för updated_at
CREATE TRIGGER trg_bankid_signatures_updated_at
BEFORE UPDATE ON public.bankid_signatures
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS
ALTER TABLE public.bankid_signatures ENABLE ROW LEVEL SECURITY;

-- Användare ser sina egna
CREATE POLICY "Users can view their own signatures"
ON public.bankid_signatures
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admins ser alla (via befintlig ref_has_role-funktion)
CREATE POLICY "Admins can view all signatures"
ON public.bankid_signatures
FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::public.ref_app_role));

-- INGA insert/update/delete-policys för authenticated/anon
-- => endast service_role (edge functions) får skriva
-- => ingen får radera (bevisbevarande)