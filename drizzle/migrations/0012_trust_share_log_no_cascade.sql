-- Åtkomstloggen är append-only, därför kan CASCADE/SET NULL aldrig utföras.
-- Grants ska inte raderas hårt utan återkallas (revoked_at).
ALTER TABLE public.trust_share_access_log
  DROP CONSTRAINT trust_share_access_log_grant_id_fkey;

ALTER TABLE public.trust_share_access_log
  ADD CONSTRAINT trust_share_access_log_grant_id_fkey
  FOREIGN KEY (grant_id) REFERENCES public.trust_share_grants(id);

COMMENT ON TABLE public.trust_share_access_log IS
  'Append-only. Rader kan aldrig ändras eller raderas; därför raderas inte heller delningar hårt – använd revoked_at.';