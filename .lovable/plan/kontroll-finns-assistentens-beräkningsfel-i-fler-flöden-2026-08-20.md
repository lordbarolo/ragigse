# Kontroll: finns assistentens beräkningsfel i fler flöden?

Jag har gått igenom kalkylatorn på startsidan och samtliga AI-flöden som rör ersättning. Här är resultatet, och vad jag föreslår att vi rättar.

## Kalkylatorn i hero (startsidan) — ingen bugg

`src/components/startsida5c/rate5c.ts` räknar deterministiskt i kod: marginalandel från den delade modellen (`getMarginShares`) och `EMPLOYER_FACTOR` för anställda. Zonen kommer från den kommun användaren väljer, inte från en gissning. Regionens pris visas, men tydligt etiketterat som "Regionens pris … Källa: …", inte som möjlig ersättning. Ingen åtgärd behövs.

## Lönekoll-svaret (`/forhandla`) — samma fel som assistenten hade

Detta är den enda andra funktionen som faktiskt är kopplad till gränssnittet, och den har båda ursprungsproblemen:

1. **Zonen gissas.** När kommunen inte kan mappas till en zon används första raden i pristabellen (`rates[0]`) — exakt samma feltyp som gjorde att Gällivare hamnade i Zon 1. Svaret ser då korrekt ut men bygger på fel zon.
2. **Inget fallback-stopp.** Saknad zon leder till ett svar med belopp i stället för en fråga om den uppgift som fattas.
3. **Råa kundpriser och marginalprocent skrivs ut** i svaret ("… kr/h kundpris", "Marginalen 10–15 %"), vilket krockar med regeln att beräkningsmodellen inte ska avslöjas.

## Övriga AI-funktioner — latenta, inte aktiva

- `ai-pricing-coach`: har samma zon-gissning (`regionRow?.zon || rates[0].zon`), skickar in råa kundpriser i prompten utan utgångsspärr, och har egna hårdkodade marginalkonstanter i stället för den delade modellen. Anropas inte från appen i dag.
- `salary-negotiation-agent`: får färdigräknade spann från compensation-intelligence (rätt princip), men prompten uppmuntrar uttryckligen att svara på kundprisfrågor. Anropas inte från appen i dag.
- `uppdragsradar-chat`, `ai-explain-insight`, `lonekoll-ingest-avtal`, fakturaflödena: ingen ersättningsberäkning eller inga råa priser till modellen. Ingen åtgärd.

## Förslag på åtgärd

Steg 1 — `lonekoll-answer` (aktiv, prioritet):
- Zonen slås upp mot `locations`/`regions` med samma delade logik som `home-assistant`. Ingen `rates[0]`-fallback.
- Saknas zon eller pris: svara med en kort fråga efter den saknade uppgiften, utan belopp.
- Ta bort råa kundpriser och marginalprocent ur svarstexten; visa endast färdigräknade spann för möjlig ersättning.
- Använd den delade marginalmodellen i stället för lokala beräkningar.

Steg 2 — `ai-pricing-coach` (latent):
- Antingen samma härdning som ovan (zonuppslag utan gissning, färdiga spann, utgångsspärr, delad marginalmodell), eller avveckla funktionen om den inte ska användas. Jag rekommenderar härdning så att den inte kan tas i bruk i trasigt skick.

Steg 3 — `salary-negotiation-agent` (latent):
- Justera prompten så att kundpriser inte redovisas, i linje med samma regel som assistenten nu följer.

Steg 4 — gemensam grund:
- Bryt ut zonuppslagning, marginalspann och utgångsspärr från `home-assistant` till en delad modul under `supabase/functions/_shared/`, så att nästa flöde ärver rätt beteende i stället för att duplicera det.

## Tekniska noter

Berörda filer: `supabase/functions/lonekoll-answer/index.ts`, `supabase/functions/ai-pricing-coach/index.ts`, `supabase/functions/salary-negotiation-agent/index.ts`, ny delad modul i `supabase/functions/_shared/`. Ingen ändring i `src/components/startsida5c/*` eller i `home-assistant` utöver att flytta befintlig logik till den delade modulen. Inga UI- eller designändringar.
