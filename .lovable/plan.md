# Compcare Trust v1 — förändringsspec (plan only)

Ingen kod, inga migrationer, inga DB-/konfigändringar i detta dokument.

## 0. Audit av dagens läge (verifierat mot databasen nu)

Faktiskt läge i Compcare:

- `ref_*` i detta projekt är bara `ref_profiles` och `ref_user_roles`. `ref_references`, `ref_pings`, `ref_verifications`, `ref_role_profiles`, `ref_verified_domains` finns **inte** här — de är legacy-Referly.
- RLS på `ref_profiles`: endast egen rad (select/insert/update), ingen publik läsning. Derived trust-fält (`bankid_verified`, `trust_score`, `trust_tier`, `score_breakdown`, `profile_status`) skrivskyddas av triggern `guard_ref_profiles_trust_fields` som återställer dem för icke-service_role. ✅ ingen self-verification-väg via tabellen.
- `ref_user_roles`: läs egen rad, `ALL` endast för admin via `ref_has_role` (SECURITY DEFINER). ✅ ingen self-role-escalation.
- **Trasiga legacy-funktioner (verkliga fynd):** `ref_calculate_trust_score` och `ref_calculate_profile_status` läser tabeller som inte finns här (`ref_references`, `ref_verified_domains`, `ref_role_profiles`) → fel vid anrop. `create_document_share` skriver till `public.document_shares` som inte finns, och matchar `consultant_documents.consultant_id` medan kolumnen heter `user_id`. `get_document_share_by_token` läser samma icke-existerande tabell. Delningsflödet är alltså dött, inte osäkert.
- Dagens reella datalager för identitet: `consultant_profiles` (user_id-scopad), `consultant_documents` (user_id, doc_type, file_path, status), `consultant_references` (fritext, ingen verifiering), `profile_audit_log` (fältnivå-historik), `profiles` med `guard_profiles_verification_fields`.
- **Risk att åtgärda:** `consultant_documents` UPDATE tillåts av användaren när `status = 'pending'` men det finns ingen guard som hindrar att `status` sätts till `verified` i samma update → self-verification-väg. Verifieras och stängs i steg 1.
- Agent-API-mönstret finns redan: `agent_api_keys` (key_prefix + key_hash + scopes[] + rate_limit_daily + revoked_at), `agent_user_tokens` (token_prefix + token_hash + expires_at + revoked_at), `agent_api_logs`. Endast hash lagras. ✅ mönstret återanvänds.

## 1. Vad som INTE ändras i v1

`ref_profiles`, `ref_user_roles`, `ref_has_role`, `guard_*`-triggrar, `consultant_profiles`, `consultant_references`, `consultant_documents` (utom en additiv statusguard), `profiles`, `profile_audit_log`, alla befintliga sidor/komponenter/hooks, `agent_api_*`-tabeller, sitemap, RLS på befintliga tabeller. Inga drops, inga renames, inga typbyten.

## 2. Nya tabeller (alla `public.trust_*`)

Gemensamt: `id uuid pk default gen_random_uuid()`, `created_at timestamptz not null default now()`, `updated_at` där rader muteras. Alla FK `on delete restrict` utom där annat anges.

- **trust_issuers** — `slug text unique not null`, `display_name text not null`, `issuer_kind text not null check in ('authority','employer','education','platform','self')`, `country char(2) default 'SE'`, `verified_domain text`, `assurance_default text`, `is_active bool not null default true`.
- **trust_credential_types** — `slug text unique not null`, `display_name text not null`, `category text not null check in ('license','specialty','certification','employment','reference','document','identity')`, `requires_expiry bool not null default false`, `default_validity_months int`, `expected_issuer_kind text`, `schema jsonb not null default '{}'` (fält-schema för `trust_claims`), `is_active bool not null default true`.
- **trust_credentials** — `subject_user_id uuid not null` (ingen FK mot `auth.users`), `credential_type_id uuid not null fk trust_credential_types`, `issuer_id uuid fk trust_issuers`, `status text not null default 'pending' check in ('pending','active','expired','revoked','rejected')`, `assurance_level text not null default 'self_asserted' check in ('self_asserted','document_verified','issuer_verified','authority_verified')`, `valid_from date`, `valid_to date`, `revoked_at timestamptz`, `revoked_reason text`, `source text not null check in ('user','admin','import','legacy_ref','agent')`, `legacy_ref_id uuid`, `legacy_table text`. Index: `(subject_user_id, status)`, `(credential_type_id)`, `(valid_to)`, unique `(legacy_table, legacy_ref_id)` där not null.
- **trust_claims** — normaliserade påståenden per credential: `credential_id uuid not null fk trust_credentials on delete cascade`, `claim_key text not null`, `value_text text`, `value_num numeric`, `value_date date`, `value_bool bool`, `value_json jsonb`, check "exakt ett värdefält satt". Unique `(credential_id, claim_key)`. Index `(claim_key, value_text)`.
- **trust_evidence** — `credential_id uuid not null fk on delete cascade`, `evidence_kind text not null check in ('document','email_domain','signature','api_lookup','attestation','manual')`, `storage_bucket text`, `storage_path text`, `document_id uuid` (pekar `consultant_documents.id`, ingen hård FK i v1), `sha256 text`, `collected_at timestamptz not null default now()`, `collected_by uuid`, `metadata jsonb not null default '{}'`.
- **trust_verification_events** — append-only audit: `credential_id uuid not null fk on delete cascade`, `event_type text not null check in ('created','submitted','attested','reconfirmed','verified','rejected','expired','revoked','shared','accessed')`, `actor_kind text not null check in ('subject','admin','issuer','system','agent')`, `actor_user_id uuid`, `actor_api_key_id uuid fk agent_api_keys`, `from_status text`, `to_status text`, `reason text`, `payload jsonb not null default '{}'`, `occurred_at timestamptz not null default now()`. Index `(credential_id, occurred_at desc)`.
- **trust_requirement_sets** — `slug text unique not null`, `display_name text not null`, `owner_org_id uuid`, `source text`, `is_active bool default true`.
- **trust_requirement_rules** — `set_id uuid not null fk on delete cascade`, `rule_key text not null`, `credential_type_slug text not null`, `operator text not null check in ('exists_active','claim_equals','claim_in','min_count','max_age_months','valid_on')`, `claim_key text`, `expected_text text`, `expected_list text[]`, `expected_num numeric`, `severity text not null default 'required' check in ('required','preferred')`, `sort_order int default 0`.
- **trust_shares** — `subject_user_id uuid not null`, `token_hash text not null unique`, `token_prefix text not null`, `scope jsonb not null default '{}'` (vilka credential-typer/ids som ingår), `expires_at timestamptz`, `revoked_at timestamptz`, `recipient_label text`, `recipient_email text`, `max_views int`, `view_count int not null default 0`, `created_by uuid not null`. **Råa tokens lagras aldrig.**

## 3. Relationer och canonical source

`trust_credentials` blir canonical för credentials/trust på sikt. Legacy kopplas in via `legacy_table`/`legacy_ref_id` (adapter, ej FK): `consultant_documents` → credential av kategori `document` med evidens `document`; `consultant_references` → kategori `reference` med `assurance_level='self_asserted'`; `ref_profiles.bankid_verified` → kategori `identity`; Referly `ref_references`/`ref_pings`/`ref_verifications` importeras vid behov som `source='legacy_ref'` — Referly får ingen ny affärslogik. `ref_profiles.trust_score`/`trust_tier` lämnas orörda och blir på sikt derived vy över `trust_credentials`; befintligt UI läser samma kolumner som idag.

## 4. Säkerhet

- RLS på samtliga nya tabeller, plus explicita GRANTs.
- `trust_issuers`, `trust_credential_types`, `trust_requirement_sets`, `trust_requirement_rules`: SELECT för `authenticated` (katalogdata, ingen PII). Skrivning endast `service_role`. Ingen `anon`-grant.
- `trust_credentials`: SELECT/INSERT/UPDATE för ägaren (`subject_user_id = auth.uid()`), men UPDATE begränsas av trigger som återställer derived fält. Ingen DELETE för klient (revoke istället).
- `trust_claims`, `trust_evidence`: åtkomst endast via ägarskap på credential (EXISTS-subquery). Ingen `anon`.
- `trust_verification_events`: SELECT egen, **ingen** klient-INSERT/UPDATE/DELETE — endast service_role. Append-only via trigger som blockerar UPDATE/DELETE.
- `trust_shares`: SELECT/INSERT/UPDATE (revoke) för ägaren, men `token_hash`/`token_prefix`/`view_count` aldrig klientsatta. Mottagaråtkomst sker **aldrig** via RLS — bara via server-handler som slår upp hash.
- **Aldrig klientskrivbara kolumner:** `trust_credentials.status`, `assurance_level`, `revoked_at`, `revoked_reason`, `source`, `legacy_*`; `trust_evidence.sha256`, `collected_by`; allt i `trust_verification_events`; `trust_shares.token_hash`, `token_prefix`, `view_count`. Skyddas med guard-trigger enligt samma mönster som `guard_ref_profiles_trust_fields`.
- Tokens: generera server-side (32 byte), returnera en gång i klartext, lagra `sha256`-hash + prefix, alltid `expires_at`, revoke via `revoked_at`, logga åtkomst i `trust_verification_events` (`accessed`). Samma modell som `agent_user_tokens`.
- SECURITY DEFINER-funktioner som behövs: `trust_create_share` (validerar ägarskap, mintar token), `trust_get_share_by_token` (hash-uppslag, respekterar expiry/revoke/max_views, returnerar maskerad payload), `trust_evaluate_requirements` (läser över RLS för att kunna svara på annans uppdrag, men bara aggregerat), `trust_credential_summary`. Externa anrop går via server-handlers under `src/routes/api/public/agent/*` med nyckel/token-verifiering — inga nya publika råa RLS-läsningar.
- Fixar i samma spår: statusguard på `consultant_documents` (hindra klient från att sätta `verified`), och beslut om de tre trasiga legacy-funktionerna (`ref_calculate_trust_score`, `ref_calculate_profile_status`, `create_document_share`/`get_document_share_by_token`) ska lagas eller markeras deprecated — inget drop i v1.

## 5. Migration (additiv, reversibel, ingen destruktiv operation i v1)

1. Katalogtabeller + RLS + GRANT (`trust_issuers`, `trust_credential_types`) och seed av taxonomi.
2. `trust_credentials`, `trust_claims`, `trust_evidence` + RLS + guard-triggrar.
3. `trust_verification_events` + append-only-trigger; börja logga från all ny skrivning.
4. Backfill-adapter: läs `consultant_documents`/`consultant_references`/`ref_profiles` → skapa credentials med `source`/`legacy_*`, idempotent via unik `(legacy_table, legacy_ref_id)`.
5. Läsvyer för UI-kompatibilitet (`trust_credential_summary_v1`) — UI byter inte ännu.
6. Dual-write: nya skrivningar landar i både legacy-tabell och `trust_credentials` bakom en serverfunktion; legacy fortsätter vara läskälla.
7. Requirement-tabeller + evaluator.
8. `trust_shares` + share-funktioner; det trasiga document-share-flödet ersätts av det nya (legacy lämnas kvar, deprecated-kommenterat).
9. Cutover: UI läser vyn i stället för legacy, ett ytkomponent i taget. Pensionering = `COMMENT ... 'DEPRECATED'`, aldrig drop i v1.

## 6. API-kontrakt (definieras, byggs inte)

Alla under `/api/public/agent/`, samma auth-mönster som `agent_api_keys` (server-to-server, `x-api-key`) + `agent_user_tokens` (user-scoped bearer). Allt loggas i `agent_api_logs`.

- `GET /trust/credentials/summary` — user-scoped token. Svar: `{ subject_ref, credentials: [{ type, category, status, assurance_level, valid_to, issuer, last_event_at }], counts, generated_at }`. Ingen PII om tredje part.
- `POST /trust/requirements/evaluate` — body `{ subject_ref | share_token, requirement_set_slug | rules[] }`. Svar per regel: `{ rule_key, result: 'met'|'not_met'|'unknown', evidence: [{ credential_id, type, assurance_level, valid_to }], provenance: { issuer, verified_at, method }, reason }` + `overall: 'met'|'not_met'|'unknown'`.
- `POST /trust/shares` (user-scoped) → `{ share_id, token, url, expires_at }` (token visas en gång). `GET /trust/shares/{token}` (ingen auth, hash-uppslag) → maskerad summary. `POST /trust/shares/{id}/revoke`.
- `POST /trust/credentials/{id}/attest` | `/reconfirm` | `/revoke` — attest/verify kräver issuer- eller admin-scope, aldrig subjektet självt. Alla skapar `trust_verification_events`.
- Scopes: `trust:read.self`, `trust:read.shared`, `trust:verify`, `trust:share.write`, `trust:attest`, `trust:admin`.

## 7. Requirement engine — exempel

- "aktiv legitimation" → `credential_type_slug='license_se'`, `operator='exists_active'`, `valid_on=today`.
- "specialitet anestesi" → `credential_type_slug='specialty'`, `operator='claim_equals'`, `claim_key='specialty_slug'`, `expected_text='anestesi'`.
- "minst två referenser yngre än 36 månader" → två regler: `min_count=2` + `max_age_months=36` på `reference`.
- "HLR giltig" → `certification` + `claim_equals(cert_slug,'hlr')` + `valid_on`.
- `unknown` används när credential saknas helt eller `assurance_level` är lägre än vad regeln kräver — aldrig `not_met` utan underlag.

## 8. Backward compatibility

Orörda i fas 1: alla nuvarande sidor/komponenter/hooks, `ref_has_role`, `ref_user_roles`, `consultant_*`-RLS (utom additiv statusguard), `profile_audit_log`. Adapterlager behövs på tre ställen: legacy→credential-backfill, läsvy för UI, och dual-write-serverfunktion.

## 9. Test- och acceptanskriterier

RLS-test per tabell (anon nekas, annan användare nekas, ägare tillåts); guard-test att derived kolumner inte kan sättas av klient; append-only-test på events; token-test (ingen rå token i DB, expiry/revoke/max_views nekar); revocation- och expiry-test i evaluator (`not_met` respektive `unknown`); idempotens-test på backfill (dubbelkörning ger samma antal rader); API-kontrakttest mot svarsschema; audit-test att varje statusövergång har ett event; migreringskontroll att inga befintliga objekt ändrats.

## 10. Beslutspunkter före implementation

1. Namnrymd `trust_*` eller `cc_trust_*`. 2. Credential-taxonomi (vilka `category`-värden och slugs som är kanoniska). 3. Assurance-nivåernas definition och vem som får sätta `authority_verified`. 4. Retention för evidens och events (och om evidensfiler ska vara egen bucket). 5. Consent/share-semantik: opt-in per delning eller stående samtycke; ska mottagaren identifieras. 6. Om trust score förblir derived UI-mått (rekommenderat) eller blir del av domänmodellen. 7. Om Referly-data ska importeras alls i v1. 8. Om de trasiga legacy-funktionerna lagas eller deprecateras.

## 11. Rekommenderad byggordning

1. Säkerhetsfixar + beslut om trasiga legacy-funktioner — **låg**.
2. Katalogtabeller + taxonomi-seed — **låg**.
3. `trust_credentials`/`claims`/`evidence` + RLS + guards — **medel**.
4. `trust_verification_events` append-only + logging — **låg/medel**.
5. Backfill-adapter + läsvy (ingen UI-ändring) — **medel**.
6. Requirement-modell + evaluator — **hög**.
7. Agent-API-endpoints med scopes + loggning — **medel/hög**.
8. `trust_shares` + share-handlers, sedan stegvis UI-cutover — **medel**.
