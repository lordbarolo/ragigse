CREATE TABLE public.assistant_memory (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  content TEXT NOT NULL,
  source_question TEXT,
  origin TEXT NOT NULL DEFAULT 'assistant',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX assistant_memory_user_idx ON public.assistant_memory (user_id, updated_at DESC);
CREATE UNIQUE INDEX assistant_memory_user_content_idx ON public.assistant_memory (user_id, lower(content));

GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_memory TO authenticated;
GRANT ALL ON public.assistant_memory TO service_role;

ALTER TABLE public.assistant_memory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "assistant_memory_owner_select"
  ON public.assistant_memory FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "assistant_memory_owner_insert"
  ON public.assistant_memory FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "assistant_memory_owner_update"
  ON public.assistant_memory FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "assistant_memory_owner_delete"
  ON public.assistant_memory FOR DELETE TO authenticated
  USING (user_id = auth.uid());

CREATE TRIGGER assistant_memory_set_updated_at
  BEFORE UPDATE ON public.assistant_memory
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();