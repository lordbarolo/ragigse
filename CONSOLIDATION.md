# CONSOLIDATION.md — Fas 1: Inventering

Status: **Fas 1 klar. Ingen kod ändrad.**
Genererad: 2026-07-28

Markera per rad i Fas 2: `behåll` / `radera` / `senare`.

---

## 0. Sammanfattning i siffror

| Mått | Värde |
|---|---|
| TS/TSX-filer i `src` | 300 |
| Nåbara från `main.tsx` | 146 |
| **Orphans (ingen importerar dem)** | **145** |
| Routes i `App.tsx` | 62 (26 KEEP, 33 REDIRECT-stubbar, 3 catch/legacy) |
| Edge functions | 92 |
| Edge functions utan någon referens | 26 |
| Memory-filer | 11 + ~90 rader i `mem://index.md` |

Kort: **ungefär halva kodbasen är död kod.** Det är källan till upplevelsen av tappad kontroll.

---

## 1. Aktiv yta — routes i `src/App.tsx`

### KEEP — det som faktiskt är produkten
| Route | Sida |
|---|---|
| `/` | `Home.tsx` |
| `/resultat/:leadId` | `AnalysisScreen.tsx` |
| `/rapport/:reportId` | `Report.tsx` |
| `/rapport/anestesisjukskoterska` | `AnestesiReport.tsx` |
| `/rapport/lakare-allmanmedicin` | `AllmanmedicinReport.tsx` |
| `/rapport/sjukskoterska` (+5 alias) | `SjukskoterskaReport.tsx` |
| `/rapport/<13 läkarspecialiteter>` | `LakareSpecialtyReport.tsx` |
| `/Bollnas/lakare-alm` (+ lowercase) | `BollnasAllmanspecialistReport.tsx` |
| `/kampanj/:role` | `Campaign.tsx` |
| `/logga-in`, `/registrera`, `/aterstall-losenord`, `/unsubscribe` | auth |
| `/consultant/profil` | `Profile.tsx` (i `ConsultantLayout`) |
| `/consultant/forhandla` | `Negotiate.tsx` |
| `/vanliga-fragor`, `/integritetspolicy` | legal |
| `/admin`, `/admin/agent-api-keys`, `/admin/health`, `/dev/analytics` | admin |

### REDIRECT-stubbar → `/` (33 st)
`/index` `/v1` `/b2b` `/profil` `/consultant/salary-check` `/consultant/fakturakontroll/*` `/consultant/ersattning` `/consultant/referenser` `/consultant/academy` `/consultant/agent-access` `/forhandla` `/fakturakontroll` `/referenser` `/academy` `/marketplace` `/eget-bolag` `/uppdragsradar` `/for-bemanningsforetag` `/registrera/bemanning` `/agency/*` `/din-data` `/dokhus-info` `/verify-info` `/verify` `/verify/:id` `/samarbetsintyg/:id` `/profil/:id` `/referens/:token` `/ping/:token` `/sign/:token` `/delade-dokument/:token` `/dela` `/referenser-info` `/demo` `/demo/*` `/dev/demo` `/dev/theme-preview` `/dev/e2e-test`

**Observation:** varje redirect är en tyst begravning. Sidorna som de pekade på ligger kvar på disk men når ingen. Det är de som skapar namnförvirringen.

**Beslut som behövs:** behåll redirects för SEO-värde (rekommenderas för publika URL:er som `/verify/:id`, `/rapport/*`-alias, `/b2b`) men radera de bakomliggande sidfilerna. Interna dev-routes (`/dev/*`, `/demo/*`, `/v1`) kan tas bort helt.

---

## 2. Orphan-filer (145) — grupperade

### 2A. Hela produktspår som är avstängda — kandidater för radering
| Spår | Filer |
|---|---|
| **Referly / Ref-ID** | `pages/Referenser.tsx`, `ReferenserInfo.tsx`, `ReferenceForm.tsx`, `PingResponse.tsx`, `PublicProfile.tsx`, `SharePreview.tsx`, `components/referly/*` (8 filer), `hooks/useVault.ts`, `useRefProfile.ts`, `types/referly.ts`, `layouts/PublicVerifyLayout.tsx`, `components/profile/DashboardReferences.tsx`, `ReferenceSlidePanel.tsx` |
| **Dokhus / Verify** | `pages/VerifyInfo.tsx`, `VerifyProof.tsx`, `SignRepresentation.tsx`, `SharedDocuments.tsx` |
| **Uppdragsradar** | `pages/Uppdragsradar.tsx`, `UppdragsradarV2.tsx`, `Radar.tsx`, `components/radar/*` utom `BottomNav.tsx` (7 filer inkl. `radarMockData.ts`) |
| **Agency / B2B** | `pages/AgencyLanding.tsx`, `AgencyDashboard.tsx`, `AgencySignup.tsx`, `MarketEdge.tsx`, `agency/Intyg.tsx`, `layouts/AgencyLayout.tsx`, `components/agency/MarketKpiRow.tsx` |
| **Marketplace** | `pages/marketplace/MarketplaceHome.tsx` |
| **Fakturakontroll** | `pages/Fakturakontroll.tsx`, `consultant/FakturakontrollNy.tsx`, `components/invoice/InvoiceUploadForm.tsx`, `components/profile/DashboardInvoiceCheck.tsx`, `components/ai/InvoiceEmailDrafter.tsx` |
| **Academy** | `pages/Academy.tsx` |
| **Eget bolag** | `pages/EgetBolag.tsx` |
| **AI-chatt / assistent** | `components/chat/*` (4), `components/ai/AiConsultantCoach.tsx`, `AiPricingCoach.tsx`, `AiExplainButton.tsx`, `hooks/useNegotiationChat.ts`*, `useAiQuota.ts` |

\* `useNegotiationChat.ts` visas som orphan men `/consultant/forhandla` är KEEP — verifieras i Fas 3 innan radering.

### 2B. Demo- och experimentsidor — radera
`pages/DemoLanding.tsx`, `demo/DemoAnthropic.tsx`, `demo/LandingV2.tsx`, `demo/LandingExtras.tsx`, `demo/HeroTailwind.tsx`, `demo/ReferenceDemo.tsx`, `demo/ShiftnexClone.tsx`, `pages/ThemePreview.tsx`, `pages/E2ETest.tsx`, `pages/Index.tsx`, `pages/CompensationPreview.tsx`, `pages/consultant/SalaryCheck.tsx`, `pages/consultant/AgentAccess.tsx`, `pages/ReferralLanding.tsx`, `components/demo/*` utom `AnthropicScope.tsx` (4 filer)

### 2C. Landing-komponenter — 20 av 22 oanvända
Används: `RoleCarousel.tsx`. Allt annat i `components/landing/` (`Hero`, `HeroInlineForm`, `HeroRateLookup`, `AgentNetwork`, `BottomCTA`, `DataSection`, `InvoiceSection`, `LandingFooter`, `LandingNav`, `MissionSection`, `OBSection`, `RefSection`, `ReportPreview`, `RoleSelector`, `RotatingHeroWord`, `ServiceCards`, `StatBar`, `Steps`, `Ticker`) är rester från tidigare landningssidor.

### 2D. Teaser-komponenter — 7 av 9 oanvända
Kvar i bruk: `SignupGate.tsx`, `MarketDiagnosisCard.tsx`. Oanvända: `EmailGate.tsx` (ersatt av SignupGate), `EmailHookMessage`, `MethodologyDisclosure`, `NegotiationAssistantTeaser`, `OccupationInfo`, `ReportPreviewList`, `TeaserHeader`.

### 2E. ⚠️ FLAGGA — orphans som *borde* användas
Dessa är döda enligt importgrafen men beskrivs i projektminnet som kritiska. **Radera inte — utred i Fas 2.**

| Fil | Varför det är oroande |
|---|---|
| `src/data/skrPrices2026.ts` | Memory: "1:1-bindning roll→pris via PRICE_BY_ROLE". Om ingen importerar den — var kommer priserna ifrån i dag? |
| `src/hooks/useContractRate.ts` | Samma regel. |
| `src/components/report/IncomeImpactCard.tsx` | Memory har egen post om årslöne-diffen. |
| `src/components/report/PersonalInsights.tsx`, `ColleagueComparison.tsx`, `ConsultantRateLookup.tsx` | Rapportinnehåll som antas finnas. |
| `src/lib/featureFlags.ts` | Marketplace dual-gate bygger på den. |

### 2F. Oanvända shadcn/ui-primitiver (20 st)
`alert` `aspect-ratio` `avatar` `breadcrumb` `context-menu` `dropdown-menu` `form` `hover-card` `menubar` `navigation-menu` `pagination` `radio-group` `scroll-area` `sheet` `sidebar` `tabs` `toggle` `toggle-group` `agentic-loader` `use-toast`
Låg risk, låg vinst. Rekommendation: `senare`.

---

## 3. Edge functions

### Utan någon referens i kod (26) — kandidater
`ai-consultant-coach` `auth-email-hook`¹ `bankid-auth` `bankid-collect` `ci-capabilities` `ci-geographies` `ci-metrics` `ci-roles` `compensation-intelligence` `conversion-monitor` `download-shared-document` `generate-pdf`² `get-public-profile` `get-shared-documents` `get-verify-data` `handle-email-suppression` `invoice-analyzer` `lonekoll-monitor` `marketplace-agent-negotiate` `monthly-security-audit`³ `posthog-health-check`³ `preview-transactional-email` `process-email-queue`³ `radar-notify` `rate-mismatch-watchdog`³ `redeem-coupon` `send-followup-emails`³ `stripe-webhook`⁴

¹ anropas av auth-systemet, inte av kod → **behåll**
² nyligen säkerhetshärdad, anropas ev. externt → **utred**
³ pg_cron-jobb → **behåll** (verifieras mot `cron.job` i Fas 3)
⁴ webhook från extern part → **behåll**

Endast funktioner som varken anropas från kod, cron eller webhook raderas. Netto-kandidater: BankID (2), CI-stacken (5), marketplace (1), verify/share (4), coupon (1), radar-notify, invoice-analyzer, ai-consultant-coach.

### Backend-DB
33 tabeller refereras från `src`. Tabeller kopplade till avstängda spår (`ref_*`, `verifications`, `mp_*`, invoice-tabeller) ska **inte** raderas i Fas 3 — de innehåller produktionsdata. Rekommendation: låt schemat ligga, ta bara bort kod. DB-städning som separat, senare beslut.

---

## 4. Terminologikonflikter

| Konflikt | Förekomster i `src` | Kanoniskt (enligt memory) |
|---|---|---|
| Verify / Dokhus / Din data | Verify 22 filer, Dokhus 4, "Din data" 10 | **Din data** (UI), `verify` (backend) |
| Referly / Ref-ID | Referly 12 filer, Ref-ID 3 | **Ref-ID** |
| ping / pling | ping 17 filer, pling 5 | **pling** (UI), `ping` (backend) |
| Reijdar / Uppdragsradar | Reijdar 8, Uppdragsradar 8 | **Uppdragsradar** — "Reijdar" är odokumenterat |
| agent / assistent / coach | agent 24, assistent 21, `AiPricingCoach`/`AiConsultantCoach`/`salary-negotiation-agent` | **Löneassistenten** |
| Marketplace | 3 filer | avstängt bakom dual-gate |
| Academy | 2 filer | avstängt |

**Kärnproblemet:** ~90 % av dessa förekomster ligger i filer som är orphans. Raderar vi Fas 3 först försvinner terminologikaoset nästan av sig självt — då återstår bara att låsa namnen i Fas 4.

Rekommenderad ordning: **radera före omdöpning.**

---

## 5. Minnesredundans (`mem://index.md`)

- Core-blocket är ~20 punkter, flera >300 tecken — riktlinjen är ~150.
- Memories-listan har **72 poster**. Uppskattningsvis 30+ beskriver spår som är avstängda (marketplace, referly, dokhus, agency, radar, academy, invoice, payment).
- Motsägelser: `1.42` vs `1.38` (löst i texten men båda nämns), `Verify→Dokhus→Din data` beskrivs i tre separata poster, PostHog i tre poster, invoice i sju poster.
- Rekommendation Fas 4: arkivera poster för avstängda spår till en enda `mem://archive/retired-modules`, behåll ~15 aktiva.

---

## 6. Repo-rotens dokument

| Fil | Förslag |
|---|---|
| `AUDIT_BRIEF.md` | arkivera |
| `LAUNCH_SNAPSHOT.md` | behåll (refereras av marketplace-isolationsregeln) |
| `security-audit-prompt.md`, `prompts/security-audit.md` | dubbletter — slå ihop |
| `security-reports/*` (2 rapporter + mall) | arkivera under `docs/archive/` |
| `README.md` | skrivs om i Fas 5 |
| `.lovable/plan.md` | töms i Fas 5 |

---

## 7. Rekommenderad omfattning för Fas 3

| Commit | Innehåll | Filer | Risk |
|---|---|---|---|
| **3.1** | Orphan-sidor + komponenter för avstängda spår (2A + 2B + 2C + 2D) | ~110 | Låg — inget importerar dem |
| **3.2** | Döda edge functions (endast bekräftat oanvända) | ~14 | Medel — kräver cron-kontroll |
| **3.3** | Dokumentarkivering + memory-rensning | ~15 | Ingen |

Ej i Fas 3: DB-schema, `ui/`-primitiver, kod under 2E.

---

## Nästa steg — Fas 2

Svara med `behåll` / `radera` / `senare` per grupp i avsnitt 2 och 3. Jag ställer följdfrågor på de tvetydiga punkterna (särskilt 2E och redirect-strategin) innan något raderas.

---

# Fas 3–5 — Genomfört 2026-07-28

**Beslut:** arkivera i `src/_archive/` · ta bort alla redirects · utred prislogik först · frontend + bekräftat döda edge functions.

## Fas 3.1 — Frontend
- **114 filer** flyttade till `src/_archive/` (struktur bevarad, exkluderad från typecheck och bundling).
- Behållna trots orphan-status: `skrPrices2026.ts`, `useContractRate.ts`, `featureFlags.ts`, `specialitySlugs.ts`, `swedishRegions.ts`, `colors.ts`, `setPageMeta.ts`, `useTheme.ts`, `ThemeToggle.tsx`, `use-mobile.tsx` samt alla `components/ui/`-primitiver.
- **33 redirect-routes borttagna** ur `App.tsx`. `/consultant/forhandla` behölls som riktig route.
- `src/test/h1-overflow.test.tsx` pekar nu på `Home` + `FAQ`.

## Fas 3.2 — Backend
Kontrollerat mot `cron.job`, `public/openapi.json`, `public/llms*.txt` och `_shared/`.

**Raderade (11):** `get-verify-data` `get-shared-documents` `download-shared-document` `invoice-analyzer` `ai-consultant-coach` `marketplace-agent-negotiate` `marketplace-listing-public` `marketplace-listing-upsert` `marketplace-offer-respond` `redeem-coupon` `radar-notify` — även borttagna från live-miljön och `config.toml`.

**Behållna trots noll kodreferenser:** `ci-*` (4), `compensation-intelligence`, `generate-pdf`, `get-public-profile` (publikt agent-API) · `bankid-auth`, `bankid-collect` (scope-låst produktbeslut) · `process-email-queue`, `handle-email-suppression`, `preview-transactional-email`, `posthog-health-check`, `stripe-webhook`, `validate-coupon` (infrastruktur) · 12 cron-drivna functions.

**DB-schema orört.** Ingen migration kördes.

## Fas 3.3 / 4 / 5 — Dokument och namn
- `AUDIT_BRIEF.md`, `security-audit-prompt.md`, `security-reports/` → `docs/archive/`.
- `TERMINOLOGY.md` skapad — enda sanningen för namn.
- `mem://index.md` reducerad från 72 poster till 13; arkiverade spår samlade i `mem://archive/retired-modules`.
- `README.md` omskriven. `.lovable/plan.md` innehåller nu bara pågående arbete.
- `public/llms.txt` rensad från döda URL:er. `public/sitemap.xml` regenererad (52 poster, inga döda länkar).

## Utredning: prislogiken (punkt 2E)
`skrPrices2026.ts` och `useContractRate.ts` importeras **inte av någon fil**. Priserna hämtas i dag från `contract_version_rates` via `pricing-engine` och direkta queries, plus hårdkodade värden i rapportsidorna. Modulerna är alltså en typad fallback som ingen använder. **Filerna behölls orörda.** Beslut kvarstår: koppla rapportsidorna till `useContractRate` för att garantera 1:1-bindningen roll→pris i kod, eller ta bort fallbacken.

## Verifiering
- Typecheck: rent.
- Tester: 48/55 gröna. 7 fel (`RoleDropdown`, `posthog.cookieless`, `index.css`-regexen) är **pre-existerande** och orörda av konsolideringen.
- Röktest: `/`, `/logga-in`, `/rapport/sjukskoterska`, `/rapport/lakare-allmanmedicin`, `/vanliga-fragor`, `/kampanj/sjukskoterska` → 200 med korrekt H1. `/consultant/profil` → redirect till inlogg. Inga nya konsolfel.

## Resultat
| | Före | Efter |
|---|---|---|
| Aktiva TS/TSX-filer i `src` | 300 | 186 |
| Routes i `App.tsx` | 62 | 29 |
| Edge functions | 92 | 81 |
| Memory-poster i index | 72 | 13 |
| Markdown i repo-roten | 4 spridda | 3 med tydlig roll |
