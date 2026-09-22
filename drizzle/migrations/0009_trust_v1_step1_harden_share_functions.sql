-- Trust v1, steg 1: hardening av kvarvarande SECURITY DEFINER-funktion.
-- get_document_share_by_token är SECURITY DEFINER och körbar av anon, men pekar
-- på en share-tabell som inte längre finns i denna databas. Ingen anon-yta ska
-- finnas kvar innan nya scope-baserade share-flöden byggs.
REVOKE ALL ON FUNCTION public.get_document_share_by_token(text) FROM anon;
REVOKE ALL ON FUNCTION public.get_document_share_by_token(text) FROM PUBLIC;

COMMENT ON FUNCTION public.get_document_share_by_token(text) IS
  'DEPRECATED: ersätts av trust_resolve_share_grant + /api/public/trust/share/:token. Refererar tabeller som inte finns; anon-EXECUTE återkallad.';

COMMENT ON FUNCTION public.create_document_share(uuid[], integer, text, text) IS
  'DEPRECATED: ersätts av trust_create_share_grant. Refererar tabeller som inte finns.';