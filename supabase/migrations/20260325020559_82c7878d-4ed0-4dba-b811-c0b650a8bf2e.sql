
CREATE TABLE action_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL,
  type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, type)
);

ALTER TABLE action_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own actions" ON action_items
  FOR SELECT TO authenticated USING (profile_id = auth.uid());

CREATE POLICY "Service role manages actions" ON action_items
  FOR ALL TO service_role USING (true) WITH CHECK (true);
