

## Granskning — vad som faktiskt gäller i Lovable-koden

Granskningen från Claude utgår från lokala prototyper (`template/`, `compcare-themes.jsx`, `compcare-report.jsx`) som inte är produktionskod. Innan jag presenterar en åtgärdsplan vill jag verifiera vad som faktiskt är implementerat i Lovable. Här är min snabba motgranskning baserat på den faktiska kodbasen:

### Punkt-för-punkt verifiering

**1. Säkerhet — service_role-nyckeln**
Detta är reellt. Roteringen måste ske i Supabase Dashboard manuellt — ingen kod jag kan röra åtgärdar detta. Filerna (`import_supabase.py`, `bemlo.py`) finns inte i Lovable-projektet, så det är ett OneDrive/lokalt problem. **Åtgärd: användaren roterar nyckeln själv.**

**3. Löneassistenten — "alla prisdata hårdkodade"**
Felaktigt om Lovable. Verifierat:
- `useBenchmarkEngine.ts`, `usePricingEngine.ts`, `useCalculator.ts` finns
- Edge functions: `compensation-intelligence`, `pricing-engine`, `salary-benchmark-engine`, `create-report`, `get-report`
- CI v3.1.0 (per memory `arch/compensation-intelligence-v2`) använder `n>=10` hierarkisk sökning med `below_threshold` fallback
- Survey → `create-report` → rapport är ett verifierat backend-flöde (memory `tech/lead-capture-funnel-architecture`)

**Email i Teaser** — `save-email` edge function finns, `EmailGate.tsx` anropar `leadService.saveEmail` → backend. Fungerar.

**CTA-knappar** — Förhandling (`/forhandla` med `useNegotiationChat`), fakturagranskning (`/consultant/fakturakontroll`, `invoice-analyzer`, `invoice-extract`), PDF (`generate-pdf`). Allt finns.

**4. Uppdragsassistenten — "ingen kod finns"**
Felaktigt. Verifierat:
- `src/components/radar/ReijdarChat.tsx` (chat-UI)
- `supabase/functions/uppdragsradar-chat/index.ts` (AI-backend)
- `radar-predictions`, `get-avrop-predictions`, `radar-notify`
- Memory `data/radar-insights` bekräftar 5 AI-insikter på `calloff_imports`

Behöver verifiera: rollkategori-fallback-logik och `n_offers = 0`-hantering i `uppdragsradar-chat`.

**6. requests-tabellen — index och datamodell**
Memory `data/requests-source-sync` säger att källan är `calloff_imports` (inte `requests`). Behöver kontrollera vilken tabell som faktiskt frågas i edge functions och om index finns. Detta kan jag åtgärda via migration.

**5. Komponentduplikat / inline styles**
Gäller bara `template/`-prototyperna, inte Lovable-koden. Lovable använder shadcn/ui + Tailwind + design tokens i `index.css`. Inte ett reellt problem.

### Vad som är värt att faktiskt åtgärda i Lovable

```
Reella saker att fixa             Källa
─────────────────────────────────────────────────────
A. Rotera service_role-nyckel     Manuell — användaren själv
B. Verifiera index på radar-      Migration om saknas
   datakällan (calloff_imports)
C. Verifiera fallback i           Läsa + ev. patcha
   uppdragsradar-chat             edge function
D. Verifiera n_offers=0-filter    Läsa edge function
   i radar-statistik
```

### Föreslagen plan (default mode)

**Steg 1 — Verifiera (read-only, ingen påverkan)**
- Läs `supabase/functions/uppdragsradar-chat/index.ts` och `radar-predictions/index.ts` för att bekräfta:
  - Rollkategori-fallback finns (Psykiatri/Anestesi → Läkare etc.)
  - `n_offers > 0` filter används vid medianberäkning
- Lista index på `calloff_imports` via Supabase linter/query

**Steg 2 — Åtgärda det som faktiskt saknas**
- Om index saknas: skapa migration med `CREATE INDEX` på `(role, region)` och `created_at` på `calloff_imports`
- Om fallback saknas i `uppdragsradar-chat`: lägg till rollkategori-mappning + tydlig UI-kommunikation ("visar bredare kategori X eftersom data saknas för Y")
- Om `n_offers = 0` inkluderas i median: filtrera bort eller exkludera explicit

**Steg 3 — Säkerhetspåminnelse till användaren (chat, ingen kod)**
- Rotera service_role-nyckel i Supabase Dashboard nu
- Ta bort hårdkodade nycklar från lokala Python-skript, använd `.env`
- Ignorera resten av Claudes rapport — den gäller prototyperna, inte produktionskoden

### Vad jag INTE kommer att göra
- Inte röra `template/`-filerna (prototyper, ej produktion)
- Inte refaktorera "duplicerade komponenter" eller "inline styles" — gäller inte Lovable-koden
- Inte ändra rapportlogik — den är dynamisk och fungerar (verifierat via memories + filstruktur)

### Frågor innan vi kör
Vill du att jag:
1. Bara verifierar (steg 1) och rapporterar tillbaka, eller
2. Verifierar + åtgärdar direkt om något saknas (steg 1+2)?

