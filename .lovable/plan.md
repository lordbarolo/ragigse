
# Lönekoll v2 — Meny → underfrågor + indexerat SKR-avtal (regions-agnostiskt)

Ersätter den fria chatten på `/forhandla` med en låst meny av förprogrammerade frågor. Topic 2 (Avtalsinnehåll) använder RAG mot indexerade SKR-chunks. Eftersom alla regioners ramavtal är identiska används chunks som generell källa — **ingen region-gate**.

---

## 1. Databasen — RAG-index för SKR-avtalet

**Migration:**
- `create extension if not exists vector`
- Tabell `lonekoll_avtal_chunks`:
  - `id`, `source_doc text` (filnamn), `section text` (t.ex. "Bilaga 4 §3.2"), `content text`, `embedding vector(3072)`, `metadata jsonb`, `created_at`.
  - RLS on, inga policies → bara `service_role` (edge functions). Ingen `anon`/`authenticated` grant.
  - HNSW-index för cosine.
- SQL-funktion `match_lonekoll_chunks(query_embedding, match_count)` (SECURITY DEFINER) → topp-N relevanta chunks.

## 2. Storage + ingestion

- Privat bucket `lonekoll_avtal` för PDF:erna.
- Edge function `lonekoll-ingest-avtal` (admin-only):
  1. Hämta varje PDF från bucket
  2. Extrahera text per sida
  3. Chunka ~1000 tecken med ~150 överlapp
  4. Embedda via Lovable AI Gateway (`google/gemini-embedding-001`)
  5. Upserta till `lonekoll_avtal_chunks`
- Trigras manuellt från admin-knapp efter uppladdning.

## 3. Edge function `lonekoll-answer`

Input: `{ topicId: 1|2|3|4, questionId: string }` — context (roll, region, anställningsform, ersättning) **läses server-side** från `consultant_profiles` + senaste `report` (inte från klient → kan inte manipuleras).

- **Topic 1 Ersättningsnivåer** → dynamiskt från `rates`-tabellen + marginalmodellen. Mest deterministiskt, ofta 0 AI-anrop.
- **Topic 2 Avtalsinnehåll** → embedda frågetext, hämta topp-5 chunks, skicka till Gemini 3 Flash med strikt prompt: *"Svara endast utifrån de bifogade avtalsutdragen. Citera § / bilaga. Om svaret inte finns: säg det."*
- **Topic 3 Förhandling** → `rates` + neutrala spannobservationer (Undre/Median/Övre) + existerande argumentregler. Aldrig under nuvarande ersättning.
- **Topic 4 Företag vs anställd / AB-konsult** → statisk + dynamisk beräkning (timpris × 167 × marginal vs månadslön × 1.42).

Rate limit: befintlig 30/dag via `check_ai_rate_limit`. Loggar till `ai_usage_logs`.

## 4. Frontend — `/forhandla` (Negotiate.tsx)

Tar bort fri-text-input. Ersätter med:
- **Meny-vy** (default): 4 topic-kort med ikon + titel + kort beskrivning.
- **Underfråge-vy**: när topic vald, visar 3–4 förprogrammerade frågor som chips.
- **Svar-vy**: AI-svaret + "← Tillbaka till frågor" / "← Tillbaka till menyn".
- **Kontextbar** kvar (roll, region, anställningsform, nuvarande ersättning) — editerbar innan fråga klickas.
- **"Saknar du din fråga?"**-länk längst ned → öppnar befintlig report-dialog kategoriserad som `missing_question`.
- Tar bort `ChatInput` och `useNegotiationChat`-användning (filen kvar för bakåtkompat). Ny hook `useLonekollAnswer`.

## 5. Förprogrammerade frågor

Lagras i `src/data/lonekollQuestions.ts` (typad konstant, lätt att utöka). Utkastet jag skickade tidigare låses in:

**Topic 1 (Ersättningsnivåer):** Vad är spannet för min roll/zon? Närliggande orter med högre ersättning? Vilka kostnader sänker timpriset (resa/boende/intro/vite)? Hur jämförs min roll mot närliggande roller?

**Topic 2 (Avtalsinnehåll):** Vilket pris gäller per roll/zon? Vilka krav ställs på vendor (HOSP/CV/referenser)? Hur regleras OB/jour? Vad gäller för vitesansvar?

**Topic 3 (Förhandling):** Vilket spann är realistiskt att begära? Vilka argument stärker min position? Hur hanterar jag motbud? När bör jag tacka nej?

**Topic 4 (Företag vs anställd / AB-konsult):** Vad lönar sig — AB eller anställd? Vilket vitesansvar har jag som företagare? Vilka försäkringar behöver jag hos privat vårdgivare? Vad blir nettoskillnaden konkret?

## 6. Säkerhet

- `lonekoll_avtal_chunks`: RLS on, inga policies → service_role only.
- Edge function validerar JWT, läser context server-side.
- `LOVABLE_API_KEY` aldrig på klient.
- Säkerhets-skan körs efter migration.

## 7. Leveransordning

1. Migration (tabell + extension + match-funktion + GRANT)
2. Storage bucket
3. Edge function `lonekoll-ingest-avtal` + admin-trigger
4. Edge function `lonekoll-answer`
5. Frontend-omskrivning av `Negotiate.tsx` + komponenter + frågedata
6. Säkerhets-skan + manuell test (alla 4 topics)

---

## Frågor till dig innan jag börjar

1. **PDF:erna** — finns de 6 SKR-dokumenten kvar att skicka in, eller vill du att jag bygger admin-uppladdaren först så du laddar upp via UI?
2. **OK att köra hela steg 1–6 i en sittning?** (Det blir många filer och en migration som du behöver godkänna.)
