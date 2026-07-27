## Goal

Close the "Uppdragsradar market data exposed without authentication" finding on `radar-predictions` by reusing the exact auth + rate-limit logic already in `radar-data`, and factor both auth models into a single shared module so we don't drift again. `radar-data` and `radar-public-api` must remain byte-compatible for authorized callers.

## 1. New file: `supabase/functions/_shared/auth.ts`

A single module with two independent auth flows plus small helpers. No new schemes — each function is a straight lift of code that already exists today.

### Exports

- `corsHeadersUser` — the exact header object used by `radar-data` / `radar-predictions` (`authorization, x-client-info, apikey, content-type, x-supabase-client-platform*` variants).
- `corsHeadersPublicApi` — the exact header object used by `radar-public-api` (adds `x-api-key`, `Access-Control-Allow-Methods`).
- `clientIp(req)` — same three-header fallback (`x-forwarded-for`, `cf-connecting-ip`, `x-real-ip`).
- `SUSPICIOUS_UA` — same regex.
- `sha256Hex(input)` — same implementation.

### User (JWT) auth — used by radar-data + radar-predictions

```ts
requireUserAuth(req, opts?: { corsHeaders?: Record<string,string>, blockSuspiciousUa?: boolean })
  : Promise<
      | { ok: true; user: User; service: SupabaseClient; ip: string|null; ua: string }
      | { ok: false; response: Response }
    >
```

Mirrors radar-data lines 46–80 exactly:
- If `blockSuspiciousUa` (default true) and UA matches `SUSPICIOUS_UA` → 403 `{ error: "Forbidden" }`.
- If no `Authorization: Bearer` → 401 `{ error: "Unauthorized" }`.
- Creates user-scoped client with `SUPABASE_URL` + `SUPABASE_ANON_KEY` + `Authorization` header, calls `auth.getUser()`; on error/null → 401 `{ error: "Unauthorized" }`.
- Returns `service` = service-role client (created once) + `user`, `ip`, `ua`.

```ts
enforceUserRateLimit(
  service, user, endpoint, { ip, ua, limitPerHour, filters? }
): Promise<Response | null>
```

Mirrors radar-data lines 96–114 exactly:
- Counts `radar_access_log` rows in the last hour for `user_id`.
- If `>= limitPerHour`: inserts a `status: "rate_limited"` row (`client_ip`, `user_agent.slice(0,200)`, `endpoint`, `filters`, `row_count: 0`) and returns 429 with the **exact same body string** `"Rate limit exceeded: max <N> requests per hour"`.
- Otherwise returns `null`.

Note: logging of success/error rows stays inline in each function — that shape (`filtersForLog`, `row_count`) is call-site-specific and not part of the shared contract.

### API-key auth — used by radar-public-api

```ts
extractApiKey(req, url): string
authenticateApiKey(service, apiKey, endpoint, allowedEndpoints)
  : Promise<{ ok: true; keyRow: RadarApiKey } | { ok: false; response: Response }>
enforceApiKeyRateLimit(service, keyRow, { endpoint, isWrite, ip, ua, method })
  : Promise<{ ok: true; hourCount: number; dayCount: number; hourLimit: number; dayLimit: number }
          | { ok: false; response: Response }>
```

These are a direct extraction of `radar-public-api` lines 233–320. The `errorEnvelope` helper stays in `radar-public-api/index.ts` (it's response-shape-specific) and is passed in via a callback param, or the shared function takes an `envelopeError(code, message, status, meta)` builder as an argument — same net behavior, envelope stays owned by radar-public-api. Status codes, envelope keys, meta fields, log rows, and `status` values (`rate_limited_hour`, `rate_limited_day`, read vs write status filters) all stay identical.

## 2. Refactor `radar-data/index.ts`

- Replace the inline CORS/UA/JWT/rate-limit blocks (lines 34–75, 96–114) with `requireUserAuth` + `enforceUserRateLimit`.
- Leave everything else untouched: endpoint validation, per-endpoint queries, success/error logging into `radar_access_log`, response body shape (`{ rows, count }`), 400/500 handling.
- `RATE_LIMIT_PER_HOUR = 30` stays in this file and is passed to `enforceUserRateLimit`.

Verification: diff response bodies + status codes for OPTIONS, missing auth, bad JWT, valid JWT + valid endpoint, rate-limit breach. All must byte-match the current implementation.

## 3. Refactor `radar-public-api/index.ts`

- Discovery root (no-auth) stays inline — it's before the auth gate today.
- Replace lines 233–320 with `extractApiKey` → `authenticateApiKey` → write-gate checks (kept inline, they're endpoint-specific) → `enforceApiKeyRateLimit`.
- `envelope(...)`, `errorEnvelope(...)`, `jsonResponse(...)`, `normalizeCalloff`, `buildDedupHash`, and the POST/GET business logic stay untouched.
- Status codes and envelope error codes must stay identical: `MISSING_API_KEY` (401), `UNKNOWN_ENDPOINT` (404), `INVALID_API_KEY` (401), `SCOPE_DENIED` (403), `WRITE_NOT_SUPPORTED` (405), `WRITE_DENIED` (403), `MISSING_PARTNER_SOURCE` (403), `RATE_LIMITED_HOUR|DAY` (429).

## 4. Harden `radar-predictions/index.ts` with the user-auth path

Add — at the very top of the handler, after the `OPTIONS` short-circuit and before any DB call — the same two helpers:

```ts
const auth = await requireUserAuth(req);
if (!auth.ok) return auth.response;
const { user, service, ip, ua } = auth;

const rl = await enforceUserRateLimit(service, user, "radar-predictions", {
  ip, ua, limitPerHour: 30,
  filters: { competence: competenceFilter, location: locationFilter, buyer: buyerFilter },
});
if (rl) return rl;
```

Then reuse `service` in place of the currently-created `supabase` client (drop the second `createClient(... SERVICE_ROLE_KEY)`).

Also sanitize the 500 branch: today it returns `err.message` verbatim; change to `{ error: "Internal server error" }` while console.error keeps the details (matches the pattern already used in `get-avrop-predictions`). This is inside the scope of "reject unauthenticated + rate-limit like radar-data" — radar-data doesn't leak raw messages on its normal path either.

Client-side: `radar-predictions` is already called via `supabase.functions.invoke(...)` from authenticated pages, so the browser JS client will attach the user JWT automatically — no frontend change required. I'll confirm this by grepping call sites before deploying.

## 5. Deliverables + verification

- **Before deploy**: show unified diffs for all four files (`_shared/auth.ts` new, `radar-data/index.ts`, `radar-public-api/index.ts`, `radar-predictions/index.ts`).
- **Automated check**: `supabase--test_edge_functions` / `supabase--curl_edge_functions` matrix:
  - radar-data: no auth → 401 with `{error:"Unauthorized"}`; suspicious UA → 403; valid JWT + valid endpoint → 200 with same `{rows,count}` shape.
  - radar-public-api: no key → 401 envelope `MISSING_API_KEY`; bad key → 401 `INVALID_API_KEY`; valid key + `/predictions` → 200 envelope.
  - radar-predictions: no auth → 401; with valid JWT → 200 with `{predictions,total,filters}`.
- **Grep**: confirm no other function imports internals from these three so the extraction is safe.
- **Security memory**: update to note that all radar-* endpoints now share the module — future radar endpoints must call `requireUserAuth` or `authenticateApiKey`.

## Technical notes

- `_shared/rateLimit.ts` already exists but is IP-based and used by non-radar endpoints. I'm not touching it — the radar user-flow uses per-`user_id` counting against `radar_access_log`, which is a different table and a different key. Merging the two would change behavior; out of scope.
- Two CORS constants (not one) because `radar-public-api` accepts `x-api-key` and advertises `Access-Control-Allow-Methods`, while radar-data/radar-predictions don't. Consolidating would change the preflight response for existing callers.
- `envelope`/`errorEnvelope` stay in `radar-public-api`; the shared API-key helpers accept a builder callback so the envelope shape stays owned by the public API and can't drift into internal functions.
