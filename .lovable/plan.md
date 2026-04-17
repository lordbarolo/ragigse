

## Min bedömning av Claudes take

**Kort svar: Jag håller med om 80% — med två viktiga reservationer.**

### Där Claude har helt rätt

1. **Rate-finder i hero som enda prioritet nu** ✅ — Rätt analys. Du har all infrastruktur (`pricing-engine`, `MarketSearchBox`, `roles`/`locations`-tabeller). Wow-faktor utan email-vägg är rätt psykologi för 2026.

2. **Zondifferens som andra wow-moment** ✅ — Helt rätt. `geographical-pricing-logic` finns redan med Zon 1/2/3-modellen. 30 min implementation, hög effekt.

3. **Mobile-first-varningen** ✅ — Kritisk. Konsulter är på språng. Detta saknades helt i Geminis underlag.

4. **Skippa "Reidar"** ✅ — Bryter mot er neutralitetspolicy.

5. **Scope creep-varningen** ✅ — App Store, Academy-marknadsplats, HOSP-integration är månader bort.

### Två viktiga justeringar mot Claude

**Justering 1: Använd `MarketSearchBox`, inte nya dropdowns**

Claudes prompt säger "Add two dropdowns (Role from roles table, Region from regions table)". Detta är fel för er stack. Ni har redan `MarketSearchBox` med:
- 64 underspecialiteter mappade
- Synkad `standardized-role-definitions` mellan Survey och MarketSearchBox
- Korrekt yrkeskategori → specialisering-flöde

Att bygga nya dropdowns skulle bryta `data/standardized-role-definitions`-policyn och skapa två sanningar.

**Justering 2: Tema, inte "purple/dark"**

Claudes prompt säger "Keep the existing purple/dark theme". `/demo/landing-v2` är **vit Kivra-stil** (vit/#F2F1F8, Georgia, #534AB7 accent) per `landing-v2-visuals` och `brand-design-system`. Ingen dark theme på den routen.

### Där Claude underskattar något

**"Email-capture EFTER resultat" — bra, men nyansera**

Claudes flöde: Visa pris → sen email-gate för PDF. Detta är rätt psykologi MEN ni har redan en mer sofistikerad tratt:
- `/` (SalaryCheck 6-stegs enkät) → `/resultat/:leadId` → `/teaser` → email-gate → `/rapport/:reportId`

Risken med Claudes förslag: hero-calculatorn på `/demo/landing-v2` blir en **parallell tratt** som inte feedar in i `lead-capture-funnel-architecture`. Lösning:
- Hero-resultatet får CTA "Få fullständig analys" som routar till `/?yrke=X&kommun=Y&anstallning=Z` (prefill-mönstret finns redan via `survey-prefill-integration`)
- Då återanvänds hela rapport-pipen, ingen ny lead-väg

### Det Claude missar helt

**Fakturakontrollen är inte bara "post-login"**

Claude säger "post-login-flöde, lägg på nästa sprint". Faktum är:
- `/consultant/fakturakontroll` finns redan live
- `invoice-service-agreement` (no cure–no pay 25%) är aktiverad
- Det som saknas är monetiserings-UI:t ("Vi hittade X kr" + blurred list + "Hämta mina pengar")

Detta är **inte** veckor av jobb — det är 1-2 dagars UI-uppdatering på befintlig backend. Värt att köra parallellt med hero efter att hero landat.

### Rekommenderad ordning

| Prio | Vad | Tid | Värde |
|---|---|---|---|
| 1 | Hero rate-finder med `MarketSearchBox` + counter + CTA till `/?prefill` | 1-2 d | Wow-faktor + tratt-feed |
| 2 | Zon-rad under resultatet ("I zon 3: +340 kr/h") | 30 min | Andra wow-moment |
| 3 | Mobil QA på iPhone 13-viewport (390×844) | 30 min | Kritisk för målgrupp |
| 4 | Fakturakontroll-monetisering (blurred + "Hämta mina pengar") | 1-2 d | Konvertering, post-login |
| 5 | Förhandlingsagent nivåkalibrering | 1-2 d | Förbättrar kärn-AI |

### Slutsats

Claude har rätt strategiskt. Bygg hero-calculatorn nu — men:
- Använd `MarketSearchBox` (inte nya dropdowns)
- Vit Kivra-tema (inte dark/purple)
- Routa till befintlig prefill-tratt (inte parallell email-gate)
- Lägg till zon-raden i samma sprint
- Mobil-QA innan release

**Vill du att jag kör Hero rate-finder + zon-rad nu med dessa justeringar?**

