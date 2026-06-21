
# Mål

Du ska kunna låta Claude (via Supabase MCP) äga en backend-spegel av CompCare i ditt egna Supabase-konto, utan att produktionen rörs. Lovable används som frontend-verktyg mot båda miljöerna. Inget DNS-byte, ingen migration av riktig kunddata, ingen risk för produktion.

# Arkitektur efter setup

```text
                 ┌──────────────────────────────┐
                 │  PROD (orörd)                │
                 │  compcare.se                 │
                 │  Lovable-projekt (detta)     │
                 │  ├─ Frontend (Lovable agent) │
                 │  └─ Backend = Lovable Cloud  │
                 │     (ref ubhhlunhdqbokjvwfebb)│
                 └──────────────────────────────┘
                              ▲
                              │ manuell promotion
                              │ (migrations + edge fn)
                              │
                 ┌──────────────────────────────┐
                 │  STAGING (nytt)              │
                 │  staging.compcare.se (valfritt)│
                 │  Nytt Lovable-projekt        │
                 │  ├─ Frontend (Lovable agent) │
                 │  └─ Backend = ditt Supabase  │
                 │     (Claude äger via MCP)    │
                 └──────────────────────────────┘
```

Claude jobbar fritt mot staging-Supabase. Lovable-agenten jobbar mot båda projekten (frontend) men rör bara prod-backend om du explicit ber om det.

# Steg

## 1. Förbered ditt Supabase
- Skapa nytt projekt i EU-region (Frankfurt eller Stockholm för GDPR-paritet).
- Slå på extensions: `pgvector`, `pg_cron`, `pg_net`, `pgmq`, `vault`.
- Generera Personal Access Token för MCP. Spara även `service_role` och DB-lösen lokalt.

## 2. Skapa nytt Lovable-projekt för staging
- Klona detta repo till nytt Lovable-projekt via "Remix" eller GitHub-import.
- I det nya projektet: **välj inte Lovable Cloud**. Koppla istället ditt egna Supabase under Connectors → Supabase. Då slipper vi cloud-låsningen och dina nycklar styr.

## 3. Rekonstruera schemat
Alla migrationer ligger redan versionerade i `supabase/migrations/`. Kör dem mot ditt nya projekt i kronologisk ordning. Två sätt:
- a) Lokalt med Supabase CLI: `supabase link` + `supabase db push`.
- b) Eller låt Claude via MCP läsa migrationsfilerna och köra dem i ordning.

Validera efter run:
- ~70 tabeller (se listan i `<supabase-tables>`).
- Alla `ref_*`, `mp_*`, `ai_*`, `radar_*`, `invoice_*`-domäner finns.
- 50+ DB-functions och triggers (särskilt `handle_new_user`, `mp_listings_enforce_publish_gate`, `ref_calculate_*`, `aggregate_calloff_monthly`).
- RLS aktivt + GRANTs på alla public-tabeller.

## 4. Seed-data (anonymiserad)
Vi flyttar **ingen riktig PII**. Istället:
- Exportera CSV per icke-känslig referenstabell från Cloud-projektet: `roles`, `role_aliases`, `specialties`, `geographies`, `geography_aliases`, `regions`, `zones`, `locations`, `contract_versions`, `contract_version_rates`, `margin_models`, `ref_role_profiles`, `ref_verified_domains`, `price_nuggets`, `benchmark_rates`, `salary_benchmarks`.
- Importera till staging-Supabase via Table editor eller `\copy`.
- Generera syntetiska rader för `leads`, `consultant_profiles`, `ref_profiles`, `calloff_imports` (≤100 st var) så Claude har realistisk data att jobba mot utan att GDPR-data lämnar prod.

## 5. Edge functions
- Hela `supabase/functions/`-trädet följer med Git-import.
- Sätt om alla secrets i nya projektet (se §6).
- Deploya: `supabase functions deploy --project-ref <nytt>` eller via Lovable-agenten i det nya projektet.

## 6. Secrets som måste sättas i staging
Minst dessa (vi listar de viktigaste — full lista hämtas via `fetch_secrets` mot prod när vi är där):
- `LOVABLE_API_KEY` (nytt — auto i nya Lovable-projektet)
- `RESEND_API_KEY`, `RESEND_FROM_EMAIL`
- `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` (test-keys, inte live)
- `POSTHOG_PROJECT_API_KEY`, `POSTHOG_PERSONAL_API_KEY`
- `MAILERLITE_API_KEY`
- `HEALTH_CHECK_CRON_TOKEN` (nytt slumpgenererat — läggs i Vault)
- BankID-cert/keys → använd **BankID test-miljö**, aldrig prod-certet.

## 7. Koppla Supabase MCP till Claude
- Installera `@supabase/mcp-server-supabase` i Claude Desktop/Code config:
  ```json
  {
    "mcpServers": {
      "supabase-staging": {
        "command": "npx",
        "args": ["-y", "@supabase/mcp-server-supabase@latest",
                 "--access-token", "<din PAT>",
                 "--project-ref", "<staging ref>",
                 "--read-only=false"]
      }
    }
  }
  ```
- Verifiera: be Claude lista tabeller och köra en `select count(*) from roles;`.

## 8. pg_cron-jobb i staging
Sätt upp samma scheman som prod men med suffix `_staging` så de inte krockar visuellt:
- `refresh-uppdragsradar-forecast` söndag 03:00
- `redact_avrop_intelligence_pii` dagligen
- `radar_pipeline_watchdog` måndag 09:00

## 9. Promotion-flöde (staging → prod)
När Claude byggt något i staging:
1. Claude exporterar SQL-diffen som migrationsfil till `supabase/migrations/` i staging-repo.
2. Du copy-pastar filen in i prod-repo (eller cherry-pickar via Git).
3. Lovable-agenten i prod-projektet kör migrationen via `supabase--migration`-verktyget med din approval.
4. Edge function-ändringar synkas på samma sätt: kopiera filer mellan repona, agenten redeployar i prod.

Detta håller Cloud-projektets integritet (RLS, security memory, audit-loggar) intakt och du har full kontroll över vad som når produktion.

## 10. Verifiering innan vi säger "klart"
- Claude listar tabeller via MCP → matchar prod-listan.
- Claude kör `select public.aggregate_calloff_monthly(36)` → returnerar rader.
- Test-användare kan registrera sig + signing-flödet (test-BankID) går igenom.
- En triggad edge function (t.ex. `send-password-recovery`) levererar mail via Resend.
- pg_cron-jobben loggar `last_run_at` i `system_health_log`.

# Tidsuppskattning

- Steg 1–2: ~1 timme.
- Steg 3–4: ~3–5 timmar (mest validering).
- Steg 5–6: ~2 timmar.
- Steg 7–8: ~1 timme.
- Total kalendertid: **1 arbetsvecka** för en bekväm setup med marginal för felsökning.

# Vad som inte ingår

- Ingen kopiering av riktig användardata.
- Ingen DNS-ändring för compcare.se.
- Ingen frånkoppling av Lovable Cloud (är inte möjligt).
- Inget byte av BankID-prod-cert till staging.

# Vad jag behöver av dig för att börja

1. Bekräfta att du är ok med att skapa nytt Lovable-projekt (kostar separat workspace-slot).
2. Säg till när ditt egna Supabase-projekt är skapat — då kan vi börja med steg 3 (schema-port).

När du approvar planen kan jag direkt börja förbereda en SQL-bundle av alla migrations i körbar ordning, så Claude/du har en enda fil att köra mot nya databasen.
