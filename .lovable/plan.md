# Plan: Åtgärda 4 säkerhets-/funktionsproblem

## Svar på frågan: Har det varit omöjligt att skapa konto?

Nej — kontoskapande via /registrera fungerar (där är man inloggad). Det som varit brutet är **enkätflödet för utloggade besökare**: när en besökare fyller i enkäten på startsidan ska svaren sparas som en "lead" i databasen, men databasen har avvisat alla sådana sparningar. Därför har även steget "spara min e-post / få min rapport" misslyckats (96 fel på 24 h), eftersom leaden aldrig skapats. Verifierat i databasen: tabellen `leads` saknar helt behörigheter, och rollkontrollfunktionen `ref_has_role` kan inte köras av utloggade.

## Fynd 1 (högst prio): Enkätsvaren kan inte sparas — leads-tabellen

**Rotorsak:** En tidigare migration drog tillbaka alla rättigheter på `public.leads`, och återlämnandet av INSERT-rättigheten har inte slagit igenom i produktion. Verifierat: tabellen har noll behörigheter idag.

**Åtgärd:**
- Ny migration som ger `GRANT INSERT ON public.leads TO anon, authenticated` (och service_role).
- Befintlig RLS-policy styr vad som får skrivas — inga nya policyer behövs, inget läsande av leads öppnas.
- Verifiera efteråt med en test-insert som anon + att SELECT fortfarande är stängt för anon.

## Fynd 2: "Permission denied" för utloggade — ref_has_role

**Rotorsak:** En migration drog tillbaka rätten att köra `ref_has_role` från alla, men återlämnade den bara till inloggade. Funktionen används i åtkomstreglerna på ~29 tabeller, så varje utloggad förfrågan mot dessa tabeller kraschar helt i stället för att bara returnera tomt.

**Åtgärd:**
- Ny migration: `GRANT EXECUTE ON FUNCTION public.ref_has_role(uuid, ref_app_role) TO anon`.
- Funktionen är redan `SECURITY DEFINER` och läser bara en rolltabell — att låta utloggade *köra* den ger dem inga nya rättigheter; den svarar bara "nej" för dem. Detta är det säkra minimalfixet (alternativet, att skriva om 29 policyer, är större och riskabelt).
- Uppdatera allowlist-testet i `src/security/rpcGrants.test.ts` om det behövs.

## Fynd 3: "Lead not found" i e-poststeget (save-email)

**Rotorsak:** Främst en följd av fynd 1 — leaden skapades aldrig. Men funktionen hanterar också fallet dåligt: gamla leadId i webbläsarens lagring eller lead skapad i annan miljö ger 404 utan återhämtning.

**Åtgärd:**
- Efter fynd 1+2 försvinner huvuddelen av felen.
- Komplettera `save-email` så att ett okänt leadId ger ett tydligt svenskt felmeddelande och klienten (Survey/InlineTerminalSurvey) då skapar en ny lead och försöker igen, i stället för att fastna.
- Inget nytt flöde, bara återhämtning i befintligt steg.

## Fynd 4: Engångslänkar för referensbekräftelse bränns utan att svaret sparas

**Rotorsak:** I attest-rutan markeras länken som använd *innan* svaret sparats. Om något går fel efteråt får referenten "Länken har redan använts" vid nytt försök.

**Åtgärd:**
- Flytta konsumeringen av länken (`resolveGrant(..., consume=true)`) till efter att `trust_verification_events`-inserten lyckats, eller inför ett separat consume-steg som bara körs vid framgång.
- Påverkar bara `src/routes/api/public/trust/attest.$token.ts` och ev. `src/lib/trust/share.server.ts`. Ingen schemaändring, append-only-principen behålls.

## Tekniska detaljer

- Två nya Drizzle-migrationer (leads-grant, ref_has_role-grant) — båda additiva, ingen dataändring, inga drops.
- Kodändringar begränsade till: `supabase/functions/save-email/index.ts`, `src/components/Survey.tsx`, `src/components/survey/InlineTerminalSurvey.tsx`, `src/routes/api/public/trust/attest.$token.ts`, `src/lib/trust/share.server.ts`, ev. `src/security/rpcGrants.test.ts`.
- Verifiering: test-insert som anon, test av attest-länk med simulerat fel, befintliga säkerhetstester, typecheck + build.
- Det femte fyndet (CV-assistentens "fact guard" kan radera riktiga rader med ord som "okänd") ingår inte här — det är en produktlogikfråga, inte säkerhet. Kan tas separat om du vill.

## Gör INTE

- Ingen UI-ändring, inga nya tabeller, ingen ändring av RLS-policyernas logik, ingen publicering.
