-- Projektets default privileges ger anon/authenticated ALL på nya public-tabeller.
-- Trust Core ska ha exakta grants: ingen anon-åtkomst alls, ingen klient-DELETE.
REVOKE ALL ON public.trust_issuers FROM anon, authenticated;
REVOKE ALL ON public.trust_credential_types FROM anon, authenticated;
REVOKE ALL ON public.trust_credentials FROM anon, authenticated;
REVOKE ALL ON public.trust_claims FROM anon, authenticated;
REVOKE ALL ON public.trust_evidence FROM anon, authenticated;
REVOKE ALL ON public.trust_verification_events FROM anon, authenticated;

GRANT SELECT ON public.trust_issuers TO authenticated;
GRANT SELECT ON public.trust_credential_types TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.trust_credentials TO authenticated;
GRANT SELECT, INSERT, UPDATE ON public.trust_claims TO authenticated;
GRANT SELECT, INSERT ON public.trust_evidence TO authenticated;
GRANT SELECT ON public.trust_verification_events TO authenticated;

-- Admin-skrivningar i kataloger går via service_role/SECURITY DEFINER.
GRANT ALL ON public.trust_issuers TO service_role;
GRANT ALL ON public.trust_credential_types TO service_role;
GRANT ALL ON public.trust_credentials TO service_role;
GRANT ALL ON public.trust_claims TO service_role;
GRANT ALL ON public.trust_evidence TO service_role;
REVOKE ALL ON public.trust_verification_events FROM service_role;
GRANT SELECT, INSERT ON public.trust_verification_events TO service_role;
