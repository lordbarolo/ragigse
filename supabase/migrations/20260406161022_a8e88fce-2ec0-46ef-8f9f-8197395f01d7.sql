
CREATE TABLE public.chat_answer_reports (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_content text NOT NULL,
  context_json jsonb DEFAULT '{}'::jsonb,
  user_email text,
  page_url text,
  status text NOT NULL DEFAULT 'new',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_answer_reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert chat answer reports"
  ON public.chat_answer_reports FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Service role reads chat answer reports"
  ON public.chat_answer_reports FOR SELECT
  TO service_role
  USING (true);
