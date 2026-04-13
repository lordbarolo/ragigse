

## Fakturakontroll — Komplett byggspecifikation

### Koncept

Användaren laddar upp faktura + tidrapport, anger sina avtalade priser, och kan valfritt mata in tidrapportsdata manuellt om tidrapporten är handskriven. Gemini 2.5 Pro extraherar data via structured output med dual-pass. Användaren ser en sammanfattning och bekräftar. En deterministisk regelmotor kör analysen.

### Flöde

```text
┌─ STEG 1 — Formulär ─────────────────────────────────────────┐
│  • Ladda upp: Faktura (PDF) + Tidrapport (PDF)               │
│  • Ange: Yrkeskategori, Grundpris SEK/h, Telefon             │
│  • Checkbox: "Är din tidrapport handskriven?"                 │
│    → Om ja: expanderar manuellt inmatningsformulär            │
│      (datum, start, slut, rast — lägg till rader)             │
│      Texten: "Våra assistenter klarar oftast av att läsa      │
│       även handskrivna rapporter men om du vill vara säker    │
│       på att det blir rätt får du gärna hjälpa oss genom      │
│       att ange datum, arbetstid och antal timmar här."         │
│  • Skicka in                                                  │
└──────────────────┬───────────────────────────────────────────┘
                   ▼
┌─ STEG 2 — Extraktion (backend) ─────────────────────────────┐
│  Om manuell data finns → hoppa över tidrapport-extraktion     │
│  Annars:                                                      │
│    Faktura PDF → Gemini 2.5 Pro (tool calling, pass 1+2)      │
│    Tidrapport PDF → Gemini 2.5 Pro (tool calling, pass 1+2)   │
│    Jämför pass 1 & 2 → confidence per rad                     │
│  Sparar rådata i databasen                                    │
└──────────────────┬───────────────────────────────────────────┘
                   ▼
┌─ STEG 3 — Sammanfattning (UI) ──────────────────────────────┐
│  "Vi hittade 14 pass, 112 timmar, varav 3 nattpass"           │
│  Om 100% konsensus → en knapp: "Bekräfta"                    │
│  Om avvikelser → visa bara osäkra rader för korrigering       │
│  "Visa detaljer" → expanderar full tabell                     │
│  Bekräfta → triggar regelmotor                                │
└──────────────────┬───────────────────────────────────────────┘
                   ▼
┌─ STEG 4 — Analys (backend, deterministisk) ─────────────────┐
│  Regelmotor: bekräftad tidrapport + faktura + användarpriser   │
│  Flaggar A1–A4, sparar resultat, mejlar admin                 │
│  Ingen AI, $0.00                                              │
└──────────────────┬───────────────────────────────────────────┘
                   ▼
┌─ STEG 5 — Bekräftelse ──────────────────────────────────────┐
│  "Tack! Vi återkommer inom 48 timmar."                        │
└──────────────────────────────────────────────────────────────┘
```

### Kostnad per analys

| Scenario | Kostnad |
|----------|---------|
| Manuell tidrapport (handskriven) | ~$0.03 (bara faktura-extraktion) |
| Digital tidrapport, full konsensus | ~$0.10–0.20 |
| Digital, dual-pass med avvikelser | ~$0.15–0.25 |

### Tekniska ändringar

#### 1. Databasmigrering (`invoice_reviews`)

Nya kolumner:
- `grundpris` numeric — konsultens grundpris SEK/h
- `yrkeskategori` text — dropdown-val
- `user_rates` jsonb — OB/jour-faktorer (för läkare)
- `is_handwritten` boolean default false
- `manual_tidrapport` jsonb — manuellt inmatade rader (om handskriven)
- `extracted_faktura` jsonb — rå Gemini-extraktion faktura
- `extracted_tidrapport` jsonb — rå Gemini-extraktion tidrapport
- `extraction_confidence` jsonb — confidence per rad (från dual-pass)
- `extraction_model` text — vilken modell som användes
- `confirmed_tidrapport` jsonb — slutgiltig bekräftad data
- `confirmed_at` timestamptz

Behåll `kontrakt_path`/`kontrakt_data` för bakåtkompatibilitet men använd ej.

#### 2. Ny edge function: `invoice-extract`

- Laddar ner PDF:er från storage
- Kör Gemini 2.5 Pro via Lovable AI Gateway med **tool calling** (structured output)
- **Dual-pass**: kör extraktion två gånger med lätt olika prompter, jämför rad för rad
- Faktura och tidrapport extraheras parallellt
- Om `manual_tidrapport` finns → skippar tidrapport-extraktion, använder manuell data direkt
- Few-shot examples: 2–3 exempelextraktioner i prompten
- Sparar `extracted_faktura`, `extracted_tidrapport`, `extraction_confidence` i databasen
- Returnerar data + confidence till klienten

#### 3. Förenklad `invoice-analyzer`

- Tar bort all PDF-läsning och Claude-anrop
- Läser `confirmed_tidrapport` + `extracted_faktura` + `grundpris` + `user_rates` från DB
- Kör enbart deterministisk regelmotor (A1–A4 flaggor)
- OB-beräkning med 1.3142-multiplikator för sjuksköterskor
- Mejlar admin vid avvikelser

#### 4. UI: `FakturakontrollNy.tsx` — 5 steg

**Steg 1 — Upload + priser:**
- 2 filslots: Faktura + Tidrapport (kontrakt borttaget)
- Dropdown: Yrkeskategori
- Input: Grundpris (SEK/h)
- Telefon
- Checkbox: "Är din tidrapport handskriven?"
  - Om ja: expanderbart formulär med rader (datum, start, slut, rast, typ)
  - Knapp "Lägg till rad" för fler pass
  - Informativ text som förklarar att AI oftast klarar det men manuell inmatning garanterar precision

**Steg 2 — Extraktion pågår:**
- Laddningsanimation

**Steg 3 — Sammanfattning + bekräftelse:**
- Sammanfattningsvy: antal pass, totala timmar, nattpass, OB-timmar
- Vid 100% konsensus: enkel "Bekräfta"-knapp
- Vid avvikelser: bara osäkra rader visas för korrigering
- "Visa detaljer" expanderar full tabell
- Om manuell inmatning gjordes: visa sammanfattning av det inskickade direkt

**Steg 4 — Analys pågår (kort):**
- Regelmotor körs

**Steg 5 — Tack-sida:**
- Bekräftelsemeddelande, "Vi återkommer inom 48 timmar"

#### 5. Filer som skapas/ändras

| Fil | Åtgärd |
|-----|--------|
| `supabase/migrations/xxx.sql` | Nya kolumner på invoice_reviews |
| `supabase/functions/invoice-extract/index.ts` | Ny — Gemini dual-pass extraktion |
| `supabase/functions/invoice-analyzer/index.ts` | Förenklad — bara regelmotor |
| `src/pages/consultant/FakturakontrollNy.tsx` | Nytt 5-stegs UI med manuell inmatning |

