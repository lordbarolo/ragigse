
## Mål
Automatiskt fånga när H1-rubriker spiller över på 390px (iPhone-bredd) på grund av långa svenska compound words — innan det når produktion.

## Två delar

### Del 1 — Global CSS-skyddsnät (i `src/index.css`)
Lägg till på alla H1 globalt:
```css
h1 {
  overflow-wrap: anywhere;
  word-break: break-word;
  hyphens: auto;
  -webkit-hyphens: auto;
}
html { lang: sv; } /* säkerställs i index.html för korrekt avstavning */
```
Detta gör att ord som "Förhandlingsassistent" bryts snyggt istället för att spilla över. Påverkar inte desktop visuellt eftersom orden får plats där.

### Del 2 — Automatiserat Vitest-test (`src/test/h1-overflow.test.tsx`)
En testfil som:
1. Definierar en lista publika routes att testa: `/`, `/consultant/salary-check`, `/fakturakontroll`, `/consultant/forhandla`, `/vanliga-fragor`, `/din-data`, `/referenser-info`.
2. För varje route: renderar sidan i jsdom med viewport-bredd 390px (sätter `window.innerWidth = 390` + mockar `getBoundingClientRect`).
3. Hittar alla `<h1>`-element via `document.querySelectorAll`.
4. Failar om någon H1:s `scrollWidth > clientWidth` (= overflow) eller om något enskilt ord >20 tecken saknar `overflow-wrap: anywhere`/`break-word`-arvad style.
5. Loggar route + rubriktext + ordet som spränger, så man direkt ser var problemet ligger.

## Begränsningar (transparent)
- jsdom mäter inte riktig text-rendering → testet fångar **strukturella** problem (saknade CSS-regler, för smala containers med `max-w`), inte pixel-perfekt overflow. Det är "good enough" som CI-skyddsnät; för pixel-exakt mätning krävs Playwright (separat förslag).
- Testet kör endast statiskt renderade rubriker (ej de bakom auth/lazy-load). Auth-routes hoppas över.

## Tekniska detaljer
- Filer som ändras:
  - `src/index.css` — lägg till H1-overflow-regler i `@layer base`.
  - `src/test/h1-overflow.test.tsx` — ny testfil.
  - `index.html` — säkerställ `<html lang="sv">` (för `hyphens: auto`).
- Inga nya dependencies — använder befintlig vitest+jsdom+@testing-library/react setup.
- Hero på `/` använder `clamp(42px, 8vw, 72px)` → på 390px blir det ~31px, vilket är ok. Index.tsx hero använder fast `text-5xl` (48px) → riskzon, fångas av testet om overflow uppstår.

## Vad detta INTE gör
- Ändrar inte befintliga rubriktexter.
- Lägger inte till Playwright/visuell regressionstest (kan föreslås separat).
- Rör inte H2/H3 (kan utökas senare om du vill).
