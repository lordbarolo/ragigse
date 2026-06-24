## Nulägesbild (faktiskt resultat av audit)

De fyra sidor du nämner använder redan `<SEO />`:

| Route | Komponent | Status |
|---|---|---|
| `/` (Hero) | `Home.tsx` | ✅ `<SEO …>` |
| `/vanliga-fragor` | `FAQ.tsx` | ✅ `<SEO …>` |
| `/kampanj/:role` | `Campaign.tsx` | ✅ `<SEO …>` |
| `/rapport/:reportId` | `Report.tsx` | ✅ `<SEO title={seoTitle} description={seoDesc} path={…} ogType="article" />` |

Rapportsidorna med fast slug (`/rapport/anestesisjukskoterska`, `/rapport/lakare-allmanmedicin`, `/rapport/sjukskoterska`, `/rapport/legitimerad-sjukskoterska`, `…/leg-sjukskoterska`, `…/allmansjukskoterska`, `…/leg-ssk`, `…/ssk`, `/Bollnas/lakare-alm`, `/bollnas/lakare-alm`) har också `<SEO />` med JSON-LD.

`/resultat/:leadId` använder medvetet `<Helmet>` med `noindex, nofollow` — den får inte indexeras (innehåller PII), så det är korrekt och rörs inte.

Det innebär att den **faktiska** luckan finns på auth-/utility-sidorna, inte på de sidor SEO-raden pekar ut. Scannerns träff verkar vara stale efter att Home/FAQ/Campaign/Report fick `<SEO />`.

## Sidor som faktiskt saknar per-route head

| Route | Komponent | Avsedd åtgärd |
|---|---|---|
| `/logga-in` | `Login.tsx` | `<SEO>` + `noindex` (auth) |
| `/registrera` | `Signup.tsx` | `<SEO>` + `noindex` (auth) |
| `/aterstall-losenord` | `ResetPassword.tsx` | `<SEO>` + `noindex` (auth) |
| `/unsubscribe` | `Unsubscribe.tsx` | `<SEO>` + `noindex` (utility) |
| `*` (catch-all) | `NotFound.tsx` | `<SEO>` + `noindex` (404) |

Övriga publika routes (`/integritetspolicy`, alla `/rapport/*`) har redan korrekt SEO.

## Implementation

1. **Lägg till `noindex`-stöd i `src/components/SEO.tsx`**
   - Ny optional prop `noindex?: boolean` som lägger till `<meta name="robots" content="noindex, nofollow" />` när true.
   - För `noindex`-sidor: behåll `title`/`description` (bra UX i webbläsarflikar och delningar internt) men inkludera ingen JSON-LD och inget self-canonical (alt. behåll canonical — vi behåller, eftersom canonical inte överstyr noindex).

2. **Lägg till `<SEO />` på de fem saknade sidorna** med passande svenska titlar/beskrivningar:
   - Login: "Logga in – CompCare" / kort utility-beskrivning
   - Signup: "Skapa konto – CompCare"
   - ResetPassword: "Återställ lösenord – CompCare"
   - Unsubscribe: "Avregistrera utskick – CompCare"
   - NotFound: "Sidan kunde inte hittas – CompCare"
   - Alla får `noindex`.

3. **Konsekvenskontroll**
   - Sökning efter andra publika routes som råkat slinka förbi (t.ex. ev. saknade /rapport-aliaser) — inget hittades utöver ovan.
   - `AnalysisScreen.tsx` lämnas oförändrad (redan korrekt noindex via Helmet).

4. **Verifiering**
   - Kör `seo--trigger_scan` när ändringarna är klara så att stale findings på Home/FAQ/Campaign/Report markeras passing igen, och de nya auth-/404-sidornas noindex bekräftas.
   - Markera ev. kvarvarande stale findings som `fixed` med kort förklaring.

## Teknisk anmärkning

Inget behov av ny route-konfiguration, ny dependency eller ändrad arkitektur. `react-helmet-async`-providern är redan monterad globalt (används av både `SEO.tsx` och `AnalysisScreen`). Ändringarna är additiva och berör endast 5 sidkomponenter + ett valfritt prop i `SEO.tsx`.

## Utanför scope

- Ingen ändring av `index.html` (sitewide fallback är fortfarande korrekt).
- Ingen ändring av sitemap/robots.txt.
- Inga visuella ändringar på sidorna.
- Inga ändringar på inloggade routes (`/consultant/*`, `/admin/*`) — de ligger redan bakom auth och behöver ingen public SEO.