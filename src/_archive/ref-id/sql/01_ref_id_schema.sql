
-- ============================================================
-- REFERLY REFERENCE SYSTEM — Data model migration
-- All tables prefixed with ref_ to avoid conflicts with CompCare tables
-- ============================================================

-- 1. Enums
CREATE TYPE public.ref_app_role AS ENUM ('individual', 'reference_giver', 'client');
CREATE TYPE public.ref_ping_status AS ENUM ('sent', 'confirmed', 'denied', 'expired', 'dismissed');
CREATE TYPE public.ref_reference_status AS ENUM ('pending', 'active', 'revoked', 'expired');

-- 2. Role profiles (decay/trust configuration per role type)
CREATE TABLE public.ref_role_profiles (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  short_label TEXT NOT NULL,
  gold_months INTEGER NOT NULL,
  warn_months INTEGER,
  decay_end_months INTEGER NOT NULL,
  decay_rate_per_month NUMERIC NOT NULL DEFAULT 1,
  description TEXT
);

-- Seed role profiles
INSERT INTO public.ref_role_profiles (id, label, short_label, gold_months, warn_months, decay_end_months, decay_rate_per_month, description) VALUES
  ('specialist', 'Specialistläkare', 'Spec.', 24, 20, 36, 1, 'Specialistläkare med lång giltighetsperiod'),
  ('st_lakare', 'ST-läkare', 'ST', 18, 14, 30, 1.2, 'ST-läkare under specialistutbildning'),
  ('at_lakare', 'AT-läkare', 'AT', 12, 10, 24, 1.5, 'AT-läkare under allmäntjänstgöring'),
  ('leg_lakare', 'Leg. läkare', 'Leg.', 18, 14, 30, 1.2, 'Legitimerad läkare'),
  ('ssk_senior', 'Sjuksköterska (senior)', 'SSK Sr', 24, 20, 36, 1, 'Sjuksköterska med 4+ års erfarenhet'),
  ('ssk_junior', 'Sjuksköterska (junior)', 'SSK Jr', 18, 14, 30, 1.2, 'Sjuksköterska med <4 års erfarenhet');

-- 3. Profiles extension for Referly (keyed by auth.users.id)
CREATE TABLE public.ref_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  specialty TEXT,
  role_type TEXT REFERENCES public.ref_role_profiles(id),
  license_number TEXT,
  phone TEXT,
  bio TEXT,
  linkedin_url TEXT,
  years_licensed INTEGER,
  bankid_verified BOOLEAN NOT NULL DEFAULT false,
  trust_score INTEGER,
  trust_tier TEXT,
  score_breakdown JSONB,
  score_updated_at TIMESTAMPTZ,
  profile_status TEXT,
  status_checklist JSONB,
  status_updated_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ref_profile"
  ON public.ref_profiles FOR SELECT TO authenticated
  USING (id = auth.uid());

CREATE POLICY "Users can update own ref_profile"
  ON public.ref_profiles FOR UPDATE TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can insert own ref_profile"
  ON public.ref_profiles FOR INSERT TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Public profiles are readable"
  ON public.ref_profiles FOR SELECT TO anon
  USING (true);

-- 4. User roles for Referly
CREATE TABLE public.ref_user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role ref_app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.ref_user_roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own ref_roles"
  ON public.ref_user_roles FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- 5. References table
CREATE TABLE public.ref_references (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  individual_id UUID NOT NULL REFERENCES public.ref_profiles(id) ON DELETE CASCADE,
  giver_id UUID REFERENCES public.ref_profiles(id),
  giver_email TEXT NOT NULL,
  giver_name TEXT,
  workplace TEXT NOT NULL,
  relationship TEXT NOT NULL,
  period_start TEXT NOT NULL,
  period_end TEXT,
  invite_token TEXT NOT NULL,
  status ref_reference_status NOT NULL DEFAULT 'pending',
  reference_text TEXT,
  competencies JSONB,
  recommendation_score INTEGER,
  bankid_signature_id TEXT,
  confirmed_at TIMESTAMPTZ,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_references ENABLE ROW LEVEL SECURITY;

-- Owner can read their references
CREATE POLICY "Individuals can read own references"
  ON public.ref_references FOR SELECT TO authenticated
  USING (individual_id = auth.uid());

-- Givers can read references they gave
CREATE POLICY "Givers can read given references"
  ON public.ref_references FOR SELECT TO authenticated
  USING (giver_id = auth.uid());

-- Authenticated users can insert (invitations)
CREATE POLICY "Users can insert references"
  ON public.ref_references FOR INSERT TO authenticated
  WITH CHECK (individual_id = auth.uid());

-- Owner and giver can update
CREATE POLICY "Owner or giver can update references"
  ON public.ref_references FOR UPDATE TO authenticated
  USING (individual_id = auth.uid() OR giver_id = auth.uid())
  WITH CHECK (individual_id = auth.uid() OR giver_id = auth.uid());

-- 6. Pings table (re-confirmation requests)
CREATE TABLE public.ref_pings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reference_id UUID NOT NULL REFERENCES public.ref_references(id) ON DELETE CASCADE,
  requested_by UUID NOT NULL REFERENCES public.ref_profiles(id),
  requester_name TEXT NOT NULL,
  response_token TEXT NOT NULL,
  status ref_ping_status NOT NULL DEFAULT 'sent',
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at TIMESTAMPTZ NOT NULL,
  responded_at TIMESTAMPTZ,
  confirmed_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_pings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read pings on own references"
  ON public.ref_pings FOR SELECT TO authenticated
  USING (
    reference_id IN (
      SELECT id FROM public.ref_references
      WHERE individual_id = auth.uid() OR giver_id = auth.uid()
    )
  );

-- 7. Profile views
CREATE TABLE public.ref_profile_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.ref_profiles(id) ON DELETE CASCADE,
  viewer_id UUID REFERENCES public.ref_profiles(id),
  viewer_fingerprint TEXT,
  referrer TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.ref_profile_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile views"
  ON public.ref_profile_views FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Anyone can insert profile views"
  ON public.ref_profile_views FOR INSERT TO anon, authenticated
  WITH CHECK (true);

-- 8. Verifications (IVO / HOSP)
CREATE TABLE public.ref_verifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES public.ref_profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  result TEXT NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  valid_until TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '6 months'),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ref_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own verifications"
  ON public.ref_verifications FOR SELECT TO authenticated
  USING (profile_id = auth.uid());

CREATE POLICY "Users can insert own verifications"
  ON public.ref_verifications FOR INSERT TO authenticated
  WITH CHECK (profile_id = auth.uid());

-- 9. Verified domains
CREATE TABLE public.ref_verified_domains (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  domain TEXT NOT NULL,
  org_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE public.ref_verified_domains ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read verified domains"
  ON public.ref_verified_domains FOR SELECT TO anon, authenticated
  USING (true);

-- ============================================================
-- DATABASE FUNCTIONS
-- ============================================================

-- has_role (security definer)
CREATE OR REPLACE FUNCTION public.ref_has_role(_user_id UUID, _role ref_app_role)
RETURNS BOOLEAN
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.ref_user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- get_reference_by_invite_token
CREATE OR REPLACE FUNCTION public.ref_get_reference_by_invite_token(_token TEXT)
RETURNS TABLE (
  id UUID, individual_id UUID, individual_name TEXT, individual_specialty TEXT,
  giver_email TEXT, giver_id UUID, giver_name TEXT, workplace TEXT, relationship TEXT,
  period_start TEXT, period_end TEXT, invite_token TEXT, status ref_reference_status,
  reference_text TEXT, competencies JSONB, recommendation_score INTEGER,
  confirmed_at TIMESTAMPTZ, created_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    r.id, r.individual_id,
    p.full_name AS individual_name,
    p.specialty AS individual_specialty,
    r.giver_email, r.giver_id, r.giver_name, r.workplace, r.relationship,
    r.period_start, r.period_end, r.invite_token, r.status,
    r.reference_text, r.competencies, r.recommendation_score,
    r.confirmed_at, r.created_at
  FROM public.ref_references r
  JOIN public.ref_profiles p ON p.id = r.individual_id
  WHERE r.invite_token = _token
$$;

-- submit_reference
CREATE OR REPLACE FUNCTION public.ref_submit_reference(
  _token TEXT, _giver_id UUID, _giver_name TEXT,
  _reference_text TEXT, _competencies JSONB, _recommendation_score INTEGER
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ref_references
  SET
    giver_id = _giver_id,
    giver_name = _giver_name,
    reference_text = _reference_text,
    competencies = _competencies,
    recommendation_score = _recommendation_score,
    status = 'active',
    confirmed_at = now()
  WHERE invite_token = _token AND status = 'pending';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Reference not found or already submitted';
  END IF;
END;
$$;

-- create_ping
CREATE OR REPLACE FUNCTION public.ref_create_ping(_reference_id UUID, _requester_name TEXT)
RETURNS UUID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ping_id UUID;
  _existing INTEGER;
BEGIN
  -- Check for existing pending ping
  SELECT COUNT(*) INTO _existing
  FROM public.ref_pings
  WHERE reference_id = _reference_id AND status = 'sent' AND expires_at > now();

  IF _existing > 0 THEN
    RAISE EXCEPTION 'A pending ping already exists for this reference';
  END IF;

  INSERT INTO public.ref_pings (reference_id, requested_by, requester_name, response_token, expires_at)
  VALUES (_reference_id, auth.uid(), _requester_name, encode(gen_random_bytes(16), 'hex'), now() + interval '14 days')
  RETURNING id INTO _ping_id;

  RETURN _ping_id;
END;
$$;

-- get_ping_by_token
CREATE OR REPLACE FUNCTION public.ref_get_ping_by_token(_token TEXT)
RETURNS TABLE (
  id UUID, reference_id UUID, requester_name TEXT,
  status ref_ping_status, response_token TEXT,
  sent_at TIMESTAMPTZ, expires_at TIMESTAMPTZ, responded_at TIMESTAMPTZ,
  reference_text TEXT, competencies JSONB, recommendation_score INTEGER,
  individual_name TEXT, individual_specialty TEXT,
  workplace TEXT, relationship TEXT, period_start TEXT, period_end TEXT,
  confirmed_at TIMESTAMPTZ
)
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    pg.id, pg.reference_id, pg.requester_name,
    pg.status, pg.response_token,
    pg.sent_at, pg.expires_at, pg.responded_at,
    r.reference_text, r.competencies, r.recommendation_score,
    p.full_name AS individual_name, p.specialty AS individual_specialty,
    r.workplace, r.relationship, r.period_start, r.period_end,
    r.confirmed_at
  FROM public.ref_pings pg
  JOIN public.ref_references r ON r.id = pg.reference_id
  JOIN public.ref_profiles p ON p.id = r.individual_id
  WHERE pg.response_token = _token
$$;

-- respond_to_ping
CREATE OR REPLACE FUNCTION public.ref_respond_to_ping(_token TEXT, _status ref_ping_status)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.ref_pings
  SET status = _status, responded_at = now(),
      confirmed_until = CASE WHEN _status = 'confirmed' THEN now() + interval '12 months' ELSE NULL END
  WHERE response_token = _token AND status = 'sent';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Ping not found or already responded to';
  END IF;
END;
$$;

-- log_profile_view
CREATE OR REPLACE FUNCTION public.ref_log_profile_view(_profile_id UUID, _fingerprint TEXT DEFAULT NULL, _referrer TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.ref_profile_views (profile_id, viewer_id, viewer_fingerprint, referrer)
  VALUES (_profile_id, auth.uid(), _fingerprint, _referrer);
END;
$$;

-- calculate_profile_status
CREATE OR REPLACE FUNCTION public.ref_calculate_profile_status(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

-- calculate_trust_score
CREATE OR REPLACE FUNCTION public.ref_calculate_trust_score(p_profile_id UUID)
RETURNS JSONB
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _profile ref_profiles%ROWTYPE;
  _role_profile ref_role_profiles%ROWTYPE;
  _role_earned INTEGER := 0;
  _role_max INTEGER := 30;
  _chiefs INTEGER := 0;
  _colleagues INTEGER := 0;
  _domain_earned INTEGER := 0;
  _domain_max INTEGER := 20;
  _verified_domains INTEGER := 0;
  _recency_earned INTEGER := 0;
  _recency_max INTEGER := 25;
  _freshest_months NUMERIC := 999;
  _ping_earned INTEGER := 0;
  _ping_max INTEGER := 15;
  _has_active_ping BOOLEAN := false;
  _compliance_earned INTEGER := 0;
  _compliance_max INTEGER := 10;
  _total INTEGER;
  _tier TEXT;
BEGIN
  SELECT * INTO _profile FROM public.ref_profiles WHERE id = p_profile_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('total', 0, 'tier', 'incomplete');
  END IF;

  IF _profile.role_type IS NOT NULL THEN
    SELECT * INTO _role_profile FROM public.ref_role_profiles WHERE id = _profile.role_type;
  END IF;

  -- Role scoring: chiefs = 15pts each (max 2), colleagues = 5pts each
  SELECT
    COUNT(*) FILTER (WHERE relationship IN ('Chef', 'Handledare')),
    COUNT(*) FILTER (WHERE relationship IN ('Kollega', 'Annan'))
  INTO _chiefs, _colleagues
  FROM public.ref_references
  WHERE individual_id = p_profile_id AND status = 'active';

  _role_earned := LEAST(_chiefs * 15, 30) + LEAST(_colleagues * 5, 10);
  _role_earned := LEAST(_role_earned, _role_max);

  -- Domain scoring
  SELECT COUNT(DISTINCT vd.id) INTO _verified_domains
  FROM public.ref_references r
  JOIN public.ref_verified_domains vd ON r.giver_email LIKE '%@' || vd.domain
  WHERE r.individual_id = p_profile_id AND r.status = 'active';
  _domain_earned := LEAST(_verified_domains * 10, _domain_max);

  -- Recency
  SELECT COALESCE(MIN(EXTRACT(EPOCH FROM (now() - COALESCE(r.confirmed_at, r.created_at))) / (30.44 * 86400)), 999)
  INTO _freshest_months
  FROM public.ref_references r
  WHERE r.individual_id = p_profile_id AND r.status = 'active';

  IF _freshest_months <= COALESCE(_role_profile.gold_months, 24) THEN
    _recency_earned := _recency_max;
  ELSIF _freshest_months <= COALESCE(_role_profile.decay_end_months, 36) THEN
    _recency_earned := GREATEST(0, _recency_max - FLOOR((_freshest_months - COALESCE(_role_profile.gold_months, 24)) * COALESCE(_role_profile.decay_rate_per_month, 1))::INTEGER);
  ELSE
    _recency_earned := 0;
  END IF;

  -- Ping scoring
  SELECT EXISTS(
    SELECT 1 FROM public.ref_pings pg
    JOIN public.ref_references r ON r.id = pg.reference_id
    WHERE r.individual_id = p_profile_id AND pg.status = 'confirmed' AND pg.confirmed_until > now()
  ) INTO _has_active_ping;
  IF _has_active_ping THEN _ping_earned := _ping_max; END IF;

  -- Compliance
  IF EXISTS(SELECT 1 FROM public.ref_verifications WHERE profile_id = p_profile_id AND type = 'ivo' AND valid_until > now()) THEN
    _compliance_earned := _compliance_earned + 5;
  END IF;
  IF EXISTS(SELECT 1 FROM public.ref_verifications WHERE profile_id = p_profile_id AND type = 'hosp' AND valid_until > now()) THEN
    _compliance_earned := _compliance_earned + 5;
  END IF;

  _total := _role_earned + _domain_earned + _recency_earned + _ping_earned + _compliance_earned;

  IF _total >= 90 THEN _tier := 'elite';
  ELSIF _total >= 70 THEN _tier := 'verified_pro';
  ELSIF _total >= 50 THEN _tier := 'basic';
  ELSE _tier := 'incomplete';
  END IF;

  -- Update profile
  UPDATE public.ref_profiles
  SET trust_score = _total, trust_tier = _tier,
      score_breakdown = jsonb_build_object(
        'role', jsonb_build_object('earned', _role_earned, 'max', _role_max, 'chiefs', _chiefs, 'colleagues', _colleagues),
        'domain', jsonb_build_object('earned', _domain_earned, 'max', _domain_max, 'verified_count', _verified_domains),
        'recency', jsonb_build_object('earned', _recency_earned, 'max', _recency_max, 'freshest_months', _freshest_months, 'role_profile', COALESCE(_profile.role_type, 'specialist')),
        'ping', jsonb_build_object('earned', _ping_earned, 'max', _ping_max, 'has_active_ping', _has_active_ping),
        'compliance', jsonb_build_object('earned', _compliance_earned, 'max', _compliance_max)
      ),
      score_updated_at = now()
  WHERE id = p_profile_id;

  RETURN jsonb_build_object(
    'total', _total,
    'tier', _tier,
    'breakdown', jsonb_build_object(
      'role', jsonb_build_object('earned', _role_earned, 'max', _role_max, 'chiefs', _chiefs, 'colleagues', _colleagues),
      'domain', jsonb_build_object('earned', _domain_earned, 'max', _domain_max, 'verified_count', _verified_domains),
      'recency', jsonb_build_object('earned', _recency_earned, 'max', _recency_max, 'freshest_months', _freshest_months, 'role_profile', COALESCE(_profile.role_type, 'specialist')),
      'ping', jsonb_build_object('earned', _ping_earned, 'max', _ping_max, 'has_active_ping', _has_active_ping),
      'compliance', jsonb_build_object('earned', _compliance_earned, 'max', _compliance_max)
    )
  );
END;
$$;
