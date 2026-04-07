

## Plan: Redesign landningssidan — från mörkt till ljust, sakligt tema

### Vad som ändras

Hela hjältesektionen byter från mörk bakgrund (`hero-dark`) till en ljus, ren yta. Språket justeras för att vara mer sakligt och professionellt. En "progressive disclosure"-ruta med live-data-smakprov läggs till. Förtroendesignaler förtydligas.

### Ändringar i `src/pages/consultant/SalaryCheck.tsx`

**1. Hjältesektion — visuell omvandling**
- Ta bort `hero-dark`-klassen och gradient-overlayen
- Byt till `bg-background` (ljusgrå) med mörkgrå/mörkblå text
- Ta bort badge-raden "100% Verifierad Marknadsdata" (för reklamig)

**2. Ny text**
- **Rubrik**: "Äg ditt marknadsvärde som vårdkonsult"
- **Underrubrik**: "Få tillgång till verifierade siffror från 20 000 offentliga upphandlingar. Vi gör dold lönestatistik tillgänglig för dig."
- **Knapptext**: "Se aktuell lönestatistik"
- **Källtext under knappen**: "Baserat på offentlig data från Sveriges regioner. Ingen registrering krävs."

**3. Progressive disclosure — smakprov på data**
- Lägg till en kompakt kort/ruta under CTA-knappen som visar ett exempelarvode:
  - "Genomsnittligt timarvode, hyrsjuksköterska, Region Skåne: 770 kr/h"
  - Statisk text initialt (kan kopplas till live-data senare)
- Syfte: bevisa att datan finns innan användaren gör något

**4. Förtroendesektion under hero**
- En diskret rad med tre ikoner + texter:
  - "Ingen registrering krävs för prisförslag"
  - "Offentlig data från 21 regioner"
  - "20 000+ analyserade avtal"

**5. Sektion 2 (Löneförhandling) — mindre justeringar**
- Behåll strukturen men uppdatera badge-texten och rätta stavfel ("fön" → "för")
- Uppdatera CTA-knapptext till något kortare: "Se villkor för din roll och ort"

### Ändringar i `src/index.css`

- Ändra `--hero-bg` till samma som `--background` (ljusgrå) och `--hero-fg` till `--foreground` (mörk) — så att `hero-dark`-klassen ger ljus bakgrund istället för mörk
- Alternativt ta bort beroendet av `hero-dark` helt i denna komponent

### Filer som påverkas
- `src/pages/consultant/SalaryCheck.tsx` — huvudsakliga ändringar
- `src/index.css` — justering av hero-variabler (valfritt)

### Vad som INTE ändras
- Navigeringen/headern (redan ljus och bra)
- Survey-flödet
- Övriga sidor och komponenter
- Regionlogotyper (kräver bildtillgångar som inte finns i projektet idag)

