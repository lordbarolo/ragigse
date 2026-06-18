
CREATE TABLE IF NOT EXISTS public.edge_function_errors (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  function_name text NOT NULL,
  error_message text NOT NULL,
  stack text,
  context jsonb DEFAULT '{}'::jsonb,
  request_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.edge_function_errors TO authenticated;
GRANT ALL ON public.edge_function_errors TO service_role;

ALTER TABLE public.edge_function_errors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins read edge errors"
ON public.edge_function_errors FOR SELECT
TO authenticated
USING (public.ref_has_role(auth.uid(), 'admin'::ref_app_role));

CREATE INDEX IF NOT EXISTS idx_edge_function_errors_created ON public.edge_function_errors(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_edge_function_errors_function ON public.edge_function_errors(function_name, created_at DESC);

-- Logger callable only by service role
CREATE OR REPLACE FUNCTION public.log_edge_error(
  _function_name text,
  _error_message text,
  _stack text DEFAULT NULL,
  _context jsonb DEFAULT '{}'::jsonb,
  _request_id text DEFAULT NULL
)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.edge_function_errors(function_name, error_message, stack, context, request_id)
  VALUES (_function_name, _error_message, _stack, COALESCE(_context, '{}'::jsonb), _request_id)
  RETURNING id
$$;

REVOKE ALL ON FUNCTION public.log_edge_error(text, text, text, jsonb, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.log_edge_error(text, text, text, jsonb, text) TO service_role;
