

# Fix: CI logging "unknown" capability on errors

## Problem
The `catch` block in `compensation-intelligence/index.ts` (line 1061–1080) logs **every** failed query with `capability_key: "unknown"` and `client_type: "unknown"` because the `capability` and `client_type` variables are scoped inside the `try` block and inaccessible in `catch`.

This explains the 34% of `compensation_queries` rows with `capability_key = 'unknown'` — they are legitimate errors (unresolved roles, missing data, etc.) but the actual capability is lost.

## Fix

### File: `supabase/functions/compensation-intelligence/index.ts`

1. **Hoist variables** — declare `capability` and `clientType` before the `try` block with defaults:
   ```ts
   let capability = "unknown";
   let clientType = "unknown";
   ```

2. **Assign inside try** — after parsing body, assign from parsed values so the catch block can reference them.

3. **Update catch block** — use the hoisted variables instead of hardcoded `"unknown"`:
   ```ts
   capability_key: capability,   // was "unknown"
   client_type: clientType,      // was "unknown"
   ```

### Scope
- Single file edit (~6 lines changed)
- No schema changes, no new migrations
- Redeploy `compensation-intelligence` edge function

