# vårdbemanning.ai Agent API

Tre endpoints för externa AI-agenter (Claude, GPT, egna system) att läsa vårdbemanning.ai-data säkert.

**Bas-URL:** `https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1`

## Autentisering

Två typer av tokens skickas i `Authorization: Bearer ...`-headern:

| Prefix | Typ | Skapas av | Användning |
|---|---|---|---|
| `cck_` | API-nyckel | Admin | Server-till-server, marknadsdata + priser |
| `cut_` | User-token | Användaren själv | På uppdrag av en specifik användare |

API-nycklar har **scopes**:
- `rates:read` — SKR-ramavtalspriser
- `market:read` — historisk avropsdata

User-tokens har automatiskt scope `user:read`.

## Rate limits

- API-nycklar: 1000 anrop/dag (default, kan justeras per nyckel)
- User-tokens: 1000 anrop/dag

Header `X-RateLimit-Remaining` visas vid 429.

## Endpoints

### `GET /agent-api-rates`

```bash
curl -H "Authorization: Bearer cck_..." \
  "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/agent-api-rates?role=Sjuksk%C3%B6terska&region=Stockholm&year=2026"
```

**Svar:**
```json
{
  "source": "SKR vårdpersonal 1.7",
  "effective_from": "2026-01-01",
  "role_query": "Sjuksköterska",
  "region_query": "Stockholm",
  "results": [
    { "role": "Sjuksköterska", "region": "Zon 1", "type": "Dag", "base_hourly_rate_sek": 695, "notes": null }
  ],
  "disclaimer": "Base prices only. Excludes OB-tillägg, jour, margins."
}
```

### `GET /agent-api-market-history`

```bash
curl -H "Authorization: Bearer cck_..." \
  "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/agent-api-market-history?role=Sjuksk%C3%B6terska&region=VGR&months_back=12"
```

**Svar:**
```json
{
  "role_query": "Sjuksköterska",
  "region_query": "VGR",
  "months_back": 12,
  "total_calloffs": 412,
  "monthly_series": [
    { "month": "2025-06", "calloff_count": 38, "median_price_sek": 745, "customer_types": ["region"] }
  ],
  "disclaimer": "Historical data only. Customer names not exposed."
}
```

### `GET /agent-api-user-context`

Kräver `cut_`-token (user-scoped).

```bash
curl -H "Authorization: Bearer cut_..." \
  "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/agent-api-user-context"
```

**Svar:**
```json
{
  "user_context": {
    "employment_type": "foretagare",
    "experience_years": 8,
    "sector": "offentlig",
    "care_setting": "sjukhus",
    "current_hourly_rate_range_sek": "1000-1199",
    "salary_type": "hourly"
  },
  "disclaimer": "Exact rate omitted; bucketed range only. No name/email/documents."
}
```

## Felkoder

| Status | error | Betydelse |
|---|---|---|
| 401 | `unauthorized` / `invalid_key` / `key_revoked` | Token saknas/ogiltig |
| 403 | `insufficient_scope` / `user_token_required` | Token har inte rätt scope |
| 400 | `missing_param` | Saknar t.ex. `role` |
| 429 | `rate_limited` | Daglig kvot uppnådd |
| 500 | `internal_error` / `query_failed` | Server-fel |

## Vad agenten INTE kan göra

- Skriva/uppdatera data
- Se enskilda användares namn, e-post eller dokument
- Läsa marketplace-tabeller (`mp_*`) eller invoice-data
- Bypassa user consent — `cut_`-tokens kan revokeras när som helst
