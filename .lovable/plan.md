# Fix: "Tillbaka"-knappen i enkäten hoppar fel

## Problem

När en användare kommer till enkäten via en prefill-länk (t.ex. klickar på en specialitet i hero-formuläret → `/v1?start=1&yrke=anestesi`), öppnar enkäten på **fråga 3** (kommun) eftersom yrke och kategori redan är ifyllda.

Klick på "tillbaka" på fråga 3 → användaren landar på `lovable.dev/projects/...` (eller fastnar i ett konstigt limbo) istället för att gå till fråga 2.

## Rotorsak

I `src/components/Survey.tsx` rad 434–451 har `handleBack` ett specialfall:

```ts
} else if (step === 3 && initialRole) {
  onBack?.();   // ← buggen
}
```

Detta antogs "stänga enkäten och gå tillbaka till hero" om man kom in via prefill. Men:
1. `onBack` i `SalaryCheck.tsx` rad 112 är bara `() => setShowSurvey(false)`. Den ändrar inte URL:en.
2. URL:en har fortfarande `?yrke=...&start=1`, vilket gör att `showSurvey` återinitieras till `true` direkt (`useState(!!prefill || startSurvey)`).
3. Användaren upplever att "tillbaka" inte gör något — eller att navigeringen hamnar fel beroende på kontext.

Önskat beteende:
- Tillbaka från **fråga 3** → fråga 2
- Tillbaka från **fråga 2** → fråga 1
- Tillbaka från **fråga 1** → startsidan `/`

## Lösning

Ta bort specialfallet för `step === 3 && initialRole` så att fråga 3 alltid går till fråga 2 internt. Komplettera fråga 1-fallet med en explicit `navigate("/")` så att eventuella prefill-parametrar i URL:en rensas — annars renderas Survey direkt igen p.g.a. `prefill || startSurvey` i `SalaryCheck`.

Ny `handleBack`:

```ts
const handleBack = () => {
  if (step === 1) {
    // Fråga 1 → startsidan. navigate('/') rensar ev. prefill i URL
    // så att SalaryCheck inte direkt återöppnar Survey.
    onBack?.();
    navigate("/");
  } else if (step === 3) {
    setKommunSearch("");
    setSelectedRegion("");
    setData({ ...data, kommun: "" });
    setStep(2);
  } else if (step === 2) {
    setOccupationCategory("");
    setRoleDropdownValue("");
    setStep(1);
  } else if (step > 1) {
    setStep(step - 1);
  }
};
```

## Filer som ändras

- `src/components/Survey.tsx` — endast `handleBack`-funktionen (rad 434–451).

## Verifiering

1. Öppna `/`, klicka på en specialitet i hero (eller besök `/v1?start=1&yrke=anestesi`) → landar på fråga 3.
2. Klicka **Tillbaka** → ska landa på fråga 2 (yrkeskategori-val) med samma kategori (läkare/ssk) bevarad så användaren kan byta specialitet.
3. Klicka **Tillbaka** igen → ska landa på fråga 1 (yrkeskategori).
4. Klicka **Tillbaka** igen → ska landa på startsidan `/`.
5. Vanligt flöde utan prefill (klicka in via "Visa min analys" med tomt fält → fråga 1 → fråga 2 → fråga 3 → tillbaka → tillbaka → tillbaka → startsidan) ska fungera identiskt.
