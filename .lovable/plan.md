## Mål
Ersätt nuvarande logo-filer med de tre uppladdade SVG:erna och regenerera favicon + OG-bild från transparent-varianten. `CompcareLogo`-komponenten och alla användningsställen (~20 filer) lämnas orörda — bara filinnehåll byts.

## Mappning

| Ny fil | Ersätter | Variant i komponent |
|---|---|---|
| `compcare-logo-light.svg` (beige bg) | `public/compcare-logo-light.svg` + `public/compcare-logo-full-light.svg` | `full` (light mode) |
| `compcare-logo-dark.svg` (svart bg) | `public/compcare-logo-dark.svg` + `public/compcare-logo-full-dark.svg` | `full` (dark mode) |
| `compcare-logo-transparent.svg` | `public/compcare-wordmark-light.svg` + `public/compcare-wordmark-dark.svg` + `public/compcare-logo.svg` | `wordmark` (båda modes) + JSON-LD-referens |

Behålls oförändrat: `compcare-icon.svg`, `compcare-appicon.svg` (används för `variant="icon"`).

## Filer som byts ut i `public/`

1. `compcare-logo-light.svg` ← ny light
2. `compcare-logo-dark.svg` ← ny dark
3. `compcare-logo-full-light.svg` ← ny light
4. `compcare-logo-full-dark.svg` ← ny dark
5. `compcare-wordmark-light.svg` ← transparent
6. `compcare-wordmark-dark.svg` ← transparent (samma — wordmark-varianten i `CompcareLogo` används bara på ljusa bakgrunder i nuvarande kod, men växlas via `dark:`-klass; vi använder transparent för båda så texten ärver inget bg)
7. `compcare-logo.svg` ← transparent (används i JSON-LD och som fallback)
8. `compcare-logo-light.png`, `compcare-logo-dark.png` ← regenereras från nya SVG (används i mail/PrivacyPolicy)
9. `src/assets/logo.png`, `src/assets/logo-dark.png` ← regenereras (används i `PrivacyPolicy.tsx`)

## Favicon + OG (regenereras från transparent-varianten via `imagegen--edit_image`)

- `favicon.ico` (multistorlek)
- `favicon-16/32/48/96/128/192/256/512.png`
- `apple-touch-icon.png` (180×180)
- `favicon.png`
- `og-image.png` + `compcare-og.png` + `compcare-social.png` (1200×630, transparent → vit bakgrund med centrerad logo + violett accent enligt brand)

För ren ikon-favicon (utan "compcare"-texten) använder vi befintlig `compcare-icon.svg` som källa, så favicon förblir bara stapelmärket. Sociala bilder (OG) får full wordmark + ikon.

## Inga kodändringar
`CompcareLogo.tsx`, alla sidor som importerar den, samt `index.html`-referenser till favicons förblir oförändrade — sökvägarna är desamma, bara filinnehållet byts.

## Verifiering
1. Visuell kontroll: öppna `/` (light, wordmark), `/logga-in` (dark, full inverted), `/agency` (light, full), `/uppdragsradar` (wordmark).
2. Kontroll av JSON-LD: `/rapport/anestesisjukskoterska` källkod ska peka på ny `compcare-logo.svg`.
3. Favicon i webbläsarflik + ny OG-bild via OG-debugger-render.

## Risk
Låg. Inga API-, RLS-, eller backendändringar. Säkerhetsanalys (RLS/edge/PII) inte tillämplig — bara statiska assets.
