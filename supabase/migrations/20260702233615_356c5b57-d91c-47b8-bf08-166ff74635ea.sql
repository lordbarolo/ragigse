
-- profiles: revoke table-level UPDATE, then grant nothing back
-- (all writable fields are set by triggers/RPCs; INSERT covers row creation)
REVOKE UPDATE ON public.profiles FROM anon, authenticated;
-- (intentionally no re-grant — no legit client update path exists for profiles today)

-- ref_profiles: revoke table-level UPDATE, then narrow re-grant to user-editable fields
REVOKE UPDATE ON public.ref_profiles FROM anon, authenticated;
GRANT UPDATE (full_name, specialty, role_type, license_number, phone, bio, linkedin_url, years_licensed, updated_at)
  ON public.ref_profiles TO authenticated;

-- consultant_documents: revoke table-level UPDATE, narrow re-grant
REVOKE UPDATE ON public.consultant_documents FROM anon, authenticated;
GRANT UPDATE (file_name, notes, expires_at)
  ON public.consultant_documents TO authenticated;
