# Patch-lista — Överlämning CompCare → ny staging-backend

Konkreta diffar att föra in i överlämningsdokumentet. Varje punkt = ersätt/lägg till avsnitt i doc:n.

---

## PATCH 1 — Sakfel: siffror

**Ersätt:** "88 edge functions och 107 tabeller"
**Med:**
> Antal edge functions och publika tabeller ska verifieras mot HEAD innan baseline-bundle byggs. Kommandon:
> - Edge functions: `ls supabase/functions | grep -v '^_' | wc -l`
> - Publika tabeller: `supabase--read_query` mot `information_schema.tables WHERE table_schema='public'`
> Använd de verifierade siffrorna i bundle-manifestet, inte estimat.

---

## PATCH 2 — Sakfel: dataexport

**Ersätt:** all text som beskriver `pg_dump` / direkt Postgres-anslutning för att flytta data prod → staging.
**Med:**
> Prod körs på Lovable Cloud utan extern Postgres-PAT eller `db.password`. Dataflytt sker via:
> 1. `supabase--read_query` + JSON-export för referens-tabeller (`role_aliases`, `contract_version_rates`, `skr_prices_*`, `margin_models`, `ref_pings`-schema).
> 2. Migrations under `supabase/migrations/` som seed:ar staging (inga user-rows kopieras).
> 3. Ingen PII, inga `auth.users`-rader, inga `verifications`/`invoice_reviews`-blobbar flyttas.
> `SUPABASE_SERVICE_ROLE_KEY` och DB-password är oåtkomliga på Lovable Cloud — får ej efterfrågas.

---

## PATCH 3 — Sakfel: baseline måste inkludera triggers/secrets/PGMQ

**Lägg till nytt underavsnitt "Baseline-bundle måste innehålla":**
> - `handle_new_user`-triggern **med korrekt roll-seed** (`ref_user_roles`, default `individual`, ingen self-serve `admin`).
> - PGMQ-köer: `email_outbox` + `process-email-queue`-cron.
> - Vault-secrets referenser (namn, ej värden): `LOVABLE_API_KEY`, `RESEND_API_KEY_1`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `POSTHOG_API_KEY`, `BANKID_*`.
> - `pg_cron`-jobb enligt AUDIT_BRIEF §5 (refresh-uppdragsradar-forecast, pipeline-health-watchdog, posthog-health-check, send-followup-emails, process-email-queue).
> - `app_settings.marketplace_enabled = false` som default.

---

## PATCH 4 — Arbetsmodell: GitHub Sync-konflikt

**Lägg till avsnitt "GitHub-sync och branch-strategi":**
> Lovable syncar mot default branch. Under Cursor-arbetet:
> - Antingen: sätt default branch till `staging` i GitHub och pausa Lovable-editing i det tidsfönstret, ELLER
> - Kör alla Cursor-ändringar på `cursor/*`-branches och rebasas ovanpå `main` innan merge; **inga direktcommits på `main` från Cursor** medan Lovable är aktiv.
> - PR-checklista: kör `tsgo` + `bunx vitest run` + `supabase--linter` innan merge.

---

## PATCH 5 — Hårda regler: RLS

**Ersätt / komplettera säkerhetsavsnittet:**
> - **Förbjudet:** RLS-policyer på formen `USING (col IS NULL OR shared_flag = true)` (OR-on-nullable). Använd safe-view-mönster + strikt base-policy (se `mem://constraints/rls-or-on-nullable`).
> - **Varje `CREATE TABLE public.*` MÅSTE följas av `GRANT`** i samma migration (`authenticated` + `service_role`; `anon` endast om policy tillåter). Migrations utan GRANT avvisas i review.
> - Roller ligger **enbart** i `ref_user_roles` (inte `user_roles`) — bekräfta namnet i alla nya edge functions (`requireAdmin`, `has_role`).
> - `search_path = public` på alla nya SECURITY DEFINER-funktioner.

---

## PATCH 6 — Namngivning: `ref_user_roles`

**Global find/replace i doc:n:** `user_roles` → `ref_user_roles` överallt där tabellen refereras (behåll `has_role`-funktionsnamnet). Motivering: HEAD använder `ref_user_roles`; en generisk `user_roles`-referens i doc:n leder Claude Code fel.

---

## PATCH 7 — Öppen fråga: AI Gateway på staging

**Lägg till beslutspunkt:**
> Lovable AI Gateway (`https://ai.gateway.lovable.dev`) fungerar endast för projekt kopplade till Lovable Cloud. Standalone staging måste välja:
> - **A)** Peka staging-edge-functions på **prod-gatewayen** via delad `LOVABLE_API_KEY` (enklast, delar quota).
> - **B)** Byt till **direkta providernycklar** (Google AI Studio, Anthropic) i staging — kräver ny secret-hantering + omskrivning av `ai_usage_logs`-kostnadsberäkning.
> **Kräver användarens beslut innan Cursor börjar arbeta i staging.**

---

## PATCH 8 — Email-provider-lås (saknas i doc:n)

**Lägg till constraint-block:**
> Email är hårdlåst till **Resend** via `mail.compcare.se` (`RESEND_API_KEY_1` via connector-gateway). Staging får:
> - Använda samma Resend-domän med `RESEND_FROM_DOMAIN=staging.compcare.se` **efter** verifiering, ELLER
> - Använda Resend sandbox-adress `onboarding@resend.dev`.
> Lovable Emails / `email_domain--*`-tools får **inte** aktiveras. Se `mem://constraints/email-provider-lock`.

---

## PATCH 9 — Fakturakontroll & BankID scope-lås (saknas)

**Lägg till:**
> - **Fakturakontroll:** AI-modell (`google/gemini-2.5-flash`), PASS1/PASS2-prompts, `compareTidrapportPasses`, confidence-trösklar och regelmotor A1–A8 får **ej ändras** utan explicit admingodkännande. Se `mem://security/invoice-check-change-control`.
> - **BankID:** Skarp signering endast i `/samarbetsintyg/:id` + `bankid-auth`/`bankid-collect`. Termen "BankID" får inte synas i UI utanför detta flöde — använd "Digital signering".

---

## PATCH 10 — Marketplace-isolation (saknas)

**Lägg till:**
> All marketplace-/agent-negotiation-utveckling isoleras i `mp_*`-tabeller, `marketplace-*` edge functions, `/marketplace`-routes, `src/(pages|components|hooks)/marketplace/*`. Dubbel feature-gate: `VITE_FEATURE_MARKETPLACE` + `app_settings.marketplace_enabled` (default OFF). Ingen refaktor av v1.0-kod utan explicit direktiv.

---

## Leverans

Efter godkännande skriver jag om detta som en unified diff mot befintlig doc-text (om du delar den), eller lämnar patch-listan som fristående appendix som du klistrar in själv.
