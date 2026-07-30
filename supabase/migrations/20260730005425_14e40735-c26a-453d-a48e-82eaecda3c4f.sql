-- consultant_documents
CREATE TABLE IF NOT EXISTS public.consultant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz,
  notes text,
  verified boolean NOT NULL DEFAULT false,
  verified_at timestamptz,
  verified_by uuid
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_documents TO authenticated;
GRANT ALL ON public.consultant_documents TO service_role;
ALTER TABLE public.consultant_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own documents" ON public.consultant_documents
  FOR ALL TO authenticated
  USING (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()))
  WITH CHECK (consultant_id IN (SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()));

-- document_shares
CREATE TABLE IF NOT EXISTS public.document_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  document_ids uuid[] NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz,
  recipient_label text,
  recipient_email text,
  view_count integer NOT NULL DEFAULT 0,
  last_viewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_document_shares_user ON public.document_shares(user_id);
CREATE INDEX IF NOT EXISTS idx_document_shares_token ON public.document_shares(token);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_shares TO authenticated;
GRANT ALL ON public.document_shares TO service_role;
ALTER TABLE public.document_shares ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owner manages own shares" ON public.document_shares
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- document_share_views
CREATE TABLE IF NOT EXISTS public.document_share_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  share_id uuid NOT NULL REFERENCES public.document_shares(id) ON DELETE CASCADE,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  document_id uuid,
  action text NOT NULL DEFAULT 'view'
);
CREATE INDEX IF NOT EXISTS idx_document_share_views_share ON public.document_share_views(share_id, viewed_at DESC);
GRANT SELECT ON public.document_share_views TO authenticated;
GRANT ALL ON public.document_share_views TO service_role;
ALTER TABLE public.document_share_views ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Owners read views of their shares" ON public.document_share_views
  FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.document_shares ds WHERE ds.id = document_share_views.share_id AND ds.user_id = auth.uid()));

-- ref_profiles (used by signup trigger + profile page)
CREATE TABLE IF NOT EXISTS public.ref_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  specialty text,
  role_type text,
  license_number text,
  phone text,
  bio text,
  linkedin_url text,
  years_licensed integer,
  bankid_verified boolean NOT NULL DEFAULT false,
  trust_score integer,
  trust_tier text,
  score_breakdown jsonb,
  score_updated_at timestamptz,
  profile_status text,
  status_checklist jsonb,
  status_updated_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.ref_profiles TO authenticated;
GRANT ALL ON public.ref_profiles TO service_role;
ALTER TABLE public.ref_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own ref_profile" ON public.ref_profiles
  FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "Users update own ref_profile" ON public.ref_profiles
  FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());
CREATE POLICY "Users insert own ref_profile" ON public.ref_profiles
  FOR INSERT TO authenticated WITH CHECK (id = auth.uid());