
-- Simplify profiles: drop email column (auth.users already has it)
ALTER TABLE public.profiles DROP COLUMN IF EXISTS email;
ALTER TABLE public.profiles DROP COLUMN IF EXISTS updated_at;

-- Create analyses table
CREATE TABLE public.analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role text,
  location text,
  employment_type text,
  current_salary integer,
  result_data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.analyses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own analyses"
  ON public.analyses FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Allow service role to insert (from edge function)
-- No public insert needed since edge function uses service role
