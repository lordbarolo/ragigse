
-- Update ref_get_public_profile to include verification_level in references
CREATE OR REPLACE FUNCTION public.ref_get_public_profile(_profile_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _profile ref_profiles%ROWTYPE;
  _ref_count INTEGER;
  _competency_agg JSONB;
  _avg_score NUMERIC;
  _has_ivo BOOLEAN;
  _has_hosp BOOLEAN;
  _has_bankid BOOLEAN;
  _trust_score INTEGER;
  _trust_tier TEXT;
  _references JSONB;
BEGIN
  SELECT * INTO _profile FROM public.ref_profiles WHERE id = _profile_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  SELECT COUNT(*) INTO _ref_count
  FROM public.ref_references WHERE individual_id = _profile_id AND status = 'active';

  SELECT COALESCE(AVG(recommendation_score), 0) INTO _avg_score
  FROM public.ref_references WHERE individual_id = _profile_id AND status = 'active';

  SELECT COALESCE(jsonb_object_agg(comp, cnt), '{}'::JSONB) INTO _competency_agg
  FROM (
    SELECT elem::TEXT AS comp, COUNT(*) AS cnt
    FROM public.ref_references r, jsonb_array_elements_text(r.competencies) AS elem
    WHERE r.individual_id = _profile_id AND r.status = 'active'
    GROUP BY elem
    ORDER BY cnt DESC
  ) sub;

  SELECT EXISTS(SELECT 1 FROM public.ref_verifications WHERE profile_id = _profile_id AND type = 'ivo' AND valid_until > now()) INTO _has_ivo;
  SELECT EXISTS(SELECT 1 FROM public.ref_verifications WHERE profile_id = _profile_id AND type = 'hosp' AND valid_until > now()) INTO _has_hosp;
  _has_bankid := _profile.bankid_verified;

  _trust_score := COALESCE(_profile.trust_score, 0);
  _trust_tier := COALESCE(_profile.trust_tier, 'incomplete');

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
    'relationship', r.relationship,
    'workplace', r.workplace,
    'period_start', r.period_start,
    'period_end', r.period_end,
    'recommendation_score', r.recommendation_score,
    'competencies', r.competencies,
    'confirmed_at', r.confirmed_at,
    'verification_level', r.verification_level,
    'last_confirmed_at', r.last_confirmed_at,
    'attachable', r.attachable
  ) ORDER BY r.confirmed_at DESC), '[]'::JSONB) INTO _references
  FROM public.ref_references r
  WHERE r.individual_id = _profile_id AND r.status = 'active';

  -- Log view
  INSERT INTO public.ref_profile_views (profile_id) VALUES (_profile_id);

  RETURN jsonb_build_object(
    'full_name', _profile.full_name,
    'specialty', _profile.specialty,
    'bio', _profile.bio,
    'years_licensed', _profile.years_licensed,
    'trust_score', _trust_score,
    'trust_tier', _trust_tier,
    'score_updated_at', _profile.score_updated_at,
    'score_breakdown', _profile.score_breakdown,
    'reference_count', _ref_count,
    'avg_recommendation', ROUND(_avg_score, 1),
    'competencies', _competency_agg,
    'verifications', jsonb_build_object(
      'bankid', _has_bankid,
      'ivo', _has_ivo,
      'hosp', _has_hosp
    ),
    'references', _references
  );
END;
$function$;
