

# Plan: Ta bort isDev-bypass + End-to-end-verifiering

## 1. Ta bort isDev-bypass i Uppdragsradar.tsx

**Fil:** `src/pages/Uppdragsradar.tsx`

- Rad 67: Ta bort `const isDev = ...`
- Rad 70-74: Ändra auth-redirect till att alltid gälla (ta bort `!isDev`-villkoret)

Resultat: Alla miljöer kräver inloggning för att nå Uppdragsradar.

---

## 2. Verifiering av skyddade tabeller — klientskrivningar

Genomgång av alla `supabase.from(...).insert()` i klienten:

| Anrop | Tabell | RLS-skydd | Status |
|-------|--------|-----------|--------|
| Survey.tsx | `leads` | Publik INSERT (med check: true) | OK — avsiktligt öppet |
| ReportFeedback.tsx | `report_feedback` | Publik INSERT | OK — avsiktligt öppet |
| InvoiceReviewCTA.tsx | `invoice_review_leads` | Behöver kontrolleras |
| InvoiceReviewCTA.tsx | `audit_optins` | INSERT för anon+auth | OK — låst SELECT till service_role |
| Radar.tsx, PredictionDetail.tsx | `radar_watchlist` | INSERT med user_id = auth.uid() | OK |
| VerificationUpload.tsx | `ref_verifications` | INSERT med profile_id = auth.uid() | OK |
| InviteModal.tsx | `ref_references` | INSERT med individual_id = auth.uid() | OK |
| useRefProfile.ts | `ref_profiles` | Behöver kontrolleras |

`analytics_events` — redan låst till service_role INSERT (migration genomförd).

**Åtgärd:** Verifiera RLS för `invoice_review_leads` och `ref_profiles` INSERT-policies i databasen.

---

## 3. End-to-end-verifiering av track-event Edge Function

Testa via `supabase--curl_edge_functions`:

1. **Giltigt event** — skicka `landing_viewed` → förvänta 200 + `{ ok: true }`
2. **Ogiltigt event** — skicka `fake_event_name` → förvänta 400 + `{ error: "Invalid event_name" }`
3. **Rate limit** — verifiera att `rate_limit_log` loggar anrop korrekt

---

## 4. Verifiering av admin Edge Functions

Bekräfta att dessa alla använder `requireAdmin`:
- `import-contract` — redan verifierat
- `run-price-diff` — redan verifierat
- `salary-insights` — redan verifierat
- `feedback-stats` — redan verifierat

---

## 5. Övriga isDev-användningar (ingen åtgärd)

- `ErrorBoundary.tsx` — visar feldetaljer bara i dev, ingen säkerhetsrisk
- `App.tsx` — `/dev/e2e-test`-route bara i dev, acceptabelt för testning

---

## Sammanfattning av filändringar

| Fil | Ändring |
|-----|---------|
| `src/pages/Uppdragsradar.tsx` | Ta bort isDev-bypass, auth-redirect alltid aktiv |

Resten är verifiering utan kodändring (edge function-test + RLS-kontroll).

