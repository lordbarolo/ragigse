## Mål

Bygga den valda v3-riktningen (Terminal Glass Flow) som riktig komponent i appen. Frågorna ska ligga inline på startsidan — användaren förs aldrig bort. Besvarade frågor blir små klickbara chips ovanför aktiv fråga.

## Scope (vad som ändras)

1. **Ny komponent**: `src/components/survey/InlineTerminalSurvey.tsx`
   - Visuell terminal-glassmorphism (mörk bakgrund #0D001A, violetta/cyan accenter, JetBrains Mono för prompts, Inter för svar).
   - "Window header" med traffic-light-prickar och statustext (`compcare://salary-check`).
   - Mono-prompt per fråga (`$ select_employment_type`), blinkande cursor, "Waiting for user input...".
   - Chip-rad ovanför aktiv fråga: `Yrke: Sjuksköterska ✏️`, `Kommun: Stockholm ✏️` etc. Klick → hoppa tillbaka till den frågan.
   - Stegfooter: `STEG 3 / 5 — ANONYMT • KOSTNADSFRITT • KLART PÅ 60 SEKUNDER`.

2. **Återanvänd befintlig logik** från `src/components/Survey.tsx`:
   - Samma 5 steg, samma `SurveyData`-form, samma `usePricingEngine`, samma `aliasLead`/`leads`-insert/`create-report`-flöde, samma PostHog-events (`survey_mounted`, `survey_step_viewed/completed`, `survey_completed`).
   - Samma rollistor (`doctorRoleOptions`, `nurseRoleOptions`), `top_kommuner`, `nurseValueMap`, `resolvedYrke`-derivering.
   - Inga ändringar i edge functions, DB-tabeller, RLS eller analytics-pipeline.

3. **Inline-placering på startsidan** (`src/pages/Index.tsx`):
   - Ersätt nuvarande `<HeroRateLookup />` i hero med `<InlineTerminalSurvey />`.
   - Hero-rubrik och brödtext bibehålls ovanför så användaren ser utgångspunkten.
   - När alla 5 steg är klara → samma navigation som idag (`navigate('/resultat/:leadId')`).
   - Tre pelar-sektionen, trust-sektionen och footern lämnas orörda.

4. **SalaryCheck-route** (`/consultant/salary-check`):
   - Behålls oförändrad som fallback/djuplänk (`?start=1`, `?yrke=…` prefill). Survey.tsx rörs ej — vi bygger en ny komponent vid sidan av.

## Designdetaljer (från v3-prototypen)

- Bakgrund: `bg-[#0D001A]` med radial violet glow top + cyan glow bottom.
- Terminal-kort: `rounded-2xl border border-white/10 bg-white/[0.03] backdrop-blur-xl`.
- Header: tre färgprickar (`#ff5f57 #febc2e #28c840`) + monospace path.
- Frågetext: `font-mono text-cyan-300 text-sm` prompt, `font-sans text-white text-2xl font-semibold` fråga.
- Svarsknappar: kompakt (`text-sm font-semibold px-6 py-3` enligt button-standarden), violett hover-glow.
- Chips: `inline-flex bg-white/5 border border-white/10 rounded-full px-3 py-1 text-xs text-white/70 hover:bg-violet-500/20`.
- Blinkande cursor: rent CSS `animate-pulse` på `▋`.

## Mobil

- Vertikal stack, chips wrappar.
- Navigation (Tillbaka/Nästa) sticky längst ner med samma `visualViewport`-keyboard-offset-logik som befintlig Survey.

## Vad som INTE ändras

- Survey.tsx, SalaryCheck.tsx, edge functions, leads-tabellen, pricing-engine, teaser/resultat-flödet, PostHog-events, naming/copy-konventioner.
- Inga nya beroenden.

## Tekniska detaljer

```text
src/
├─ components/
│  ├─ survey/
│  │  └─ InlineTerminalSurvey.tsx   ← NY (återanvänder logik från Survey.tsx)
│  └─ Survey.tsx                    ← oförändrad
└─ pages/
   └─ Index.tsx                     ← byter ut <HeroRateLookup/> mot <InlineTerminalSurvey/>
```

Logiken lyfts ut till en delad hook `useSurveyController` (samma fil) som båda komponenterna kan dela senare — i detta steg kopieras den dock som ren funktion till den nya komponenten för att inte röra Survey.tsx.

## Acceptanskriterier

- Startsidan visar terminal-survey direkt i hero, ingen navigation mellan frågorna.
- Chips för besvarade frågor — klick återgår till det steget med svaret förifyllt.
- Steg 5 → samma `/resultat/:leadId` som idag.
- PostHog-funneln (`survey_started → survey_step_viewed/completed → survey_completed`) oförändrad.
- Mobil: sticky nav-bar respekterar tangentbordet.
- Inga ändringar i `Survey.tsx` eller backend.
