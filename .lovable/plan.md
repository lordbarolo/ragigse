

## Compensation Intelligence Platform — Fas 1 Implementation

### Sammanfattning av justeringar

Fem krav bekräftade innan implementation:

1. **Benchmark-lager som hård regel** — capabilities läser BARA från `salary_benchmarks`, aldrig `leads` eller rådata
2. **Policy som eget lager** — separerad modul med standardiserade resultat (`allowed`/`fallback`/`blocked`), inte if/else i edge function
3. **Capabilities = affärslogik** — fallback-kedjor (kommun→region→nation), versionsval, saknade data-hantering
4. **Client profiles aktiva i pipeline** — styr rate limiting, tillåtna capabilities och policy-regler per request
5. **Discovery med metrics och jämförelser** — `ci-metrics` returnerar tillgängliga mätvärden och tillåtna jämförelsetyper

---

### Steg 1: Databasmigration

Skapa 5 tabeller i en migration:

| Tabell | Syfte |
|---|---|
| `role_aliases` | alias → kanonisk `yrkeskategori`. Kolumner: `id`, `alias`, `canonical_name`, `language` (default 'sv'), `source`, `created_at` |
| `geography_aliases` | alias → kanonisk kommun/zon/region. Kolumner: `id`, `alias`, `canonical_kommun`, `canonical_zon`, `canonical_region`, `language`, `source`, `created_at` |
| `capability_definitions` | Registry. Kolumner: `id`, `capability_key` (unique), `version` (int default 1), `name`, `description`, `input_schema_json`, `output_schema_json`, `human_label`, `agent_label`, `is_active`, `created_at` |
| `client_profiles` | Access control. Kolumner: `id`, `profile_key` (unique), `client_type` (text), `rate_limit_per_minute`, `rate_limit_per_day`, `max_entities_per_query`, `allowed_capabilities` (jsonb), `policy_rules` (jsonb — sample_size_min, anti_enum_window_minutes, anti_enum_max_sequential), `created_at` |
| `compensation_queries` | Audit. Kolumner: `id`, `channel`, `client_type`, `client_ip`, `capability_key`, `capability_version`, `raw_input_text`, `normalized_input_json`, `resolved_entities_json`, `resolution_method`, `confidence_score`, `policy_result_json` (status: allowed/fallback/blocked, reason, applied_rules), `response_payload_json`, `created_at` |

RLS: public SELECT på `role_aliases`, `geography_aliases`, `capability_definitions`. Ingen public access på `client_profiles` och `compensation_queries`.

---

### Steg 2: Seed-data

Populera via insert-verktyget:

- **role_aliases**: Migrera alla 65+ poster från nuvarande `OCCUPATION_MAP` i `salary-benchmark-engine`
- **geography_aliases**: Generera från `locations`-tabellen (varje kommun som alias för sig själv + vanliga förkortningar)
- **capability_definitions**: 4 capabilities med input/output-scheman
- **client_profiles**: 3 profiler (anonymous_human, authenticated_human, internal_agent) med policy_rules inkl. `sample_size_min: 10`

---

### Steg 3: Edge function `compensation-intelligence`

Intern arkitektur med tre separerade moduler (alla i samma `index.ts`, men tydligt separerade som funktioner):

```text
┌─────────────────────────────────────────────┐
│  Request Parser                             │
│  → extraherar capability, params, client_type│
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  Entity Resolver                            │
│  → role_aliases + geography_aliases lookup  │
│  → loggar method + confidence               │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  POLICY LAYER (eget lager)                  │
│                                             │
│  evaluatePolicy(request, clientProfile)     │
│  → returnerar PolicyResult:                 │
│    { status: allowed|fallback|blocked,      │
│      reason?: string,                       │
│      applied_rules: string[] }              │
│                                             │
│  Regler:                                    │
│  1. rate_limit — count queries i            │
│     compensation_queries per IP/tid         │
│  2. capability_access — check mot           │
│     client_profiles.allowed_capabilities    │
│  3. sample_size — n≥10 för benchmark caps   │
│  4. anti_enumeration — >N sekventiella      │
│     lookups med samma geo men olika roller   │
│     inom X minuter → ENUMERATION_RISK       │
│  5. query_breadth — blockera om params      │
│     är för breda (saknar geo ELLER roll)    │
│                                             │
│  Varje regel = en funktion som returnerar   │
│  { pass: bool, rule: string, reason?: str } │
│  Policy-lagret aggregerar alla regler.      │
└──────────────┬──────────────────────────────┘
               │ (om blocked → returnera direkt med felkod)
┌──────────────▼──────────────────────────────┐
│  CAPABILITY LAYER (affärslogik)             │
│                                             │
│  lookup_rate:                               │
│    1. Resolve zon via locations             │
│    2. Query rates för yrke+zon              │
│    3. Fallback: yrke→typ→zon               │
│    4. Hämta margin_models                   │
│    5. Beräkna range via calc.ts             │
│    6. Returnera structured data             │
│                                             │
│  compare_roles:                             │
│    1. Kör lookup_rate för roll_a + roll_b   │
│    2. Beräkna diff (abs + pct)              │
│    3. Hård regel: BARA rates-tabellen       │
│                                             │
│  salary_benchmark:                          │
│    1. BARA salary_benchmarks-tabellen       │
│    2. Fallback: exact→ilike→stem→cross-sect │
│    3. Policy-check: sample_size ≥ 10        │
│    4. Om n<10 → PolicyResult=blocked        │
│                                             │
│  salary_position:                           │
│    1. Kör salary_benchmark internt          │
│    2. Jämför angiven lön mot p25/p50/p75    │
│    3. Returnera gap + kategori              │
│    4. BARA salary_benchmarks som källa      │
│                                             │
│  Fallback-kedja för geografi:               │
│    kommun → region → nationellt             │
│    (loggas i policy_result som "fallback")  │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  Audit Logger                               │
│  → Skriver till compensation_queries        │
│  → Inkluderar entity resolution, policy     │
│    result och response payload              │
└──────────────┬──────────────────────────────┘
               │
┌──────────────▼──────────────────────────────┐
│  Response Builder                           │
│  → Standardiserat JSON med:                 │
│    query_id, capability, version, data,     │
│    source_metadata, policy_status           │
└─────────────────────────────────────────────┘
```

**Hård regel implementerad i kod**: `salary_benchmark` och `salary_position` har en allowlist av tabeller (`["salary_benchmarks"]`). Inga joins mot `leads`, `reports` eller andra rådatatabeller.

---

### Steg 4: Discovery edge functions (4 st)

- **`ci-capabilities`** — Returnerar aktiva capabilities med input/output-scheman och version
- **`ci-roles`** — Distinkt lista av kanoniska roller (namn, ej priser)
- **`ci-geographies`** — Kommuner, regioner, zoner (namn, ej priser)
- **`ci-metrics`** — Tillgängliga mätvärden (`hourly_rate`, `monthly_salary`, `percentile_25`, `percentile_50`, `percentile_75`) med beskrivningar OCH tillåtna jämförelsetyper (`role_vs_role`, `geography_vs_geography`, `salary_vs_benchmark`)

---

### Steg 5: Bakåtkompatibla wrappers

Befintliga `pricing-engine` och `salary-benchmark-engine` refaktoreras till att anropa de nya capability-funktionerna internt. Samma request/response-format utåt.

---

### Steg 6: Uppdatera `openapi.json` och `llms.txt`

Lägg till de nya endpointsen med fullständiga scheman.

---

### Implementation-ordning

1. Databasmigration (tabeller)
2. Seed-data (role_aliases, geography_aliases, capability_definitions, client_profiles)
3. `compensation-intelligence` edge function
4. 4 discovery edge functions
5. Wrapper-uppdatering av befintliga functions
6. OpenAPI + llms.txt

