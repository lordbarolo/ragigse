# Uppdragsradar Public API

Externt API för att hämta CompCares Uppdragsradar-data (avropsprediktioner, kundtrender och rådata).

## Bas-URL

```
https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/radar-public-api/<endpoint>
```

## Autentisering

Skicka API-nyckeln i headern `X-API-Key`. Alternativt som `Authorization: Bearer <key>` eller query-parameter `?api_key=...`.

```bash
curl -H "X-API-Key: radar_live_xxx..." \
  "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/radar-public-api/predictions?limit=20"
```

Nycklar utfärdas per konsument och kan revokeras när som helst. Varje nyckel har individuella rate limits och scopes.

## Rate limits

Returneras i metadata på varje svar:

```json
{
  "meta": {
    "rate_limit": {
      "per_hour": 100,
      "per_day": 1000,
      "remaining_hour": 99,
      "remaining_day": 999
    }
  }
}
```

`429 Too Many Requests` returneras vid överskridning.

## Endpoints

### `GET /predictions`

Avropsprediktioner per kund/region/profession/månad.

**Query-parametrar:**
- `region` — t.ex. `Stockholm`
- `profession` — `DOCTOR` | `NURSE` | `PHYSIOTHERAPIST`
- `specialization` — t.ex. `Anestesi`
- `month` — `YYYY-MM`
- `confidence` — `low` | `med` | `high`
- `limit` (default 50, max enligt API-nyckel)
- `offset` (default 0)

**Exempel:**
```bash
curl -H "X-API-Key: $KEY" \
  "$BASE/predictions?profession=NURSE&region=Stockholm&limit=10"
```

### `GET /customer_intelligence`

Trender och säsongstoppar per kund.

**Query-parametrar:**
- `customer`, `region`, `profession`
- `limit`, `offset`

### `GET /calloff_imports`

Rådata från importerade avrop.

**Query-parametrar:**
- `region`, `role`, `customer`
- `since` — `YYYY-MM-DD`
- `limit`, `offset`

## Svar

Alla endpoints returnerar:

```json
{
  "data": [ ... ],
  "pagination": { "limit": 50, "offset": 0, "returned": 50, "total": 1234 },
  "meta": { "endpoint": "predictions", "consumer": "Avropsplatsen Next", "rate_limit": { ... } }
}
```

## Felkoder

| Status | Betydelse |
|--------|-----------|
| 401 | Nyckel saknas eller ogiltig |
| 403 | Nyckel saknar scope för endpoint |
| 404 | Okänd endpoint |
| 429 | Rate limit överskriden |
| 500 | Internt fel |

## Kontakt

För nya nycklar eller höjda quotas: kontakta CompCare-admin.
