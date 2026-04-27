CREATE OR REPLACE FUNCTION public.check_ai_rate_limit(_user_id uuid, _daily_limit integer DEFAULT 30)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _is_admin boolean;
  _used integer;
  _day_start timestamptz;
BEGIN
  IF _user_id IS NULL THEN
    RETURN jsonb_build_object('allowed', false, 'used', 0, 'limit', _daily_limit, 'reason', 'no_user');
  END IF;

  -- Admins bypass rate limit
  SELECT public.ref_has_role(_user_id, 'admin'::ref_app_role) INTO _is_admin;
  IF _is_admin THEN
    RETURN jsonb_build_object('allowed', true, 'used', 0, 'limit', null, 'is_admin', true);
  END IF;

  -- Day starts at Europe/Stockholm midnight
  _day_start := date_trunc('day', now() AT TIME ZONE 'Europe/Stockholm') AT TIME ZONE 'Europe/Stockholm';

  SELECT COUNT(*)::int INTO _used
  FROM public.ai_usage_logs
  WHERE user_id = _user_id
    AND created_at >= _day_start
    AND status = 'success';

  RETURN jsonb_build_object(
    'allowed', _used < _daily_limit,
    'used', _used,
    'limit', _daily_limit,
    'remaining', GREATEST(0, _daily_limit - _used),
    'resets_at', (_day_start + interval '1 day')
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.check_ai_rate_limit(uuid, integer) TO authenticated, anon, service_role;

CREATE INDEX IF NOT EXISTS idx_ai_usage_logs_user_created
  ON public.ai_usage_logs (user_id, created_at DESC)
  WHERE status = 'success';