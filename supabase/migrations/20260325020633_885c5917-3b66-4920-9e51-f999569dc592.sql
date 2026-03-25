
CREATE OR REPLACE FUNCTION public.ref_calculate_profile_status(p_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 VOLATILE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _profile ref_profiles%ROWTYPE;
  _role_profile ref_role_profiles%ROWTYPE;
  _ref_count INTEGER;
  _required INTEGER := 2;
  _has_bankid BOOLEAN;
  _has_ivo BOOLEAN;
  _has_hosp BOOLEAN;
  _ivo_valid TEXT;
  _hosp_valid TEXT;
  _status TEXT;
  _ref_details JSONB := '[]'::JSONB;
  _profiles_id UUID;
BEGIN
  SELECT * INTO _profile FROM public.ref_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('status', 'incomplete', 'checklist', '{}'::JSONB);
  END IF;

  IF _profile.role_type IS NOT NULL THEN
    SELECT * INTO _role_profile FROM public.ref_role_profiles WHERE id = _profile.role_type;
  END IF;

  -- Count active references
  SELECT COUNT(*) INTO _ref_count
  FROM public.ref_references
  WHERE individual_id = p_profile_id AND status = 'active';

  -- Reference details
  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'id', r.id,
    'months_ago', EXTRACT(EPOCH FROM (now() - COALESCE(r.confirmed_at, r.created_at))) / (30.44 * 86400),
    'is_fresh', EXTRACT(EPOCH FROM (now() - COALESCE(r.confirmed_at, r.created_at))) / (30.44 * 86400) <= COALESCE(_role_profile.gold_months, 24),
    'is_warning', EXTRACT(EPOCH FROM (now() - COALESCE(r.confirmed_at, r.created_at))) / (30.44 * 86400) > COALESCE(_role_profile.warn_months, 20),
    'is_expired', EXTRACT(EPOCH FROM (now() - COALESCE(r.confirmed_at, r.created_at))) / (30.44 * 86400) > COALESCE(_role_profile.decay_end_months, 36)
  )), '[]'::JSONB) INTO _ref_details
  FROM public.ref_references r
  WHERE r.individual_id = p_profile_id AND r.status = 'active';

  _has_bankid := _profile.bankid_verified;

  SELECT EXISTS(SELECT 1 FROM public.ref_verifications WHERE profile_id = p_profile_id AND type = 'ivo' AND valid_until > now()) INTO _has_ivo;
  SELECT EXISTS(SELECT 1 FROM public.ref_verifications WHERE profile_id = p_profile_id AND type = 'hosp' AND valid_until > now()) INTO _has_hosp;

  SELECT CASE WHEN valid_until IS NOT NULL THEN to_char(valid_until, 'YYYY-MM-DD') ELSE NULL END INTO _ivo_valid
  FROM public.ref_verifications WHERE profile_id = p_profile_id AND type = 'ivo' AND valid_until > now()
  ORDER BY valid_until DESC LIMIT 1;

  SELECT CASE WHEN valid_until IS NOT NULL THEN to_char(valid_until, 'YYYY-MM-DD') ELSE NULL END INTO _hosp_valid
  FROM public.ref_verifications WHERE profile_id = p_profile_id AND type = 'hosp' AND valid_until > now()
  ORDER BY valid_until DESC LIMIT 1;

  -- Determine status
  IF _ref_count >= _required AND _has_bankid THEN
    _status := 'complete';
  ELSIF _ref_count >= 1 OR _has_bankid THEN
    _status := 'almost';
  ELSE
    _status := 'incomplete';
  END IF;

  -- Sync cache columns on profiles (lookup by user_id since p_profile_id = auth.uid())
  UPDATE public.profiles SET
    has_required_references = (_ref_count >= _required),
    has_valid_ivo = _has_ivo,
    has_valid_hosp = _has_hosp,
    has_bankid = _has_bankid,
    profile_status = _status,
    status_updated_at = NOW()
  WHERE user_id = p_profile_id;

  -- Upsert action items
  INSERT INTO public.action_items (profile_id, type, status, priority)
  VALUES
    (p_profile_id, 'missing_reference', CASE WHEN _ref_count >= _required THEN 'done' ELSE 'pending' END, 1),
    (p_profile_id, 'add_ivo', CASE WHEN _has_ivo THEN 'done' ELSE 'pending' END, 2),
    (p_profile_id, 'add_hosp', CASE WHEN _has_hosp THEN 'done' ELSE 'pending' END, 3)
  ON CONFLICT (profile_id, type) DO UPDATE SET
    status = EXCLUDED.status;

  RETURN jsonb_build_object(
    'status', _status,
    'checklist', jsonb_build_object(
      'references', jsonb_build_object('done', _ref_count >= _required, 'count', _ref_count, 'required', _required, 'details', _ref_details),
      'bankid', jsonb_build_object('done', _has_bankid),
      'ivo', jsonb_build_object('done', _has_ivo, 'validUntil', _ivo_valid),
      'hosp', jsonb_build_object('done', _has_hosp, 'validUntil', _hosp_valid)
    ),
    'effective_role', COALESCE(_profile.role_type, 'specialist'),
    'role_label', COALESCE(_role_profile.label, 'Standard'),
    'gold_months', COALESCE(_role_profile.gold_months, 24),
    'warn_months', COALESCE(_role_profile.warn_months, 20)
  );
END;
$function$;
