-- Hindra att en vanlig användare självverifierar sina egna dokument.
-- Samma mönster som guard_profiles_verification_fields: status återställs för
-- alla anrop som inte kommer från service_role/postgres eller en admin.
CREATE OR REPLACE FUNCTION public.guard_consultant_documents_status()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $function$
BEGIN
  IF current_user IN ('service_role', 'postgres', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NOT NULL AND public.ref_has_role(auth.uid(), 'admin'::ref_app_role) THEN
    RETURN NEW;
  END IF;

  -- Verifieringstillstånd är derived och får bara sättas server-side/admin.
  NEW.status := OLD.status;
  NEW.user_id := OLD.user_id;
  RETURN NEW;
END;
$function$;

DROP TRIGGER IF EXISTS guard_consultant_documents_status ON public.consultant_documents;
CREATE TRIGGER guard_consultant_documents_status
BEFORE UPDATE ON public.consultant_documents
FOR EACH ROW EXECUTE FUNCTION public.guard_consultant_documents_status();

COMMENT ON FUNCTION public.guard_consultant_documents_status() IS
  'Skyddar consultant_documents.status och user_id mot klientskrivning (self-verification).';
