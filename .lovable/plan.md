## Mål

Bygga om `/` (LandingV2) enligt Claudes 6-sektionsstruktur, anpassad till era befintliga beslut. Konsultlön blir entry-point, övriga moduler positioneras som narrativ fortsättning.

## Sektionsplan (ersätter nuvarande LandingV2)

```text
1. Hero med inline-form     ← Specialitet + Zon dropdowns + "Visa min analys"
2. Datakredibilitet          ← 3 stat-pellets från befintliga STATS
3. Hur det fungerar (3 steg)← Visuellt: val → analys → förhandling
4. Primär produkttrappa      ← Konsultlön → Uppdragsradar → Förhandling
5. Infrastruktur (sekundär)  ← Dokhus + Ref-ID + Fakturagranskning
6. Förtroende + B2B-footer   ← BankID/GDPR + B2B-CTA-rad + footer
```

## 1. Hero — Inline-form

**Mål:** Friktionsfri entry. Besökaren förstår produkten utan att klicka in i enkäten.

- Behåll mörka gradient-bakgrunden (matchar `mem://ui/landing-v2-visuals`).
- Rubrik: "Vet du vad du är värd?" (kortare, frågedriven enligt Claude).
- Underrubrik: behåll dagens "Vi visar aktuella ersättningar för alla bemanningsuppdrag."
- **Inline-form** (white card, max-width 540px):
  - Dropdown 1: Specialitet (samma 60+ rolllista som Survey steg 2, från `mem://data/role-resolution-subspecialties-v2`)
  - Dropdown 2: Zon (Zon 1 / Zon 2 / Zon 3 — från `mem://logic/geographical-pricing-logic`)
  - Knapp: "Visa min analys →"
- **Prefill-flöde:** Knappen redirectar till `/v1?start=3&yrke=<slug>&zon=<n>` så Survey hoppar förbi steg 1 (yrkeskategori) och steg 2 (specialitet) direkt till steg 3 (kommun). Använder samma URL-prefill-mönster som `mem://logic/survey-prefill-integration`.
- Ingen registrering, ingen email-gate.

## 2. Datakredibilitet

Ersätter dagens "trust bar" med logo-walls (Capio/Aleris osv) — vi har inte officiella kund-loggar än, så det är vilseledande.

Tre tunga datasiffror i en horisontell rad mot vit bakgrund:
- **23 000+** historiska avrop (om verifierat — annars "20 000+ offentliga avtal")
- **290 kommuner + 21 regioner** täcks
- **8 års** prissättningshistorik (verifiera mot `mem://features/uppdragsradar-forecast-pipeline`)

Microcopy under: "All data från SKR:s ramavtal 2026 — ingen tredjeparts-skattning."

## 3. Hur det fungerar — 3 steg

Visuell rad med 3 kort (inte 4 som idag), matchar Claudes "Klarna/Rocker — ett beslut åt gången":
1. **Välj din roll** (illustration: dropdown)
2. **Få ditt spann** (illustration: median-stapel)
3. **Förhandla med data** (illustration: chat med agent)

Ersätter dagens fyra `STEPS` (Skapa konto / Ladda upp dokument / Få insikt / Dela). De pratar om Dokhus-flödet, inte om Konsultlön-flödet.

## 4. Primär produkttrappa — 3 kort

Header: "Från svar till resultat"

Tre kort som narrativ progression (inte feature-lista):

| # | Produkt | Tagline | Tag |
|---|---------|---------|-----|
| 1 | Konsultlön | "Vet vad du är värd" | Gratis |
| 2 | Uppdragsradar | "Hitta rätt uppdrag" | Beta |
| 3 | Förhandlingsagent | "Vinn förhandlingen" | Premium 99 kr/mån |

Pilar/dividers mellan korten visualiserar flödet (Notion-stil).

## 5. Infrastruktur (sekundär rad)

Header: "Bakomliggande infrastruktur" eller "Stöd för hela ditt yrkesliv"

Tre mindre kort (inte fullbredd som primär trappan):
- **Dokhus** — säker dokumentlagring
- **Ref-ID** — referensverifiering via länk
- **Fakturagranskning** — prestationsbaserad audit

Visuellt nedtonat (ljusare bakgrund, mindre padding) för att signalera "stöd, inte huvudspår".

## 6. Förtroende + B2B-footer

**Förtroende-block** (vit kort på `#F2F1F8`):
- BankID-logga + badge "Aktiveras inom kort"
- "GDPR-kompatibel — all data lagras inom EU"
- "Vi säljer eller delar aldrig din data till bemanningsföretag"

**B2B-CTA-rad** (egen sektion ovanför footern, dämpad bakgrund):
> Driver du ett bemanningsföretag? Läs om CompCare Insight →

Länkar till `/for-bemanningsforetag`.

**Footer:** Behåll dagens 4-kolumns-struktur inkl. "För bemanningsföretag"-kolumnen.

## Bortskalat

- ❌ Trust-logos-rad (Capio, Aleris osv) — vi har inga riktiga kunder
- ❌ Plans/PLANS-sektionen (priser-jämförelse) — flyttas till egen `/priser`-sida senare om behov
- ❌ Testimonials — vi har inga verifierade citat
- ❌ Mid-page mörka CTA-bannern "Redo att ta kontroll?" — duplicerar hero
- ❌ "Fem verktyg som förenklar din karriär"-rubriken med bullet-list — för text-tung

## Tekniska detaljer

- **Fil:** `src/pages/demo/LandingV2.tsx` (ersätter innehåll, behåll routing på `/`)
- **Ny komponent:** `src/components/landing/HeroInlineForm.tsx` — dropdowns + redirect till `/v1?start=3&yrke=&zon=`
- **Survey prefill:** Verifiera att `Survey.tsx` läser `?yrke=` och `?zon=` korrekt och hoppar till steg 3. Om inte — utöka `useSurveyPrefill`-logiken.
- **Specialitet-lista:** Importera från samma källa som Survey steg 2 (undvik duplicering).
- **Zon-mapping:** Behöver kommun-fallback eftersom zon kräver kommun. Lös genom att i hero-formuläret skicka `zon` som hint, men tvinga användaren välja kommun i steg 3 (annars blir analysen fel per `mem://logic/geographical-pricing-logic`).
- **Mobil-prio:** 375px-test enligt `mem://constraints/mobile-ux-standards`. Inline-form ska stacka vertikalt under 600px.
- **Memory-uppdatering efter BankID-integration:** Uppdatera `mem://project/bankid-policy` när live.

## Avgränsning

- Vi rör inte enkäten (`/v1`), rapporten (`/rapport`) eller andra spår i denna iteration — bara LandingV2.
- B2B-landningssidan (`/for-bemanningsforetag`) kan finnas redan; om den saknas, no-op (footer-CTA länkar dit ändå).
