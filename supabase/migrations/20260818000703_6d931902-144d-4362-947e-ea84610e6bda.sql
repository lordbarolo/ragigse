-- Blockera klientsidiga ändringar av verifierings-, gransknings- och poängfält.
-- service_role (edge functions/admin) får fortsatt skriva fritt.

CREATE OR REPLACE FUNCTION public.guard_profiles_verification_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  NEW.has_valid_ivo := OLD.has_valid_ivo;
  NEW.has_valid_hosp := OLD.has_valid_hosp;
  NEW.has_bankid := OLD.has_bankid;
  NEW.profile_status := OLD.profile_status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_profiles_verification_fields ON public.profiles;
CREATE TRIGGER guard_profiles_verification_fields
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profiles_verification_fields();

CREATE OR REPLACE FUNCTION public.guard_ref_profiles_trust_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  NEW.bankid_verified := OLD.bankid_verified;
  NEW.trust_score := OLD.trust_score;
  NEW.trust_tier := OLD.trust_tier;
  NEW.score_breakdown := OLD.score_breakdown;
  NEW.profile_status := OLD.profile_status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_ref_profiles_trust_fields ON public.ref_profiles;
CREATE TRIGGER guard_ref_profiles_trust_fields
  BEFORE UPDATE ON public.ref_profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_ref_profiles_trust_fields();

CREATE OR REPLACE FUNCTION public.guard_invoice_reviews_admin_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  NEW.konsult_godkand := OLD.konsult_godkand;
  NEW.admin_notes := OLD.admin_notes;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.status := OLD.status;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS guard_invoice_reviews_admin_fields ON public.invoice_reviews;
CREATE TRIGGER guard_invoice_reviews_admin_fields
  BEFORE UPDATE ON public.invoice_reviews
  FOR EACH ROW EXECUTE FUNCTION public.guard_invoice_reviews_admin_fields();