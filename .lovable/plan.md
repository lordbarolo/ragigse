# CompCare — Funktionsstatus

_Uppdaterad: 2026-03-25_

---

## ✅ Byggt och live

### Kärntjänst (Ersättningskoll)
- **Landing page** — Hero, steg-guide, roller, statistik-ticker, CTA
- **Survey (enkät)** — Flerstegs datainsamling (yrke, kommun, erfarenhet, anställningsform)
- **Analysis screen** — Animerad beräkningsvy med e-postinsamling
- **Teaser** — Förhandsvisning med paywall, referral-dialog, kupongfält
- **Rapport (full)** — Konsult- och fastanställd-spår, löneindikator, kollegajämförelse, prishistorik, förhandlingstips, fakturagranskning-CTA, PDF-export
- **Checkout (Stripe)** — Betalflöde med kuponger, A/B-prisvarianter, webhook-verifiering
- **Referral-system** — Skicka till kollega → lås upp rapport gratis, bekräftelse-flöde

### Beräkningsmotor
- **Pricing Engine** (edge function) — Beräknar konsulttimpriser baserat på ramavtalsdata
- **Salary Benchmark Engine** (edge function) — Beräknar lönespann för fastanställda
- **Calc-bibliotek** (client-side) — Marginalmodeller, OB-beräkningar

### Användare & Profiler
- **Auth** (signup/login/reset password) — Supabase Auth
- **Profilsida** — Kopplad till consultant_profiles
- **Admin-panel** — Skyddad med rollbaserad auth, konverteringstratt, besöksstatistik, feedback, referral-stats, löneinsikter

### Uppdragsradar
- **Radar-sida** — Prediktioner för kommande avrop baserat på historisk data
- **Reijdar AI-chat** — AI-assistent för frågor om uppdragsmarknaden
- **Watchlist + notiser** — Bevaka specifika avrop, schemalagda e-postnotiser

### Referenser (Referly)
- **Referensprofil** — Publikt delbar profil med trust score
- **Reference Vault** — Förvaring och hantering av referenser
- **Ping-system** — Begär bekräftelse från referensperson
- **Verifieringsuppladdning** — Ladda upp intyg/dokument
- **BankID-verifiering** — Stubb (mock stängd av säkerhetsskäl)

### Compensation Intelligence API
- **CI Capabilities/Roles/Geographies/Metrics** — Strukturerat API-lager
- **Query-loggning** — compensation_queries-tabell
- **Client profiles & policy engine** — Rate limiting per klienttyp

### Infrastruktur & Säkerhet
- **Rate limiting** — På alla publika edge functions
- **RLS** — På alla känsliga tabeller (rates, payments, reports, referrals)
- **Error Boundary** — Global felhantering i React
- **Versionshantering av priser** — contract_versions + price_changes
- **Analytics/tracking** — PostHog + edge function (track-event)
- **Cookie banner** — Samtycke för spårning
- **SEO** — Meta, sitemap, robots.txt, OG-tags, llms.txt

### Övrigt
- **FAQ-sida**
- **Integritetspolicy**
- **Share Preview** — OG-delningssida
- **Negotiate-sida** — AI-förhandlingscoach
- **Theme toggle** (dark/light mode)
- **Followup-emails** — Automatiska uppföljningsmejl

---

## 🔲 Kvarstår / Planerat

### Högt prioriterat
- [ ] **isInternalTraffic-bypass** — Ta bort eller ersätt med PostHog-filter (`internal: true` redan taggat)
- [ ] **Leaked Password Protection** — Aktivera manuellt i auth-inställningar
- [ ] **ob_share → client_type** — Namnbyte i databas och kod (planerad datamigration)

### Funktioner att bygga/slutföra
- [ ] **BankID-integration (riktig)** — Mock stängd; behöver riktig BankID-koppling
- [ ] **Fakturagranskningstjänst** — CTA finns, backend-flöde saknas
- [ ] **Avancerad funnelanalys** — Dashboard med komplett tratt (pausad tills tracking stabiliserat)
- [ ] **Compensation Intelligence — agent-integration** — Koppla CI-API:et till AI-agenter (arkitekturdokument finns)
- [ ] **Multi-tenant CI** — Stöd för flera organisationer/klienter via client_profiles
- [ ] **Automatisk prisimport** — Schemalägga import av nya ramavtalsversioner

### Förbättringar
- [ ] **Radar — ML-prediktion** — Nuvarande logik är regelbaserad; planerat att lägga till maskininlärning
- [ ] **Referly — social proof-widget** — Bäddbar widget för trust score
- [ ] **PDF-rapport — design** — Förbättra layout och visuell kvalitet
- [ ] **E-postmallar** — Anpassade domänmallar (email_domain-infrastruktur tillgänglig)
- [ ] **A/B-testramverk** — Strukturerat stöd bortom manuella varianter
- [ ] **Rate alerts** — E-post vid prisförändringar i ramavtal

---

## 📊 Teknisk status

| Område | Status |
|---|---|
| Säkerhet (kritisk) | ✅ Åtgärdad |
| Tracking (PostHog) | ✅ Stabiliserad |
| Admin-skydd | ✅ Verifierat |
| RLS-policies | ✅ Granskade |
| Error handling | ✅ Global boundary |
| Beräkningslogik | ✅ Validerad |
