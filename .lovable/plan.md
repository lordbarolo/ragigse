

## Import av avrop från Region Gävleborg till calloff_imports

### Sammanfattning
Importera ~3 900 rader från CSV-filen till `calloff_imports`-tabellen. Varje rad parsas för att extrahera enhet, veckoperiod och roll ur "Avrop"-kolumnen. Dubletter (samma enhet + roll + period) slås ihop till ett enda behov.

### Datakällans struktur
- Semikolon-separerad CSV, 3 918 rader
- Kolumner: `Avrop` (fritext med ID, roll, enhet, ort, veckor), `Yrkeskategori` (standardiserad roll), `Antal timmar`, `Antal Kontrakterade`, `Antal presentationer Avvisade`
- Alla avrop tillhör **Region Gävleborg**

### Parsningslogik för "Avrop"-kolumnen

Extrahera:
1. **Avrop-ID** — siffror i början av strängen
2. **Enhet** — text mellan rollbeskrivning och veckonummer (t.ex. "Strokeavdelning, Gävle", "Medicinavdelning 7 Hudiksvall")
3. **Veckoperiod** — mönster som `v.13-17`, `V3, V4, V7`, `v 8-12` → omvandla till start-/slutvecka → beräkna `calloff_date` (måndagen i startveckan) och `duration_weeks`
4. **År** — 2025 eller 2026 beroende på vad som står i strängen

### Rollmappning
Kolumnen `Yrkeskategori` mappas till radarns rollnamn:
- "Legitimerad sjuksköterska" → "Sjuksköterska"
- "Specialistutbildad läkare (nationella)" → "Specialistläkare"
- "Specialistutbildad läkare: Radiologi" → "Specialistläkare"
- "Specialistutbildad sjuksköterska" → "Specialistsjuksköterska"
- "Specialistutbildad sjuksköterska: Distrikt" → "Distriktssjuksköterska"
- "Specialistutbildad sjuksköterska: Intensivvård" → "Intensivvårdssjuksköterska"
- "Specialistutbildad sjuksköterska: Anestesi" → "Anestesisjuksköterska"
- "Legitimerad läkare och ST-läkare (Nationella)" → "ST-läkare"
- Övriga behåller sitt namn

### Deduplicering
Innan insert: gruppera per **enhet + roll + överlappande veckoperiod**. Om t.ex. 6 rader alla avser "Medicinavdelning 7 Hudiksvall, Sjuksköterska, v.18-23 2025" (bara olika schema-nummer), slås de ihop till **en rad** med summerad `duration_weeks` och `filled = true` om minst en rad har kontrakterade > 0.

### Insert i calloff_imports
Fält som sätts:
- `source`: `'gavleborg-avrop-2025'`
- `calloff_date`: måndagen i startveckan
- `region`: `'Gävleborg'`
- `customer`: `'Region Gävleborg'`
- `customer_type`: `'Region'`
- `role`: mappad roll
- `unit`: extraherad enhet
- `filled`: `true` om `Antal Kontrakterade > 0`
- `duration_weeks`: antal veckor i perioden
- `raw_data`: JSON med originalrad

### Teknisk implementation
1. Python-script som läser CSV, parsar, deduplicerar, genererar INSERT-satser
2. Kör via `psql` mot databasen
3. Verifierar antal importerade rader

### Förväntade utfall
- ~500-800 unika behov (efter deduplicering av ~3 900 rader)
- Dessa syns direkt i Uppdragsradar via `radar-predictions`-funktionen

