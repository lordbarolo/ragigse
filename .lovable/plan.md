

## Plan: Fixa de 5 prioriterade konverteringsproblemen på `/demo/landing-v2`

Baserat på kritiken — de fem rekommendationerna i prioriterad ordning, inom befintlig Kivra-design.

### 1. CTA-copy (Critical)
- Byt **"Visa mig →"** → **"Beräkna min ersättning →"** i `HeroRateFinder.tsx` och i den primära CTA:n i `LandingV2.tsx`.
- Flytta trust-text "Inga kreditkort. Kom igång på 30 sekunder." direkt under knappen.

### 2. Mobil hero — surface en siffra above the fold (Critical)
- På mobil (`<md`): visa ett kompakt **"Proof Strip"** direkt under headline/subtitle, FÖRE CTA:n:
  - `482 kr/tim` (exempel-ramavtalspris) + `–12–20% byråmarginal` chip
  - Liten text: "Exempel: Läkare, Zon 1 — beräkna ditt eget nedan ↓"
- `HeroRateFinder` flyttas under proof strip på mobil men behåller full funktionalitet.
- Använder befintliga design tokens (`#F2F1F8`, `#534AB7`, Georgia headings).

### 3. Widget som primär konverteringsväg (Critical)
- Efter att resultatet visas i `HeroRateFinder`, ersätt nuvarande "Få fullständig analys"-länk med en **inline email-capture** direkt i resultatkortet:
  - Input: e-post + knapp "Få fullständig analys som PDF →"
  - Submit → använd befintlig `lead-capture-funnel-architecture` (skapa lead, routa till `/resultat/:leadId` med prefill)
  - Återanvänder `save-email` Edge Function eller direkt insert i `leads` (samma mönster som `EmailGate.tsx`)
- Den vänstra email-formen blir sekundär (eller tas bort om den dubblerar).

### 4. Stale-data + error state (Trust issue)
- I `HeroRateFinder`: när `pricing-engine` returnerar fel ELLER när användaren ändrar val:
  - **Rensa resultatkorten omedelbart** vid nytt val (sätt `result` till null innan ny fetch)
  - Vid fel: visa kort med "Data ej tillgänglig" + retry-knapp med refresh-ikon, INTE stale siffror
  - Lägg till `AlertCircle`-ikon vid felmeddelandet

### 5. Social proof + tillgänglighet
- **Social proof**: lägg till en rad under CTA: "Används av 800+ vårdkonsulter" (hardcoded för nu, kan kopplas till `leads`-count senare)
- **Kontrast/storlek**:
  - Card-labels (`RAMAVTALSPRIS · ZON 1 · SKR 2026`): höj till `text-[11px]` med `text-foreground/70`
  - Marginal-chip "–92–123 kr/tim": använd `bg-amber-500/20 text-amber-200` istället för ren orange för bättre kontrast på mörk bakgrund
  - Toggle Läkare/Sjuksköterska: säkerställ `min-h-[44px]` på mobil
- Subtitle-omskrivning: byt "personlig sekreterare"-formulering till **"Compcare ser till att du aldrig lämnar pengar på bordet."**

### Filer som påverkas
- `src/components/demo/HeroRateFinder.tsx` — CTA-copy, inline email-capture, error/stale state, kontrast
- `src/pages/demo/LandingV2.tsx` — mobil proof strip, social proof, subtitle-omskrivning, trust-text-placering, primär CTA-copy

### Tekniska detaljer
- Email-capture i widget: insert i `leads` med `yrke`, `kommun`, `employment_type` från valet → returnerar `leadId` → `navigate(`/resultat/${leadId}`)`
- Proof strip på mobil: ren statisk komponent, ingen API-call (snabb LCP)
- Mobil-QA: 390×844 (iPhone 13) — säkerställ proof strip + CTA båda above the fold
- Inga nya dependencies, inga nya tabeller, ingen design-system-förändring

### Vad som INTE ingår
- Ingen ändring av övriga sektioner på `LandingV2`
- Ingen ny route eller backend-funktion
- Ingen A/B-testning (separat sprint)

