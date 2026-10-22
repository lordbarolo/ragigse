# Åtgärdsförslag: de tre fynden i "3 issues found"

Alla tre är redan åtgärdade i koden. Fynden skannades mot en äldre version och har inte stängts. De gäller fortfarande på den publicerade sidan tills du publicerar.

## 1. E-postregistrering misslyckas för återvändande besökare
- Orsak: felkoden lästes på fel ställe, så räddningen (återskapa enkätsvaret) kördes aldrig.
- Status: rättat. Felkoden läses nu där den faktiskt skickas.
- Kvar att göra: testa flödet i förhandsvisningen med ett gammalt, borttaget enkätsvar. Om det fungerar markeras fyndet som åtgärdat.

## 2. Länkar för referensbekräftelse bränns innan svaret sparats
- Orsak: länken markerades som använd redan när den öppnades.
- Status: rättat. Länken kontrolleras utan att förbrukas när den öppnas och förbrukas först när svaret är sparat.
- Kvar att göra: testa att samma länk fungerar igen om sparandet misslyckas. Därefter markeras fyndet som åtgärdat.

## 3. CV-assistenten tar bort giltiga rader
- Orsak: ord som "okänd" och "saknas" togs bort var de än stod i en rad.
- Status: rättat. Bara rena platshållare tas bort, som "Period saknas" eller "Okänt". "Utredning av feber av okänd genes" och "prioritering när resurser saknas" behålls.
- Kvar att göra: lägg till två tester med exakt de raderna och markera fyndet som åtgärdat.

## Viktigt
Fynd 1 och 3 rör appens kod. De når besökare först när du publicerar. Fynd 2 gäller också den publicerade versionen tills dess.

## Tekniskt
- Rättningar: `leadService.ts` (läser `error.context`), `attest.$token.ts` (`resolveGrant(..., false)` vid öppning och `true` efter sparat event), `cvAssistant.server.ts` (`PLACEHOLDER_SEGMENT_RE`).
- Stängning: `project_monitoring--claim_findings_for_fix` och sedan `resolve_finding` (fixed) för respektive id.
