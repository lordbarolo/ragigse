# Project Memory

## Core
- **Sanningskällor**: `TERMINOLOGY.md` (namn), `README.md` (aktiv yta), `CONSOLIDATION.md` (vad som arkiverats). Läs dem före terminologi- eller scope-beslut.
- **Scope**: Projektet är löneanalys-flödet + auth + admin. Arkiverade spår ligger i `src/_archive/` — bygg inte vidare på dem utan explicit begäran.
- **Scope lock (HARD)**: Ändra aldrig något utöver det användaren explicit bett om. Ingen passa-på-refaktor, ingen städning. Rapportera avvikelser, fråga innan fix.
- **Design**: Bank-likt/lugnt. Bakgrund #F2F1F8, accent #534AB7, Inter, tight letter-spacing.
- **Buttons**: Alltid kompakta (`text-sm font-semibold px-6 py-3`). Aldrig `lg` eller `w-full`.
- **Ersättning**: ENDAST SKR-ramavtal + branschmarginal. Specialistläkare 10–15 % (konsult 85–90 %), övriga 15–20 % (konsult 80–85 %). Anställda × 1,38 / 167 h. ALDRIG SCB för konsultpriser. Basepriser, aldrig under användarens nuvarande lön.
- **Jämförelser**: Endast mot officiella regionala ramavtal. Aldrig peer/social benchmarking.
- **Neutralitet**: Inga värdeladdade ord, inget "benchmark", ingen "topp X %".
- **Security**: Backend-first. Känslig logik endast i edge functions (`requireAdmin`/service_role). Efter varje ändring: analysera RLS/auth/PII. Vid tvekan kör `security--run_security_scan` + `supabase--linter`.
- **PostHog**: Daglig verifiering. `is_internal_traffic` får aldrig blocka compcare.se.
- **Avrop**: Endast historiska. Aldrig "aktiva"/"live"/"pågående". Prognoser explicit märkta.

## Memories
- [No group role labels](mem://constraints/no-group-role-labels) — Roller benämns aldrig utåt som grupp (Grupp A/B) — endast specifik roll
- [Gating av prisdata](mem://constraints/price-data-gating) — Inga öppna exakta priser/formler. Utloggad = maskerad indikation + kontokrav. Agenter → /llms.txt + /openapi.json

- [Retired modules](mem://archive/retired-modules) — Arkiverade spår, raderade edge functions, öppen fråga om skrPrices2026
- [Security change protocol](mem://security/change-protocol) — Obligatorisk säkerhetsanalys efter varje ändring
- [PostHog daily check](mem://tech/posthog-daily-check) — Daglig tracking-verifiering
- [PostHog internal traffic](mem://tech/posthog-internal-traffic) — Vilka hosts som räknas som interna vs produktion
- [Cookieless pageview guard](mem://tech/cookieless-pageview-guard) — Pageview-spårning utan cookies
- [Tracking coverage](mem://tech/tracking-coverage) — Vilka events som ska finnas
- [Copy approval required](mem://constraints/copy-approval-required) — Copy ändras inte utan godkännande
- [Email provider lock](mem://constraints/email-provider-lock) — Låst e-postleverantör
- [No SCB source](mem://constraints/no-bemlo-source) — Förbjudna datakällor
- [No generic specialist nurse](mem://constraints/no-generic-specialist-nurse) — 1:1-bindning roll→pris, ingen generisk "Specialistsjuksköterska"
- [RLS OR-on-nullable ban](mem://constraints/rls-or-on-nullable) — Förbjudet mönster i RLS-policyer
- [Possible compensation terminology](mem://content/possible-compensation-terminology) — Godkända formuleringar om möjlig ersättning
- [Invoice check change control](mem://security/invoice-check-change-control) — Ändringskontroll för fakturakontroll (spåret arkiverat)
