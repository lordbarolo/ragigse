

# Lock down `salary_benchmarks_legacy` — restrict to service_role only

## What
Remove the public `USING (true)` SELECT policy on `salary_benchmarks_legacy` and replace it with a service_role-only policy, matching the pattern already applied to `rates`.

## Database Migration
Single migration with 3 statements:
1. `DROP POLICY "Anyone can read salary benchmarks" ON public.salary_benchmarks_legacy;`
2. `CREATE POLICY "Service role only on salary_benchmarks_legacy" ON public.salary_benchmarks_legacy FOR SELECT TO service_role USING (true);`
3. (RLS is already enabled on this table — no `ENABLE ROW LEVEL SECURITY` needed.)

## Impact Check
- All CI capabilities already read `salary_benchmarks_legacy` via edge functions using `SUPABASE_SERVICE_ROLE_KEY` — no breakage.
- Frontend code does not query this table directly (confirmed: no `salary_benchmarks_legacy` references in `src/`).
- No code changes needed.

## Result
`salary_benchmarks_legacy` joins `rates` as a service_role-only table. Public REST API queries will return zero rows.

