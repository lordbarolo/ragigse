

# Plan: Remove `requests` table entirely

## Summary
The `requests` table (2,335 rows of call-off data) will be completely removed from the codebase and database. All functions that currently merge data from both `requests` and `calloff_imports` will be updated to use `calloff_imports` only.

## Affected files

### 1. Edge Function: `get-avrop-predictions/index.ts`
- Remove the `fetchRequests()` function entirely
- Update `fetchAllRoles()` to only query `calloff_imports`
- Remove the merge of `requestRows` — use only `importRows`

### 2. Edge Function: `uppdragsradar-chat/index.ts`
- Remove the `fetchAll` call for `"requests"` table
- Update `allData` to use only the `calloff_imports` results
- Adjust the prompt text referencing "uppdragsdatabasen" (no changes to wording needed, data source just narrows)

### 3. Database migration
- `DROP TABLE IF EXISTS public.requests;`

### Not affected
- `radar-predictions/index.ts` — already uses only `calloff_imports`
- All `src/` references to "requests" are for other tables (`org_membership_requests`, `ref_representation_requests`, `market_requests`) — unrelated

## Technical details
- The `calloff_imports` table (~29k rows) contains the same data structure and will remain the sole data source for Uppdragsradarn
- No UI changes needed — the Radar page already works through the edge functions

