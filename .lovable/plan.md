

# Säkerhetsgenomlysning — CompCare

## Sammanfattning

Genomlysningen identifierar **20 findings** i tre kategorier: kritiska (kräver åtgärd), medel (bör åtgärdas), och avsiktligt publika (OK men bör dokumenteras).

---

## KRITISKT (3 st)

### 1. Storage-bucketen "imports" saknar RLS-policyer helt
Bucketen är nu privat (bra), men det finns **inga storage.objects-policyer** för SELECT/INSERT/UPDATE/DELETE. Utan policyer kan ingen nå filerna via API:et (bra), men det finns heller ingen kontrollerad åtkomstväg. Om en Edge Function behöver ladda ner importfiler via signerade URL:er fungerar det via service_role, men om klienten någonsin ska kunna ladda upp till bucketen krävs en explicit INSERT-policy.

**Åtgärd:** Skapa explicita RLS-policyer för imports-bucketen (minst SELECT och INSERT scopade till admin/service_role).

### 2. `ref_references` exponerar `invite_token` för referensägaren
SELECT-policyn tillåter `individual_id = auth.uid()` att läsa alla kolumner, inklusive `invite_token`. Konsulten kan därmed själv besvara sin egen referensförfrågan.

**Åtgärd:** Skapa en vy (`ref_references_safe`) som exkluderar `invite_token` och `giver_email`, och rikta klientens SELECT mot den vyn istället.

### 3. `ref_pings` exponerar `response_token` för referensägaren
Samma mönster — individen kan läsa ping-tokens och svara å referensgivarens vägnar.

**Åtgärd:** Skapa en vy (`ref_pings_safe`) utan `response_token` för individens SELECT.

---

## MEDEL (4 st)

### 4. `ref_profiles` är helt publikt läsbar för `anon`
Policyn `"Public profiles are readable"` ger anon full SELECT på alla ref_profiles. Det inkluderar `email`, `full_name`, `bio`, `bankid_verified`, `trust_score` m.m. för **alla** profiler.

**Åtgärd:** Begränsa anon-SELECT till enbart profiler som uttryckligen valt att vara publika, eller ta bort anon-policyn helt och låt `ref_get_public_profile()`-funktionen (SECURITY DEFINER) hantera publik åtkomst.

### 5. `ref_get_user_org_id` returnerar godtycklig org vid multipla medlemskap
Funktionen har `LIMIT 1` utan `ORDER BY`. Om en användare tillhör flera organisationer kan RLS-policyer för `ref_representation_requests` ge åtkomst till fel organisations data.

**Åtgärd:** Lägg till `ORDER BY created_at ASC` eller begränsa till en org per användare.

### 6. `ref_representation_requests` exponerar `secret_token` för byrån
Byrån kan läsa alla kolumner inklusive det hemliga tokenet.

**Åtgärd:** Exkludera `secret_token` från byråns SELECT via en vy.

### 7. `verifications`-bucketen saknar UPDATE-policy
Det finns SELECT, INSERT och DELETE men ingen UPDATE. Beroende på användning kan detta leda till oväntade beteenden.

**Åtgärd:** Lägg till en explicit UPDATE-policy.

---

## AVSIKTLIGT PUBLIKT (OK, men bör verifieras)

Följande tabeller har `SELECT USING (true)` för `anon`/`public` — bekräfta att detta är avsiktligt:

| Tabell | Innehåller PII? | Bedömning |
|---|---|---|
| `rates` | Nej (ramavtalspriser) | OK — offentlig marknadsdata |
| `calloff_imports` | Nej (avrop utan priser) | OK — offentlig upphandlingsdata |
| `requests` | Nej (med `is_public`-filter i RLS) | OK |
| `roles` | Nej (yrkeskategorier) | OK |
| `zones` | Nej (geografiska zoner) | OK |
| `locations` | Nej (orter) | OK |
| `specialties` | Nej (specialiteter) | OK |
| `contract_versions` | Nej (ramavtalsversioner) | OK |
| `ref_verified_domains` | Nej (domänlista) | OK |
| `ref_role_profiles` | Nej (rollkonfiguration) | OK |
| `capability_definitions` | Nej (systemkonfiguration) | OK |
| `salary_benchmarks` | Nej (aggregerad data, `threshold_passed=true`) | OK |
| `geographies` | Nej | OK |
| **`ref_profiles`** | **JA (email, namn)** | **Bör åtgärdas (se punkt 4)** |

---

## ÖVRIGA NOTERINGAR

- **4 funktioner saknar `SET search_path`**: `enqueue_email`, `move_to_dlq`, `delete_email`, `read_email_batch`. Låg risk (SECURITY DEFINER men ingen användarinput i tabellnamn), men bör fixas.
- **10 st "RLS Policy Always True"-varningar**: Alla gäller `service_role`-policyer eller avsiktligt publika SELECT-policyer. Stämmer med arkitekturen.
- **Tidigare fixade findings** (e2e-test endpoint, BankID mock, prediction endpoints) är korrekt markerade som åtgärdade.

---

## Åtgärdsplan (prioriterad)

1. **Ta bort anon-SELECT på `ref_profiles`** — hindrar scanning av alla konsulters e-post och namn
2. **Skapa vyer för `ref_references` och `ref_pings`** — dölj känsliga tokens
3. **Lägg till RLS-policyer för `imports`-bucketen**
4. **Skapa vy för `ref_representation_requests`** — dölj `secret_token`
5. **Fixa `ref_get_user_org_id`** — lägg till ORDER BY
6. **Lägg till UPDATE-policy för `verifications`-bucketen**
7. **Sätt `search_path` på e-postköfunktionerna**

Ska jag implementera dessa åtgärder?

