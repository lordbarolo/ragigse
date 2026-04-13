

## Plan: Förenkla FakturakontrollNy till två steg

### Nuläge
Sidan har tre steg: Uppladdning → Analyserar (polling) → Rapport (avvikelser visas).

### Ändring
Reducera till **två steg**: Uppladdning → Bekräftelse.

**`src/pages/consultant/FakturakontrollNy.tsx`:**
- Ta bort steg 2 (spinner/polling) och steg 3 (resultatvisning) helt
- Efter lyckad uppladdning + skapande av review-posten, visa direkt bekräftelsemeddelandet: "Tack! Vi har tagit emot och analyserar dina dokument. Compcare återkommer till dig inom 48 timmar."
- Ta bort polling-logiken (`useEffect` som kollar status)
- Ta bort `ReviewResult`-typen, `result`-state och `Avvikelse`-interfacet
- Behåll triggningen av `invoice-analyzer` edge-funktionen (den körs i bakgrunden, resultatet sparas i databasen för admin)
- Uppdatera stegindikatorn till två steg: "Ladda upp" → "Bekräftelse"
- Vid upload-fel visas fortfarande ett felmeddelande med "Försök igen"-knapp

### Vad som inte ändras
- Edge-funktionen `invoice-analyzer` — körs som vanligt
- E-postavisering till admin — skickas som vanligt
- Databas-lagring av avvikelser — sparas för manuell granskning

