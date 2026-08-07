CREATE TABLE public.consultant_documents (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN ('legitimation','hosp','ivo','cv','forsakring')),
  file_path text NOT NULL,
  file_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, doc_type)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.consultant_documents TO authenticated;
GRANT ALL ON public.consultant_documents TO service_role;
ALTER TABLE public.consultant_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own documents" ON public.consultant_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can add own documents" ON public.consultant_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own documents" ON public.consultant_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id AND status = 'pending');
CREATE POLICY "Users can delete own documents" ON public.consultant_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);