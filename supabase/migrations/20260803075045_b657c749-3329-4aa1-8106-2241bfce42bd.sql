CREATE TABLE public.tool_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  choice text NOT NULL,
  own_text text,
  confirm_token text NOT NULL UNIQUE,
  confirmed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_tool_suggestions_confirmed ON public.tool_suggestions (confirmed_at);

GRANT ALL ON public.tool_suggestions TO service_role;

ALTER TABLE public.tool_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read tool suggestions"
ON public.tool_suggestions FOR SELECT TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));