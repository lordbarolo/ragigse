
-- 1. Add consultant_profile_id FK to reports
ALTER TABLE public.reports
  ADD COLUMN consultant_profile_id uuid REFERENCES public.consultant_profiles(id) ON DELETE SET NULL;

-- 2. Update handle_new_user trigger to also create consultant_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Create base profile
  INSERT INTO public.profiles (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;

  -- Create consultant profile
  INSERT INTO public.consultant_profiles (user_id, onboarding_step)
  VALUES (NEW.id, 0)
  ON CONFLICT DO NOTHING;

  RETURN NEW;
END;
$$;

-- 3. Create consultant_documents table
CREATE TABLE public.consultant_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  document_type text NOT NULL, -- 'certificate', 'id', 'license', 'contract', 'other'
  file_name text NOT NULL,
  file_url text NOT NULL,
  uploaded_at timestamp with time zone NOT NULL DEFAULT now(),
  expires_at timestamp with time zone,
  notes text
);

ALTER TABLE public.consultant_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own documents"
  ON public.consultant_documents FOR SELECT TO authenticated
  USING (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own documents"
  ON public.consultant_documents FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own documents"
  ON public.consultant_documents FOR UPDATE TO authenticated
  USING (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own documents"
  ON public.consultant_documents FOR DELETE TO authenticated
  USING (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

-- 4. Create consultant_references table
CREATE TABLE public.consultant_references (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  consultant_id uuid NOT NULL REFERENCES public.consultant_profiles(id) ON DELETE CASCADE,
  reference_name text NOT NULL,
  reference_role text,
  reference_org text,
  reference_phone text,
  reference_email text,
  relationship text, -- 'manager', 'colleague', 'client'
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  notes text
);

ALTER TABLE public.consultant_references ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own references"
  ON public.consultant_references FOR SELECT TO authenticated
  USING (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can insert own references"
  ON public.consultant_references FOR INSERT TO authenticated
  WITH CHECK (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own references"
  ON public.consultant_references FOR UPDATE TO authenticated
  USING (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ))
  WITH CHECK (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own references"
  ON public.consultant_references FOR DELETE TO authenticated
  USING (consultant_id IN (
    SELECT id FROM public.consultant_profiles WHERE user_id = auth.uid()
  ));

-- 5. Add unique constraint on consultant_profiles.user_id for the trigger's ON CONFLICT
ALTER TABLE public.consultant_profiles ADD CONSTRAINT consultant_profiles_user_id_unique UNIQUE (user_id);
