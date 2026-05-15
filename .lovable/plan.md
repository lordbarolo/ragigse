## Vad det här betyder (förklaring först)

Du vill att en agent som lever **utanför** CompCare (t.ex. Claude managed agent, en kunds eget AI-system, eller framtida marketplace-agenter) ska kunna ställa tre frågor till CompCare:

1. *"Vad är ramavtalspriset för rollen X i region Y?"*
2. *"Hur såg avropshistoriken ut i kommun Z senaste 12 mån?"*
3. *"Vilken profil/roll/region har den här användaren?"* (endast om användaren själv gett tillstånd)

Utan att agenten får direktaccess till databasen, RLS-policies eller känslig data den inte ska se.

**Lösningen** är en tunn agent-gateway: tre `agent-api-*` edge functions som autentiseras med API-nycklar (eller user-scoped tokens), returnerar **bara whitelistade fält**, loggar varje anrop, och rate-limitas per nyckel.

Detta är samma mönster som Stripe, Linear och OpenAI använder — du exponerar *intent* (hämta priser), inte *implementation* (kör SQL).

---

## Arkitektur

```text
External Agent (Claude/GPT/eget)
        │  Bearer <api_key>
        ▼
┌────────────────────────────────────────┐
│  Edge Function: agent-api-*            │
│  ├─ Validera API-nyckel (hash)         │
│  ├─ Kontrollera scope                  │
│  ├─ Rate-limit (per nyckel/dag)        │
│  ├─ Logga anrop                        │
│  └─ Returnera whitelistat JSON         │
└────────────────────────────────────────┘
        │  service_role (server-side)
        ▼
   Supabase tabeller (RLS-skyddade)
```

Agenten ser **aldrig** databasen, anon-nyckeln eller user tokens.

---

## Endpoints

**`GET /agent-api-rates`** — SKR-ramavtalspriser
- Query: `role`, `region`, `year?` (default 2026), `employment_type?`
- Scope krävs: `rates:read`
- Returnerar: `{ role, region, base_price, ob_factor, source: "SKR 1.7/1.6", year, valid_from, valid_until }`
- Aldrig: marginalformler, interna nyckeltal, leadsdata

**`GET /agent-api-market-history`** — Historiska avrop (Uppdragsradar)
- Query: `role`, `region`, `months_back?` (max 24)
- Scope krävs: `market:read`
- Returnerar: aggregerad data per månad — `{ month, calloff_count, avg_listed_price, customer_categories: ["region", "private"] }`
- Aldrig: enskilda avrops-IDs, kundnamn (utöver `share_data=true`), PII
- Använder befintlig `aggregate_calloff_monthly`-funktion

**`GET /agent-api-user-context`** — Användarprofil (consent-gated)
- Header: `Authorization: Bearer <user_scoped_token>` (inte en API-nyckel — en token användaren själv har genererat och delat med agenten)
- Returnerar: `{ role, region, employment_type, experience_years, current_rate_range }` — *inte* email, namn, dokument
- Token har TTL (default 30 dagar) och kan revokeras från `/dashboard/agent-access`

---

## Säkerhetsmodell

| Skydd | Implementation |
|---|---|
| API-nyckel | `agent_api_keys` tabell, `key_hash` (SHA-256), aldrig plain text efter creation |
| Scopes | `text[]` per nyckel — `rates:read`, `market:read` |
| Rate limit | Räknas i `agent_api_logs`, max 1000/dag default, override per nyckel |
| User consent | `agent_user_tokens` — användare genererar själv, ser alla aktiva i UI |
| Audit | Varje anrop loggas (endpoint, params, status, latency, response_size) |
| Field whitelist | Hårdkodad i edge function — DB-tillägg läcker inte automatiskt |
| RLS | Alla nya tabeller har strikt RLS; service_role bara från edge function |

**Marketplace-isolation:** `market_history` läser från befintlig `calloff_imports` (inte `mp_*`), så detta är OK utanför marketplace-flaggan.

---

## Filer som skapas

**Migration:**
- `agent_api_keys` (id, name, key_hash, scopes, rate_limit_daily, created_by, last_used_at, revoked_at)
- `agent_user_tokens` (id, user_id, token_hash, label, expires_at, revoked_at)
- `agent_api_logs` (id, key_id/token_id, endpoint, status, latency_ms, ip, created_at)
- RLS: bara admin ser nycklar; user ser sina egna tokens; loggar bara admin

**Edge functions** (alla `verify_jwt = false`, validerar i kod):
- `supabase/functions/agent-api-rates/index.ts`
- `supabase/functions/agent-api-market-history/index.ts`
- `supabase/functions/agent-api-user-context/index.ts`
- `supabase/functions/_shared/agent-auth.ts` (gemensam nyckel/scope/rate-limit-helper)

**Admin UI:**
- `src/pages/admin/AgentApiKeys.tsx` — skapa/revokera nycklar (visa plain text *en gång*)

**User UI:**
- `src/pages/consultant/AgentAccess.tsx` — generera personlig token, se aktiva, revokera

**Dokumentation:**
- `public/agent-api.md` — exempel curl-anrop, scopes, rate-limits, fältdefinitioner
- Uppdatera `public/openapi.json` med de tre endpointsen

---

## Vad jag INTE bygger i det här steget

- Skriv-endpoints (publicera avrop, posta erbjudanden) — kommer i marketplace-flödet
- OAuth/MCP-flow — kan läggas på senare ovanpå denna grund
- Webhook-utskick till agenter — separat feature
- Per-fält granulär scope (t.ex. `rates:read:ob_only`) — overkill nu

---

## Vad du behöver bestämma innan jag kör

1. **Rate-limit default:** 1000 anrop/dag/nyckel räcker för normal agent-användning. OK?
2. **User token TTL:** 30 dagar default med möjlighet att sätta 7/30/90/365. OK?
3. **Pris för rates/market i framtiden:** ska detta vara gratis-tier eller redan från start kopplat till abonnemang? (Jag bygger gratis-tier nu — paywall blir en `is_paid_tier`-check senare.)

Säg **"kör"** så bygger jag steg 1 (tabeller + tre edge functions + admin-UI + dokumentation). User-token-UI kan komma som steg 2.