

## Status: Vad som är klart

**Backend (100% klart):**
- 8 tabeller med `ref_`-prefix, RLS-policyer, enums
- 8 RPC-funktioner (trust score, profile status, invite/submit reference, ping-system, profile views)
- `bankid-verify` edge function (placeholder)

## Nästa steg: Bygga UI i CompCare

Backenden är migrerad men det finns ingen frontend i CompCare som använder den. Referly-projektet har 5 sidor och 11 dashboard-komponenter. Dessa behöver återskapas i CompCare med CompCares befintliga design, auth (`useAuth` hook) och layout.

### Fas 1 — Grundläggande typer och constants
- Skapa `src/types/referly.ts` med COMPETENCIES, RELATIONSHIPS och type aliases för `ref_*`-tabellerna

### Fas 2 — Konsultens referensdashboard
- Integrera i befintliga `/profil`-sidan (eller ny `/profil/referenser`-route)
- Komponenter: InviteModal, ReferenceCard, ProfileStatusCard, TrustScoreCard
- Använder CompCares `useAuth` hook istället för Referlys AuthContext

### Fas 3 — Publika formulär (ingen auth krävs)
- `/referens/:token` — ReferenceForm (givare fyller i referens)
- `/ping/:token` — PingResponse (givare bekräftar/nekar ping)

### Fas 4 — Uppdragsgivarvy
- `/konsult/:id` — ClientProfileView (klient ser konsultprofil med ping-möjlighet)

### Fas 5 — Referensgivarens dashboard
- RefereeDashboard — visa lämnade referenser och ping-förfrågningar

### Rekommendation

Börja med **Fas 1 + 2** — det ger mest värde direkt: konsulter kan bjuda in referensgivare och se sin trust score, integrerat i CompCares befintliga profilsida.

