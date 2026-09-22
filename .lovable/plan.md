# Compcare Trust v1 — förändringsspecifikation (plan-only)

Ingen kod, databas, RLS-policy, fil eller konfiguration ändras av detta dokument. Compcare förblir source of truth. Referly utvecklas inte som separat backend.

Viktig utgångspunkt: trust-kärnan är redan påbörjad och verifierad i migrationerna 0004–0008 (`trust_issuers`, `trust_credential_types`, `trust_credentials`, `trust_claims`, `trust_evidence`, `trust_verification_events`, skapande-RPC och admin-transition med append-only logg). Specen bygger vidare på den, den ritar inte om den.

---

## 1. Nuläge och säkerhet

Inventerat i databasen (schema, policyer, funktioner, storage).

Faktiskt befintliga ref-objekt: **`ref_profiles`** och **`ref_user_roles`**. `ref_references`, `ref_verifications`, `ref_pings` och en share-tabell **finns inte** i den här databasen. Referens-data lever i stället i `consultant_references` (fritextkontakter, ingen verifiering) och dokument i `consultant_documents` + storage-bucket `verifications`.

| Risk | Status | Exakt objekt |
|---|---|---|
| a) publik läsning av profiler/referenstexter | LÖST | `ref_profiles`, `profiles`, `consultant_references`: samtliga policyer är ägarscopade (`id = auth.uid()` / `user_id = auth.uid()` / via `consultant_profiles`). Inga anon-policyer. |
| b) privilege escalation via roller | LÖST | Roller ligger separat i `ref_user_roles`; skrivning bara via policy `Admins can manage roles` med `ref_has_role(auth.uid(),'admin')`. Ingen roll på `profiles`. |
| c) self-verification | LÖST (denna vecka) | `consultant_documents`: trigger `guard_consultant_documents_status` låser `status` och `user_id` för icke-admin. `trust_credentials`: `guard_trust_credentials_fields` + insert-policy som bara tillåter `pending`/`self_asserted`/`source=user`. |
| d) klient skriver härledda trust-fält | LÖST | `guard_profiles_verification_fields` (ivo/hosp/bankid/profile_status), `guard_ref_profiles_trust_fields` (trust_score m.fl.), `guard_trust_credentials_fields`. |
| e) råa invite/response/share-tokens exponeras | EJ RELEVANT i dag, men riskyta kvar | Ingen share-/ping-tabell finns. Kvar finns däremot funktionen `get_document_share_by_token` som är SECURITY DEFINER **och körbar av `anon`**, mot en tabell som inte längre finns — den bör revokas/tas bort innan nya share-flöden byggs. |
| f) känsliga dokument läsbara bredare än avsett | LÖST | Alla fyra buckets (`verifications`, `invoice_reviews`, `imports`, `lonekoll_avtal`) är privata; verifieringsdokument låsta till `foldername(name)[1] = auth.uid()`. |
| g) SECURITY DEFINER med för bred behörighet | FINNS KVAR (1 objekt) | `get_document_share_by_token` har EXECUTE för `anon` + `PUBLIC`-liknande grant. Övriga (`ref_calculate_trust_score`, `ref_calculate_profile_status`, `ref_refresh_attachability`, `ref_get_user_org_id`) har bara postgres/service_role. Alla har explicit `search_path=public`. |

Ytterligare observation: `ref_calculate_trust_score`, `ref_calculate_profile_status`, `ref_refresh_attachability` och `create_document_share` refererar tabeller/kolumner som inte finns i denna databas och är därmed **trasiga vid anrop** (inte en säkerhetsrisk, men de får inte vara grund för ny logik).

---

## 2. Måldatamodell Trust v1

Fem av sju tabeller finns redan (0005). Nedan anges vad som är klart och vad som återstår.

**Klart (inga ändringar planerade i v1):** `trust_issuers`, `trust_credential_types`, `trust_credentials`, `trust_claims`, `trust_evidence`, `trust_verification_events` — med statuscheckar, assurance-nivåer, legacy-pekare, exakt-ett-värde-constraint på claims, index på `(subject_user_id,status)`, `credential_type_id`, `valid_to`, partiell unik på `(legacy_table, legacy_ref_id)` och append-only-trigger på händelseloggen.

**Nytt i v1 (tillkommer):**

`trust_share_grants`
- `id` uuid PK, `subject_user_id` uuid NOT NULL
- `token_hash` text NOT NULL UNIQUE (sha256 av engångstoken; rå token lagras aldrig)
- `token_prefix` text NOT NULL (8 tecken, för igenkänning i UI/logg)
- `grant_kind` text CHECK ('share_read','attestation','revalidation')
- `scope` jsonb NOT NULL DEFAULT '{}' (credential_type-slugs, credential_ids, fältnivå)
- `audience_label` text, `audience_email` text
- `expires_at` timestamptz NOT NULL, `max_uses` int, `used_count` int NOT NULL DEFAULT 0
- `revoked_at` timestamptz, `created_by` uuid, `created_at`
- Index: `(subject_user_id, revoked_at)`, `(expires_at)`, unik på `token_hash`

`trust_share_access_log` (append-only)
- `id`, `grant_id` FK → trust_share_grants ON DELETE CASCADE
- `accessed_at`, `ip_hash` text, `user_agent_hash` text, `outcome` text CHECK ('granted','expired','revoked','scope_denied','not_found')
- Ingen rå IP, ingen rå token.

`trust_requirement_sets` / `trust_requirements` (kravmodell, se §6)
- set: `id`, `slug` UNIQUE, `display_name`, `owner_kind` ('region','agency','platform'), `source_ref` text, `is_active`
- requirement: `id`, `set_id` FK, `credential_type_slug` text, `claim_key` text NULL, `operator` text CHECK ('exists','equals','gte','lte','in','not_expired'), `expected_json` jsonb, `min_assurance_level` text, `is_mandatory` boolean, `weight` numeric NULL
- Unik: `(set_id, credential_type_slug, coalesce(claim_key,''), operator)`

Soft-delete/expiry/revocation: credentials använder redan `status` + `valid_to` + `revoked_at`; grants använder `expires_at`/`revoked_at`/`used_count`. Ingen hård radering någonstans i trust-domänen.

---

## 3. Relationer och legacy-adapter

Eftersom `ref_references`/`ref_verifications`/`ref_pings` inte existerar här blir adapterarbetet mindre än i den ursprungliga målbilden.

- `consultant_references` → credentials av typ `professional_reference`, en credential per referensrad, `legacy_table='consultant_references'`, `legacy_ref_id=<rad-id>`. Namn/roll/organisation/relation blir claims (`referee_name`, `referee_role`, `referee_org`, `relationship`). Kontaktuppgifter (telefon/e-post) lagras **inte** som claims utan hålls kvar i legacy-tabellen; de exponeras aldrig i share-läsning.
- `consultant_documents` → credentials av typ `swedish_healthcare_license` / `hosp_extract` / `ivo_extract` / `certification` beroende på `doc_type`, med en `trust_evidence`-rad som pekar på bucket `verifications` + `file_path`. Ingen ny dokumenttabell behövs.
- Digital identitet (signering) → credential `digital_identity` med evidence `signature`; inga nya specialtabeller.
- `ref_profiles.trust_score`, `trust_tier`, `profile_status`, `status_checklist` behandlas som **presentation/derived** och blir läsare av trust-lagret senare — inga skrivningar från trust-lagret i v1.
- Legacyfält som behöver pekare: **inga i v1**. Kopplingen sker enkelriktat via `trust_credentials.legacy_table/legacy_ref_id`, så legacy-tabellerna rörs inte. `credential_id`-kolumner på `consultant_references`/`consultant_documents` läggs först i den fas där writes flyttas (steg F i §9).
- Ska INTE ändras i v1: `ref_profiles`, `ref_user_roles`, `consultant_profiles`, storage-layout, befintliga policyer som fungerar.

---

## 4. Verifieringslivscykel

Statusmodellen är redan satt och används: `pending` (= submitted/självrapporterat i väntan), `active` (verifierad och gällande), `rejected`, `expired`, `revoked`, `superseded`. Tillägget i v1 är enbart dokumentation och en schemalagd expiry-jobb-definition, inte nya statusar. Självrapporterat vs inskickat skiljs via `assurance_level` (`self_asserted` → `evidence_submitted`), inte via extra status.

Tillåtna övergångar (som implementerade):
```text
pending  -> active | rejected | revoked | superseded
active   -> expired | revoked | superseded
expired  -> active | revoked | superseded
rejected -> pending
revoked / superseded = terminala
```
Aktörer: subjektet skapar (`pending`) och kan skicka in nya evidence; admin/service utför alla övergångar via `trust_transition_credential`; issuer/agent-attestation går senare via samma funktion med `actor_kind='issuer'|'agent'`. Automatisk `active -> expired` sker via schemalagt jobb med `actor_kind='system'`.

Audit trail: varje övergång skriver en rad i `trust_verification_events`. Loggen är append-only i databasen (trigger blockerar UPDATE och DELETE för alla roller, verifierat), har inga klient-INSERT-grants, och är läsbar för subjektet och admin.

---

## 5. Assurance och provenance

Varje credential svarar på de fem frågorna med fält som redan finns:
- **Vem säger detta** → `issuer_id` (+ `trust_issuers.issuer_kind`, `verified_domain`) och `source` (`user|admin|import|legacy|system|agent`).
- **På vilken grund** → `trust_evidence` (`document`, `email_domain`, `signature`, `api_lookup`, `attestation`, `manual`) + `sha256` (sätts endast server-side).
- **Hur verifierat** → `assurance_level`: `self_asserted` < `evidence_submitted` < `document_verified` < `issuer_verified` < `authority_verified`. Tillägg i v1: en claim `verification_method` på event-payload-nivå i stället för ny kolumn.
- **När** → `verified_at`, `trust_verification_events.occurred_at`, `trust_evidence.collected_at`.
- **Gäller det fortfarande** → `status`, `valid_from`/`valid_to`, `revoked_at`, `revoked_reason`.

Regel: assurance_level får bara höjas av admin/service/issuer via transition-funktionen. Subjektet kan aldrig höja den (redan låst av guard-trigger).

---

## 6. Status- och kravmotor (separation av sanning och presentation)

- Sanningslager: `trust_credentials` + `trust_claims` + `trust_verification_events`.
- Kravlager: `trust_requirement_sets` / `trust_requirements` (§2) beskriver vad ett avrop eller en region kräver, datadrivet — inga hårdkodade checklistor.
- Utvärdering: en ren funktion `trust_evaluate_requirements(subject, requirement_set)` som returnerar per krav `met | not_met | unknown` plus vilken credential som uppfyllde det. `unknown` används när uppgift saknas — aldrig "godkänt vid tveksamhet".
- `ref_calculate_profile_status`, `trust_score` och `trust_tier` behandlas som presentation ovanpå detta och pensioneras gradvis. Ingen ny scoremodell i v1.

---

## 7. API-placering (ingen implementation nu)

- **Internt service-lager** (server functions i Compcare): `createSelfAssertedCredential`, `submitEvidence`, `listMyCredentials`, `adminTransition`, `evaluateRequirements`.
- **Publik scoped läsning**: `GET /api/public/trust/share/:token` — löser token via hash, kontrollerar expiry/revoke/max_uses, returnerar endast credentials inom `scope` och endast säkra fält, loggar i `trust_share_access_log`.
- **Attestation/revalidation**: `POST /api/public/trust/attest/:token` — engångstoken, skriver `attested`/`reconfirmed`-event, kan aldrig sätta `active` utan att kravet på issuer-verifiering är uppfyllt.
- **Framtida Agent API capability**: `trust.verify_requirements` och `trust.read_shared_credentials`, båda med `agent_api_keys`-autentisering och `actor_api_key_id` i audit-loggen. Byggs inte nu.

---

## 8. RLS och säkerhetsmodell för nya tabeller

- `trust_share_grants`: SELECT endast subjektet (+admin). INSERT/UPDATE **aldrig** direkt från klient — endast via SECURITY DEFINER-RPC som genererar token, lagrar `token_hash`, och returnerar rå token exakt en gång. Ingen klient-DELETE; revoke via RPC som sätter `revoked_at`. Aldrig klientskrivbara: `token_hash`, `token_prefix`, `used_count`, `revoked_at`, `subject_user_id`.
- `trust_share_access_log`: ingen klientåtkomst alls utom subjektets SELECT; INSERT endast server/service; UPDATE/DELETE blockerade av trigger (samma mönster som `trust_verification_events`).
- `trust_requirement_sets` / `trust_requirements`: SELECT för `authenticated`, skrivning endast admin/service. Ingen anon-läsning.
- Grants: ingen `anon`-grant på någon trust-tabell (projektets default privileges ger annars `anon` ALL — måste revokas explicit i samma migration, som i 0008).
- Tokens: endast sha256-hash i databasen, rå token visas en gång i svaret, `token_prefix` för spårbarhet. Konstanttidsjämförelse i handlern.
- service_role: används bara i publika share/attest-handlers efter tokenvalidering, aldrig för vanliga inloggade läsningar (då gäller `requireSupabaseAuth` + RLS).
- Storage/evidence: buckets förblir privata; delning sker via kortlivade signerade URL:er som genereras i handlern efter scope-kontroll, aldrig genom bredare storage-policyer.
- SECURITY DEFINER-regler: explicit `search_path=public`, EXECUTE endast till de roller som verkligen behöver den, och behörighet avgörs **aldrig** av `current_user` inne i funktionen (det är alltid ägaren) utan av admin-roll eller JWT-roll.

---

## 9. Migreringsplan (bakåtkompatibel, i ordning)

| Fas | Innehåll | Risk | Rollback | Beroenden | Testkriterier |
|---|---|---|---|---|---|
| A. Security hardening | Revoke `anon`/PUBLIC EXECUTE på `get_document_share_by_token`; besluta om den och `create_document_share` ska tas ur bruk (markeras deprecated) | Låg; funktionerna är redan trasiga | Återställ grant | Inga | Anon-anrop ger 401/403; inget UI-flöde slutar fungera |
| B. Additiva trust-tabeller | `trust_share_grants`, `trust_share_access_log`, kravtabellerna + RLS/grants/triggers | Låg (endast nytt) | Tabellerna är oanvända, kan lämnas tomma | A | Anon nekas på alla nya tabeller; append-only bevisat; typecheck/build OK |
| C. Legacy-adapters | Läsvyer som projicerar credentials i det format dagens UI förväntar (t.ex. dokumentstatus per `doc_type`) | Låg | Droppa vy | B | Vy ger samma rader som dagens direktläsning |
| D. Backfill | Skriv befintliga `consultant_documents` och `consultant_references` som credentials med `legacy_ref_id` | Medel: dubbletter | Radera credentials med `source='legacy'` | C | Antal credentials = antal legacyrader; unik legacy-index håller; idempotent vid omkörning |
| E. Dual-read | UI/serverfunktioner läser trust-lagret men jämför mot legacy i logg | Medel: avvikelser | Flagga tillbaka till legacy-läsning | D | Noll avvikelser under en definierad period |
| F. Nya writes via trust-lagret | Uppladdning/referens skapar credential som primär post; `credential_id` läggs på legacy-tabellerna | Hög: berör aktiva flöden | Feature-flagga tillbaka writes | E | Nytt dokument syns i både trust och legacy; ingen self-verify möjlig |
| G. Pensionering | `ref_calculate_trust_score`/`profile_status` ersätts av kravmotor + presentationslager; ref-specifik logik markeras deprecated | Medel | Behåll gamla funktioner orörda till sista steget | F | Inga anrop kvar i kod; UI oförändrat för användaren |

---

## 10. Exakt build-ordning (små steg med Definition of Done)

1. **Hardening av kvarvarande SECURITY DEFINER** — revoke anon/PUBLIC EXECUTE på `get_document_share_by_token`, deprecated-kommentar på den och `create_document_share`. DoD: anon nekas, allowlist-testet grönt, inget UI påverkat.
2. **`trust_share_grants` + revoke/expiry-RPC** — tabell, RLS, hashad token, create/revoke via RPC. DoD: rå token finns inte i databasen; utgången/återkallad token nekas; anon har noll grants.
3. **`trust_share_access_log`** — append-only, ingen rå IP. DoD: UPDATE/DELETE blockerat i databasen; åtkomstförsök loggas med rätt `outcome`.
4. **Publik scoped läsendpoint** — `/api/public/trust/share/:token`, scope-filtrerad projektion, signerade URL:er. DoD: fel token ger 404 utan informationsläckage; utanför scope returneras aldrig.
5. **Attestation/revalidation-endpoint** — engångstoken, skriver event, höjer aldrig status själv. DoD: token kan användas en gång; event finns i loggen.
6. **Kravtabeller + `trust_evaluate_requirements`** — datadriven utvärdering med `met/not_met/unknown`. DoD: enhetstester för alla operatorer; saknad uppgift ger `unknown`.
7. **Legacy-vyer + backfill (idempotent)** — DoD: omkörning skapar inga dubbletter; radantal stämmer.
8. **Dual-read med avvikelseloggning** — DoD: noll avvikelser under mätperioden.
9. **Writes via trust-lagret bakom feature-flagga** — DoD: nytt dokument/referens skapar credential + event; self-verify fortfarande omöjligt.
10. **Pensionering av ref-specifik statuslogik** — DoD: presentationslagret läser kravmotorn, inga anrop till trasiga ref-funktioner kvar.

Portabilitet mot ett framtida separat AP Trust: all trust-logik hålls i `trust_*`-tabeller, `trust_*`-funktioner och `/api/public/trust/*`-rutter, utan referenser till Compcares pris-, rapport- eller fakturadomän. Kopplingen till användare sker via `subject_user_id` och till legacy via `legacy_table`/`legacy_ref_id`, vilket gör domänen utlyftbar utan att resten av Compcare skrivs om.
