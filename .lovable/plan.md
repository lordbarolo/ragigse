

# Plan: Uppdatera steg 5, lägg till avtalsacceptans, och kör skarpt test

## Sammanfattning

Tre ändringar: (1) uppdatera texten i steg 5, (2) lägga till en avtalscheckbox med placeholder-text som användaren måste acceptera innan inskickning, (3) uppdatera edge functions och databas för att spåra avtalet, samt genomföra ett skarpt test med de uppladdade filerna (faktura 80.pdf + HeromaRapport.pdf).

## Ändringar

### 1. Steg 5 — Uppdatera bekräftelsetext
Rad 702-706 i `FakturakontrollNy.tsx`: Byt text till:
- "Vi har tagit emot dina dokument. Din tidrapport granskas — vi återkommer vanligtvis inom 2 arbetsdagar."

### 2. Avtalsacceptans före inskickning
I steg 1, ovanför "Skicka in för granskning"-knappen:
- Ny `Checkbox` + text: "Jag godkänner Compcares avtalsvillkor" med en klickbar länk som öppnar avtalet i en dialog/modal
- Avtalsinnehållet är en placeholder: *"[Avtalstext kommer att läggas till]"*
- `canSubmit` utökas med `agreedToTerms === true`
- Tidsstämpel för godkännande sparas i `invoice_reviews`

### 3. Databasändring
Migration: Lägg till kolumner i `invoice_reviews`:
- `terms_accepted_at` (timestamptz, nullable)
- `admin_notes` (text, nullable)
- `reviewed_at` (timestamptz, nullable)

### 4. Edge function: `invoice-analyzer` — status → `pending_review`
Ändra slutstatus från `"completed"` till `"pending_review"`. Skicka admin-notis för ALLA ärenden (inte bara vid avvikelse).

### 5. Edge function: `invoice-extract` — summa-diskrepans-flaggning
Efter extraktion, beräkna summan av extraherade rader och jämför mot dokumentets `summering.total_tid`. Om diskrepans → flagga i DB.

### 6. Admin-panel: Ny sektion "Fakturagranskning"
Ny komponent `InvoiceReviews.tsx` i admin med lista över `pending_review`-ärenden. Visa detaljer, avvikelser, PDF-länk. Knappar för godkänna/avvisa + anteckningar. Ny edge function `admin-review-action` för statusändring.

### 7. Skarpt test
Kör de uppladdade filerna (faktura 80.pdf = Ing-Marie Daniels AB, läkare, grundpris 1496 kr/h + HeromaRapport.pdf = Heromatidrapport v.26-27) genom hela flödet via edge function-anrop.

## Tekniska detaljer

- Fakturan innehåller: Normaltid 76h × 1496, aktiv tid vardag/helg i flera tidsband, passiv beredskap vardag 59h + helg 37h. Total exkl moms: 241 229,50 kr
- Tidrapporten är Heroma-format (weekly_summary) med arbetstid, jour och beredskap per dag
- Yrkeskategori: Läkare (inte SSK, så OB-multiplikator ska inte tillämpas)
- Avtalsplaceholder renderas som en `Dialog` med scrollbar text

