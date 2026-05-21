## Mål
I hero-formuläret på `/` (komponent `InlineTerminalSurvey`) ska `Barnmorska` lyftas ut ur "Sjuksköterska / Barnmorska" och bli ett eget val i steg 1, jämställt med Läkare och Sjuksköterska. När användaren väljer Barnmorska hoppas rollsteget över och vi går direkt till kommun-steget.

## Scope
- Endast `src/components/survey/InlineTerminalSurvey.tsx`.
- Övriga ytor (Survey.tsx på /consultant/salary-check, MarketSearchBox, HeroRateLookup, RoleSelector, UppdragsradarV2, Campaign m.fl.) rörs INTE.

## Ändringar i `InlineTerminalSurvey.tsx`
1. **Category-typ**: utöka `Category` från `"lakare" | "ssk"` till `"lakare" | "ssk" | "barnmorska"`.
2. **Steg 1-alternativ** (rad ~318–321): byt till tre val:
   - `{ value: "lakare", label: "Läkare" }`
   - `{ value: "ssk", label: "Sjuksköterska" }` (text uppdateras — ingen "/ Barnmorska")
   - `{ value: "barnmorska", label: "Barnmorska" }`
3. **`handleCategory`**: när `barnmorska` väljs, sätt `roleValue = "__barnmorska"` och `yrke = "Barnmorska"` direkt, och hoppa från steg 1 → steg 3 (kommun) istället för steg 2.
4. **Ta bort "Barnmorska" ur nurseRoleOptions** (rad 135) eftersom det nu finns som egen kategori.
5. **`resolvedYrke`** (rad 94–110): lägg till gren `if (s.category === "barnmorska") return "Barnmorska"`.
6. **Steg 2 fallback**: om `category === "barnmorska"` ska steg 2 aldrig visas (bakåtknapp från steg 3 går också direkt till steg 1).
7. **Bakåt-navigation**: i `goBack` (om finns i `InlineTerminalSurvey`), när nuvarande steg är 3 och `category === "barnmorska"`, gå till steg 1 istället för 2.

## Vad som INTE ändras
- Backend-rollmappning (`Barnmorska` finns redan som giltig `yrkeskategori` i pricing-logiken).
- Andra survey-/sökkomponenter.
- PostHog-events (samma event-namn; bara `category`-värdet får ett tredje legalt värde).

## Acceptanskriterier
1. På `/` visar steg 1 tre val: Läkare, Sjuksköterska, Barnmorska.
2. Val av Barnmorska → kommun-steget (steg 3) öppnas direkt, `resolvedYrke = "Barnmorska"`.
3. Val av Sjuksköterska → steg 2 visar nurseRoleOptions UTAN Barnmorska.
4. Pricing-anrop sker med `yrke = "Barnmorska"` som tidigare.
5. Bakåtknapp från kommun-steget när category = barnmorska går till steg 1.
6. Inga ändringar i andra survey-komponenter.