

# Radar-uppgradering: Plan

## Sammanfattning
Uppgradera Uppdragsradar till en personaliserad, skalbar modul med verksamhetssök, nytt sannolikhetssystem (spåkulor), fungerande bevakningar med notiser, infinite scroll, och rollnormalisering — allt drivet av användarens profil.

---

## 1. Personaliserad standardvy

**Vad:** Radar visar automatiskt prognoser för besökarens kompetens (från löneanalys/konto).

**Hur:**
- I `Radar.tsx`: läs `consultant_profiles` eller senaste `reports` via `useAuth` för att hämta användarens yrke
- Sätt `filters.competence` som default till användarens yrke
- Oinloggade: visa tomt filter (som idag)

---

## 2. Verksamhetssök

**Vad:** Sökfält för att hitta en specifik verksamhet (köpare) och se dess historiska uppdrag.

**Hur:**
- Byt ut `FilterPill` för "Beställare" till en sökbar input (autocomplete) i `RadarFilters.tsx`
- Backend returnerar redan `filters.buyers` — använda den listan för autocomplete
- Vid val: filtrera prognoser på den köparen

---

## 3. Ta bort 1000-radsgräns (infinite scroll)

**Vad:** Edge-funktionen `radar-predictions` hämtar all data utan trunkering.

**Hur:**
- Backend: byt alla tre queries till paginerade loopar som hämtar 1000 rader åt gången tills alla rader är hämtade (eller använd `.range()` med offset)
- Frontend: implementera infinite scroll i prognoslistan — ladda t.ex. 20 kort åt gången, hämta fler vid scroll
- Alternativt: all aggregering sker backend, returnera bara predictions (inte rader) — dessa blir sällan >500

---

## 4. Nytt sannolikhetssystem: Spåkulor (1–3)

**Vad:** Ersätt high/medium/watch med 1–3 spåkulor baserat på tydliga regler.

**Regler:**
- **1 spåkula:** Minst 1 års historik med liknande uppdrag
- **2 spåkulor:** Mönstret har återkommit minst 1 gång (≥2 datapunkter med liknande period)
- **3 spåkulor:** ≥2 återkommande behov + aktivitet senaste 3 månaderna

**Säsongssignal:** Om en verksamhet avropade under en specifik period föregående år → visa att liknande uppdrag sannolikt dyker upp samma period i år.

**Hur:**
- Uppdatera `radar-predictions` edge function: ny logik för `probability_level: 1 | 2 | 3`
- Uppdatera `Prediction`-typen och `PredictionCard`/`PredictionDetail` med spåkule-ikoner istället för färgade prickar
- Lägg till säsongstext: "Avrop samma period föregående år — sannolikt återkommande"

---

## 5. Bevakningar med notiser (3/2/1 månad)

**Vad:** "Bevaka uppdrag" sparar till databas och skickar påminnelser 3, 2 och 1 månad före förväntat avrop.

**Hur:**
- **Ny tabell `radar_watchlist`:**
  ```
  id, user_id, competence, location, buyer, predicted_date, created_at
  ```
  RLS: användare kan CRUD egna rader.

- **Ny tabell `radar_notifications`:**
  ```
  id, watchlist_id, months_before (3/2/1), scheduled_for, sent_at, status
  ```

- **Backend:** Vid insert i watchlist → skapa 3 notification-rader (3/2/1 mån före predicted_date)
- **Cron-jobb (edge function):** Daglig kontroll — skicka e-post via Resend för notifications där `scheduled_for <= now()` och `sent_at IS NULL`
- **Frontend:** Koppla "Bevaka"-knappar till insert, visa aktiva bevakningar på `/bevakningar`-sidan

---

## 6. Rollnormalisering

**Vad:** Säkerställ att rollnamn från alla källor mappas korrekt.

**Hur:** Utöka `ROLE_NORMALIZE`-mappen i `radar-predictions` med alla kända varianter från importdata. Kör samma normalisering i `uppdragsradar-chat`.

---

## 7. Reijdar-chatt: uppdragsfrågor

**Vad:** Reijdar ska kunna svara på "när kom senaste uppdraget" och "när förväntas nästa" per verksamhet.

**Hur:**
- Uppdatera `uppdragsradar-chat` edge function:
  - Ta bort `.limit(500)` — använd paginerad fetch
  - Inkludera per-köpare-statistik (inte bara per region) i systemprompten
  - Lägg till prognos-datum per köpare/kompetens-kombination
- Uppdatera systemprompt med instruktioner att svara på verksamhetsspecifika frågor

---

## 8. requests som bas (behåll)

`requests` behålls som primärtabell med `calloff_imports` och `calloff_history` som komplement. Ingen ny bastabell behövs — nuvarande arkitektur fungerar för stora importvolymer.

---

## Tekniska detaljer

| Komponent | Ändring |
|---|---|
| `radar-predictions/index.ts` | Paginerad fetch, ny spåkule-logik, säsongsanalys |
| `uppdragsradar-chat/index.ts` | Paginerad fetch, köparstatistik i prompt |
| `Radar.tsx` | Default-kompetens från profil, infinite scroll |
| `RadarFilters.tsx` | Sökbar autocomplete för verksamheter |
| `PredictionCard.tsx` | Spåkule-ikoner (1–3) istället för färgprickar |
| `PredictionDetail.tsx` | Säsongsinfo, spåkulor, kopplad bevakningsknapp |
| `radarMockData.ts` | Uppdatera `Prediction`-typ: `probability: 1|2|3` |
| DB-migration | `radar_watchlist` + `radar_notifications` tabeller |
| Ny edge function | `radar-notify` (cron) för e-postpåminnelser |
| `config.toml` | Lägg till nya funktioner |

**Ordning:** 1 → 4 → 3 → 2 → 5 → 6 → 7 (varje steg kan deployas separat)

