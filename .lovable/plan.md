

# Plan: Rapportförbättringar — 6 prioriterade åtgärder

## 1. Höj kontrasten på "Din ersättning" (Skärm 1)

**Fil:** `src/components/report/ConsultantTrackContent.tsx` (rad 271-276)

Ändra "Din ersättning"-raden: byt `text-accent` till `text-foreground` med större font-weight så siffran sticker ut tydligt. Ge den visuell tyngd som matchar förhandlingsspannets kort.

## 2. Byt röd badge till grön på prisökning (Skärm 3)

**Fil:** `src/components/report/PriceHistory.tsx` (rad 72-76)

Procentbadgen (`+1.5%`) använder `text-accent` (grön) för ökningar — detta ser korrekt i koden. Problemet är sannolikt att `diff_abs > 0` men `change_type` eller badge-bakgrunden (`bg-destructive`) triggas fel. Kontrollerar och säkerställer att prisökningar konsekvent visas med grön/accent färg, aldrig röd/destructive.

## 3. Ersätt checkbox med explicit CTA-knapp för fakturagranskning (Skärm 5)

**Fil:** `src/components/report/InvoiceReviewCTA.tsx`

- Ta bort Checkbox + label-mönstret (rad 104-115)
- Ersätt med en full-bredd primary Button: **"Ja, granska mina fakturor kostnadsfritt →"**
- Uppdatera rubrik till: **"Hyrläkare missar i snitt 8 000–12 000 kr per månad på sina fakturor"**
- Klick → direkt submit (inget tvåstegs checkbox→knapp)

## 4. Gör "Förhandla med AI-stöd" till full-bredd primary button (Skärm 5)

**Fil:** `src/pages/Report.tsx` (rad 126-139)

- Byt `inline-flex` till `w-full flex justify-center`
- Korta copy till: **"Du vet nu vad marknaden betalar. Nästa steg: förhandla upp din ersättning."**
- Knapptext: **"Starta förhandling →"**

## 5. Skriv om sammanfattningens tredje punkt (Skärm 2)

**Fil:** `src/components/report/ConsultantTrackContent.tsx` (rad 325-356)

- Byt rubrik "Sammanfattning" → **"Vad det här betyder för dig"**
- Tredje punkten: byt förkortningslistan till **"Notera att resa, boende och kompetensintyg (t.ex. HLR, SITHS) ofta dras från ersättningen — fråga vad som ingår."**

## 6. Ta bort procentpåstående i kollegajämförelsen (Skärm 6)

**Fil:** `src/components/report/ColleagueComparison.tsx`

- Ta bort percentile-badgen helt (rad 38-46) — datan är inte tillräcklig för att vara trovärdig
- Byt CTA-text från "Dela analys" till **"Skicka till en kollega — se vem som tjänar mer"**

---

**Filer som ändras:** 5 filer, inga nya filer, ingen backend-ändring.

