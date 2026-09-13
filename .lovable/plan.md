# Uppdragsassistenten: "Jag vill jobba i Hälsingland vecka 40–44"

Målbild: en läkare skriver fritext till assistenten och får fyra svar — vilka bemanningsföretag som har avtal med regionen, vilka som historiskt är starka på just den rollen och det sjukhuset, vilken ersättning som kan faktureras om bolaget behåller 10 %, och vilka avtalsrisker som kan föras över på konsulten.

## Vad vi redan har

| Del | Status | Kommentar |
|---|---|---|
| Fritextassistent med minne | Finns | `home-assistant` svarar redan på roll/ort-frågor och sparar kontext |
| Ersättningsberäkning från kundpris | Finns | Räknemotorn kan redan ge "du kan fakturera X kr/h om bolaget behåller N %" |
| Historiska avrop | Finns | 34 647 avrop, varav 4 811 i Gävleborg, med kund, roll, specialitet, pris och datum |
| Sjukhus-/enhetsnivå | Delvis | 440 olika enheter i Gävleborg (t.ex. "Ortopeden Hudiksvall") men bara ifyllt på ca 19 % av avropen |
| Kommun → region | Finns | Alla Hälsinglands kommuner ligger korrekt på Gävleborg |

## Vad som saknas

1. **Bemanningsföretagen finns inte i datan.** Inget register över vilka bolag som har avtal med en region, och inget avropsfält som säger vilket bolag som tillsatte uppdraget. Detta är den enskilt största luckan — utan den kan varken fråga 1 eller 2 besvaras.
2. **Avtalstexterna är tomma.** Sökbasen för ramavtal finns tekniskt men innehåller noll dokument, så inga risk- eller villkorsfrågor kan besvaras idag.
3. **Veckor finns inte.** Vi har datum och antal veckor, men ingen start-/slutvecka, så "vecka 40–44" kan inte matchas mot data.
4. **"Hälsingland" är okänt.** Bara kommunnamn finns; landskapet måste läggas in som eget begrepp.
5. **10 % är inte valbart.** Marginalen är låst per roll (10–15 % för specialistläkare, 15–20 % för övriga), och assistenten är dessutom byggd för att aldrig nämna marginalen. En "räkna på 10 %"-fråga går alltså inte att ställa idag.

## Förslag till genomförande

### Steg 1 — Grundläggande begrepp (liten insats, syns direkt)
- Lägg in landskap (Hälsingland m.fl.) som sökbara begrepp som översätts till kommuner och region.
- Lägg in vecko-tolkning: "vecka 40–44" översätts till datumintervall och matchas mot avropens datum och längd.
- Låt assistenten svara på "hur ofta utannonseras min roll i Hälsingland kring vecka 40" utifrån historiska avrop, tydligt märkt som historik.

### Steg 2 — Ersättning med valfri marginal
- Öppna för att användaren anger marginalen själv (t.ex. 10 %) i sin egen förfrågan, med vår rollbaserade nivå som utgångspunkt och tydlig märkning att det är användarens antagande.
- Kräver ett beslut från dig: assistenten får idag aldrig nämna marginal i klartext. Detta steg luckrar upp den regeln i just detta läge.

### Steg 3 — Leverantörsregister (störst arbete, störst värde)
- Nytt register: bemanningsföretag, vilken region de har avtal med, avtalsperiod och källa.
- Fylls på manuellt/administrativt från regionernas egna avtalskataloger — det finns inget öppet API.
- Nytt fält på avropen för vilket bolag som tillsatte uppdraget, där den uppgiften finns i utlämnad data.
- Först då kan assistenten svara "dessa bolag har avtal med Gävleborg" och "dessa har historiskt tillsatt ortopedläkare i Hudiksvall".

### Steg 4 — Avtalsrisker
- Ladda upp faktiska ramavtal (regionens avtal med leverantör) till den sökbara avtalsbasen.
- Assistenten svarar då med citat ur avtalet om vite, ansvar, uppsägning och kontinuitetskrav, plus en neutral notering om att bolagets eget konsultavtal avgör vad som förs över på konsulten.
- Vi kan aldrig läsa konsultens eget avtal med bolaget om det inte laddas upp — svaret blir alltså "detta står i ramavtalet, kontrollera följande punkter i ditt eget avtal".

## Teknisk sammanfattning

- **Steg 1**: alias-tabell för landskap (`geography_aliases` finns redan, saknar landskapsrader); veckotolkning i `home-assistant` + datumfilter mot `calloff_imports.calloff_date` och `duration_weeks`.
- **Steg 2**: `possibleRange` i `_shared/rate-guard.ts` tar redan en marginal — lägg till en explicit `user_assumed_share`-väg och justera `leaksForbiddenData` för det fallet.
- **Steg 3**: ny tabell `framework_suppliers` (leverantör, region, avtalsperiod, källa) med RLS + GRANT, samt `calloff_imports.supplier`. Aggregering per roll/enhet/leverantör exponeras genom assistentens kontext, aldrig som rå tabell.
- **Steg 4**: kör ingest av ramavtal till `lonekoll_avtal_chunks` (pipeline finns, basen är tom) och koppla RAG-sökningen in i `home-assistant` utöver `salary-negotiation-agent`.

## Ordning och beslut

Steg 1 kan börja direkt. Steg 3 är beroende av att du kan förse oss med avtalslistor per region, och steg 4 av faktiska avtalsdokument. Steg 2 kräver ditt godkännande av att marginal får nämnas i detta läge.
