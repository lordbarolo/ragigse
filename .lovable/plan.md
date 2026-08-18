# Varför säkerhetslistan ser likadan ut varje gång

## Kort svar

Listan är inte 21 nya buggar. Den består av tre olika saker:

1. **18 "Ignored"** — de är redan granskade och avsiktligt bortprioriterade av dig/oss. De ligger kvar i listan för spårbarhet och kommer att synas varje gång tills de tas bort. De skannas om, men de larmar inte.
2. **3 aktiva varningar** — de kommer från en mönsterbaserad (heuristisk) granskare som inte kan se hur appen faktiskt anropar databasen. Den läser bara reglerna i databasen och gissar risk. Två av tre är formuleringsfrågor, inte hål.
3. **Ingen minnesfunktion i granskaren** — varje körning börjar om från noll. Om vi inte antingen (a) skriver om regeln så mönstret försvinner, eller (b) markerar fyndet som medvetet i säkerhetsminnet, dyker exakt samma text upp nästa vecka. Det är därför det känns återkommande.

## Vad de tre aktiva faktiskt är (verifierat mot databasen nu)

| Fynd | Verkligt läge | Bedömning |
|---|---|---|
| Referenskontaktuppgifter via "brusten ägarkedja" | Alla fyra regler på `consultant_references` går via `consultant_profiles.user_id = auth.uid()`, och `user_id` är `NOT NULL`. Kedjan kan alltså inte brista. | Falskt positivt. Kan dock göras uppenbart korrekt genom att gå direkt mot ägaren i stället för via underfråga. |
| Agent-nycklar/token-regler riktade mot `public` | Reglernas villkor är korrekta (`auth.uid() = user_id`, admin-kontroll), men de är skrivna `TO public` i stället för `TO authenticated`. Utloggade får ändå inget, eftersom `auth.uid()` är tomt. | Härdning, inte hål. Bör städas. |
| E-postloggar använder `auth.role()` | `email_send_log`, `email_send_state`, `suppressed_emails` filtrerar på `auth.role() = 'service_role'` i stället för `TO service_role`. Fungerar, men är det mönster granskaren alltid flaggar. | Härdning, inte hål. Bör städas. |

Inget av de tre öppnar data för fel användare i dag.

## Förslag: bryt loopen i tre steg

### Steg 1 — Städa de tre aktiva så mönstret försvinner permanent
En migration som **bara** byter uttrycksform, inte behörighet:
- `agent_api_keys`, `agent_user_tokens`: samma villkor, men `TO authenticated`.
- `email_send_log`, `email_send_state`, `suppressed_emails`: ersätt `auth.role() = 'service_role'` med regler riktade `TO service_role`.
- `consultant_references`: ersätt underfrågan med samma ägarkontroll uttryckt direkt, så kedjan är läsbar för både granskare och människa.

Efter migrationen körs granskaren igen för att bekräfta att de tre är borta — inte "antas borta".

### Steg 2 — Skriv ned besluten i säkerhetsminnet
De av de 18 ignorerade som är medvetna designval (delningstokens som ägaren själv ska kunna se, publika avropsdata, SECURITY DEFINER-funktioner som ska vara anropbara, pgvector i `public`) dokumenteras med motivering i säkerhetsminnet. Det är den enda mekanismen som gör att framtida skanningar slutar återrapportera dem som nyheter.

### Steg 3 — Gå igenom de ignorerade en gång, med beslut per rad
Jag listar de 18 i tre grupper — **avsiktligt / behöver åtgärd / oklart** — med en rads motivering var. Du beslutar per rad. De som ska åtgärdas blir en egen kort åtgärdslista; resten avvecklas ur listan via minnet.

## Vad detta inte rör

Ingen ändring i vem som får se vad, inga ändringar i appkod, prompts, priser eller UI. Enbart formuleringen av databasreglerna plus dokumentation.

## Teknisk detalj

- Alla policyändringar sker som `DROP POLICY` + `CREATE POLICY` i en migration, med `GRANT`-läget oförändrat.
- Villkoren kopieras semantiskt identiskt; endast `TO`-rollen och uttrycksformen ändras.
- Verifiering: `supabase--linter` + `security--run_security_scan` efter migration, samt en läskontroll som bekräftar att en inloggad konsult fortfarande ser sina egna referenser och inte andras.
- Två av de kvarvarande varningarna i skannern (`organizations` öppen insert, `avrop_intelligence` agency-scoping) tillhör steg 3, inte steg 1.
