# Uppdragsradar Public API

Externt API för att hämta vårdbemanning.ai:s Uppdragsradar-data (avropsprediktioner, kundtrender och rådata) **samt skicka in egna avrop**.

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

Nycklar utfärdas per konsument och kan revokeras när som helst. Varje nyckel har individuella rate limits, scopes och (vid behov) skrivåtkomst.

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

`429 Too Many Requests` returneras vid överskridning. Skriv- och läs-quotor räknas separat.

---

## Läs-endpoints (GET)

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

### `GET /customer_intelligence`

Trender och säsongstoppar per kund.

**Query-parametrar:** `customer`, `region`, `profession`, `limit`, `offset`

### `GET /calloff_imports`

Rådata från importerade avrop. Inkluderar partnerns egna inskickade rader samt alla rader där partnern eller vårdbemanning.ai har märkt datan som delbar.

**Query-parametrar:** `region`, `role`, `customer`, `since` (YYYY-MM-DD), `limit`, `offset`

---

## Skriv-endpoint (POST) — för datapartners

### `POST /calloff_imports`

Partner kan skicka in egna avropsrader för att berika underlaget. Kräver att API-nyckeln har `can_write=true` och en konfigurerad `partner_source`.

**Body:**
```json
{
  "rows": [
    {
      "calloff_date": "2026-04-15",
      "customer": "Region Stockholm",
      "region": "Stockholm",
      "role": "NURSE",
      "specialization": "Anestesi",
      "level": "Erfaren",
      "unit": "tim",
      "duration_weeks": 4,
      "price_min": 850,
      "price_median": 920,
      "price_max": 1000,
      "customer_type": "REGION",
      "filled": false
    }
  ]
}
```

**Rekommenderade fält:** `calloff_date`, `customer`, `region`, `role`
**Valfria fält:** `specialization`, `level`, `unit`, `duration_weeks`, `price_min/median/max`, `customer_type`, `filled`

#### Tolerant validering
- Saknade obligatoriska fält **avvisar inte** raden — den lagras med `validation_flags` (t.ex. `MISSING_REGION`).
- Endast rader som saknar **både** datum och kund avvisas helt.
- Datumformat ska vara `YYYY-MM-DD`. Felaktigt format flaggas som `INVALID_DATE_FORMAT`.

#### Deduplicering
Rader dedupliceras automatiskt på kombinationen:
`partner_source + calloff_date + customer + region + role + specialization + price_median`

Dubbletter ignoreras tyst och rapporteras i svaret.

#### Datasynlighet (`share_data`)
- `share_data=false` (default): partnerns rader är **privata** — endast partnerns egen API-nyckel ser dem.
- `share_data=true`: partnerns rader ingår i radarns publika aggregat och syns för alla konsumenter, märkta med `partner_source`.

Inställningen styrs av vårdbemanning.ai-admin per nyckel.

#### Exempel:
```bash
curl -X POST \
  -H "X-API-Key: $KEY" \
  -H "Content-Type: application/json" \
  -d '{"rows":[{"calloff_date":"2026-04-15","customer":"Region Stockholm","region":"Stockholm","role":"NURSE","price_median":920}]}' \
  "https://ubhhlunhdqbokjvwfebb.supabase.co/functions/v1/radar-public-api/calloff_imports"
```

#### Svar:
```json
{
  "query_id": "...",
  "capability": "calloff_imports",
  "status": "partial",
  "data": {
    "received": 10,
    "inserted": 7,
    "duplicates": 2,
    "rejected": 1,
    "flagged": 3,
    "partner_source": "avropsplatsen-next",
    "share_data": false,
    "details": {
      "duplicates": [{ "index": 4, "reason": "duplicate_in_db" }],
      "rejected": [{ "index": 9, "flags": ["MISSING_DATE_AND_CUSTOMER"] }],
      "flagged": [{ "index": 2, "flags": ["MISSING_REGION"] }]
    }
  },
  "meta": {
    "consumer": "Avropsplatsen Next",
    "rate_limit": { "per_hour": 100, "per_day": 1000, "remaining_hour": 99, "remaining_day": 999 }
  }
}
```

---

## Felkoder

| Status | Code | Betydelse |
|--------|------|-----------|
| 400 | `INVALID_JSON` / `MISSING_ROWS` | Felformaterad eller tom body vid POST |
| 401 | `MISSING_API_KEY` / `INVALID_API_KEY` | Nyckel saknas eller är ogiltig/revokerad |
| 403 | `SCOPE_DENIED` | Nyckel saknar scope för endpoint |
| 403 | `WRITE_DENIED` / `MISSING_PARTNER_SOURCE` | Nyckel saknar skrivåtkomst |
| 404 | `UNKNOWN_ENDPOINT` | Okänd endpoint |
| 405 | `WRITE_NOT_SUPPORTED` | Endpoint stöder inte POST |
| 413 | `TOO_MANY_ROWS` | Fler rader än `max_write_rows_per_request` |
| 429 | `RATE_LIMITED_HOUR` / `RATE_LIMITED_DAY` | Rate limit överskriden |
| 500 | `INSERT_FAILED` / `INTERNAL_ERROR` | Internt fel |

## Kontakt

För nya nycklar, höjda quotas eller skrivåtkomst: kontakta vårdbemanning.ai-admin.
