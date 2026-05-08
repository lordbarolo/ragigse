
CREATE TABLE public.profile_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  field_name text NOT NULL,
  old_value text,
  new_value text,
  source text NOT NULL DEFAULT 'manual', -- 'ivo' | 'hosp' | 'manual' | 'system'
  source_document_id uuid,
  changed_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_profile_audit_log_user ON public.profile_audit_log(user_id, changed_at DESC);

ALTER TABLE public.profile_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own audit log"
ON public.profile_audit_log FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own audit log"
ON public.profile_audit_log FOR INSERT
WITH CHECK (auth.uid() = user_id);
