

## Fix: Remove public PII exposure on ref_profiles

### Problem
The `ref_profiles` table has a policy `"Public profiles are readable"` that grants anonymous users unrestricted SELECT access to all rows. This exposes full names, emails, phone numbers, license numbers, and BankID status.

### Why this is safe to fix
The public profile page (`/profil/:id`) uses the `ref_get_public_profile` RPC function, which is `SECURITY DEFINER` and bypasses RLS. No client-side code queries `ref_profiles` directly for anonymous users — only authenticated users access it via `useRefProfile.ts`.

### Change
**One database migration** that drops the overly permissive anon policy:

```sql
DROP POLICY "Public profiles are readable" ON public.ref_profiles;
```

No code changes needed. No replacement policy needed since all public-facing access goes through the SECURITY DEFINER RPC function.

