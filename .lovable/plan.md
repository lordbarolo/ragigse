# Fix: tomt hero-formulär ska landa på fråga 1, inte fråga 3

## Problem

I `HeroInlineForm.tsx` (på `/`) submittar användaren formuläret utan att välja specialitet. Idag navigerar koden då till `/v1?start=1` — vilket öppnar enkäten direkt på det första öppna steget men **utan** yrke prefyllt. Eftersom enkäten antar att man hoppat in mitt i flödet (start=1) och saknar prefill-data, hamnar användaren på fel ställe (uppfattas som "fråga 3").

Förväntat beteende: ett tomt formulär ska skicka användaren till **fråga 1** i enkäten, dvs. yrkeskategori-valet.

## Rotorsak

I `src/components/landing/HeroInlineForm.tsx` rad 35–39:

```ts
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  if (filtered[0]) handlePick(filtered[0].slug, filtered[0].label);
  else navigate("/v1?start=1");   // ← problemet
};
```

Två separata buggar i denna fallback:

1. **Den plockar `filtered[0]` även när användaren inte skrivit något.** Om sökfältet är tomt visar `filtered` "topp 8 default-specialiteter" (för dropdown-UX). Submit utan input plockar då första default-rollen — användaren får en analys för ett yrke hen aldrig valt.
2. **`navigate("/v1?start=1")`** triggar `startSurvey = true` i `SalaryCheck.tsx` (rad 75), vilket öppnar enkäten utan prefill men ändå bortom första steget eftersom `start=1` också används av andra prefill-länkar som hoppar in djupare.

## Lösning

Ändra `handleSubmit` så att tomt sökfält:
- inte auto-plockar från default-listan
- navigerar till `/v1` **utan** `start=1`-flaggan, så enkäten öppnar sin landningsvy där användaren börjar på fråga 1 (yrkeskategori).

Ny logik:

```ts
const handleSubmit = (e: React.FormEvent) => {
  e.preventDefault();
  const hasQuery = query.trim().length > 0;
  if (hasQuery && filtered[0]) {
    handlePick(filtered[0].slug, filtered[0].label);
  } else {
    trackEvent("product_cta_clicked", { cta: "hero_inline_empty", target: "/v1" });
    navigate("/v1");
  }
};
```

## Filer som ändras

- `src/components/landing/HeroInlineForm.tsx` — bara `handleSubmit`-funktionen.

## Verifiering

1. Öppna `/`, klicka submit på hero-formuläret utan att skriva eller välja något → ska landa på fråga 1 (yrkeskategori).
2. Skriv "anestesi" och klicka submit → ska fortsatt hoppa rakt in på rätt steg med specialitet förvald (oförändrat beteende).
3. Klicka på en specialitet i dropdownen → oförändrat (rad 30–33 påverkas inte).
