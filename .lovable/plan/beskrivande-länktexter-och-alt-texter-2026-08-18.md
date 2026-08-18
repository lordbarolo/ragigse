# Beskrivande länktexter och alt-texter

Ren tillgänglighets-/SEO-städning av text. Ingen layout, styling eller logik ändras.

## Notering om ServiceCarousel

`ServiceCarousel` finns bara kvar i `src/_archive/components/demo/` och renderas inte
någonstans i den levande appen. Den lämnas orörd (arkivet är fryst). De faktiskt
generiska texterna sitter i stället i komponenterna nedan.

## Vad som ändras

### 1. Alt-texter på logotyper

Idag är alt-texten bara `"vårdbemanning.ai"` på fyra ställen, och `CompcareLogo`
sätter både `role="img" aria-label=...` på wrappern och `alt=...` på bilden, vilket
gör att skärmläsare läser upp namnet två gånger.

- `src/components/CompcareLogo.tsx` — behåll en beskrivande alt-text på `<img>`
  (`"vårdbemanning.ai – ramavtalspriser för vårdkonsulter"`) och ta bort den
  dubblerande `role="img"`/`aria-label` på wrapper-spannen.
- `src/pages/Startsida.tsx`, `src/components/startsida5c/Footer5c.tsx`,
  `src/pages/PrivacyPolicy.tsx` — samma beskrivande alt-text i stället för
  `"vårdbemanning.ai"`. Där logotypen ligger inuti en länk till startsidan blir
  alt-texten länkens tillgängliga namn, så den formuleras som destination:
  `"vårdbemanning.ai – till startsidan"`.

### 2. Alt-text på redaktionellt foto

- `src/components/startsida5c/FotoBand.tsx` — `"Sjuksköterska i vårdmiljö"` blir
  beskrivande om vad bilden faktiskt visar i sitt sammanhang.

### 3. Generiska länktexter

- `src/components/CookieBanner.tsx` — `"Läs mer"` → `"Läs mer i integritetspolicyn"`.
- `src/components/profile/CvStatusCard.tsx` — `"Öppna"` → `"Öppna CV-arbetsytan"`.
- `src/components/profile/CvHistoryList.tsx` — `"Öppna"` i listan över versioner får
  ett `aria-label` som namnger vilken version raden gäller, så att flera identiska
  "Öppna" inte längre är omöjliga att skilja på i en länklista.
- `src/pages/Faktasidor.tsx` — `/llms.txt` och `/openapi.json` som länktext får
  beskrivande komplement via `aria-label` (den synliga sökvägen i texten behålls,
  eftersom den är avsiktlig för utvecklare).

### 4. Icon-only kontroll

- `src/components/SearchableSelect.tsx` — `aria-label` `"Öppna"`/`"Stäng"` på
  chevron-knappen kompletteras med vad som öppnas (fältets label), så att kontrollen
  är entydig när det finns flera väljare på samma sida.

## Verifiering

Bygg/typkontroll, samt en genomsökning som bekräftar att inga `alt=""`-lösa bilder
eller kvarvarande ensamma `"Läs mer"`/`"Öppna"`-länkar finns i levande kod.
