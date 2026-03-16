

# Copy-granskning: Neutralitetsproblem på CompCare.se

## Princip
CompCare ska vara en **neutral dataplattform** — inte en rådgivare som tar parti. Sidan visar offentlig statistik och låter användaren dra egna slutsatser. Formuleringar som antyder att bemanningsföretag betalar för lite, eller som pressar användaren att "kräva" mer, ska ersättas med neutrala, deskriptiva alternativ.

---

## 1. Landningssidan (`Index.tsx`)
**Inga problem.** Copyn är redan neutral och deskriptiv.

---

## 2. Enkäten (`Survey.tsx`)
**Inga problem.** Frågorna är rakt ställda utan värdeladdning.

---

## 3. Teaser-sidan (`Teaser.tsx` + teaser-komponenter)

### 3a. `WowHero.tsx` — **Problematisk**
| Nuvarande | Förslag |
|---|---|
| "Din ersättning ligger under marknaden" (rubrik) | "Din ersättning jämfört med marknaden" |
| "Du kan tjäna upp till {monthly} kr mer per månad" | "Skillnad mot marknadsspannet: {monthly} kr/mån" |
| "{hourlyGap} kr/h under marknaden" | "Avstånd till marknadsspannets övre gräns: {hourlyGap} kr/h" |

### 3b. `EmailHookMessage.tsx` — **Delvis problematisk**
| Nuvarande | Förslag |
|---|---|
| "ligger **under marknaden**" (röd, destructive) | "ligger **under marknadsspannet**" (neutral färg, primary) |
| Icon: `TrendingDown` med `text-destructive` för "underpaid" | Samma ikon/färg som "at_market" — all tiers bör ha neutral ton |

Alla tre tiers har redan bra copy utom "underpaid"-varianten som använder alarmerande röd styling. Förslag: byt till samma `text-primary`-stil oavsett tier.

### 3c. `MarketDiagnosisCard.tsx` — **Delvis problematisk**
| Nuvarande | Förslag |
|---|---|
| "Din **löneposition**" (rubrik) | "Din position i marknaden" |
| "Du ligger **under** medianen" (röd, destructive) | "Din ersättning ligger under medianen" (neutral primary-färg) |
| "men det finns utrymme" (near-tier) | "se rapporten för fullständig jämförelse" |

Förslag: byt `destructive`-färg i position-indikatorn till en neutral ton. All positionering (under/nära/över) bör presenteras utan värdering.

### 3d. `OpportunityGap.tsx` — **Problematisk**
| Nuvarande | Förslag |
|---|---|
| "Din lön kan **öka** med X kr/h" | "Skillnad mot marknadsspannets övre gräns: X kr/h" |
| "Se exakt hur mycket du **förlorar** — och hur du förhandlar upp det" | "Se fullständig jämförelse med marknadsdata" |
| `AlertTriangle`-ikon + destructive-border | Neutral ikon (`BarChart3`) + standard border |

### 3e. `IncomeImpactCard.tsx` — **Delvis problematisk**
| Nuvarande | Förslag |
|---|---|
| "Ekonomisk konsekvens" (rubrik) | "Skillnad mot marknadsspannet" |
| "{yearlyGap} kr/år" + "Din ersättning **kan öka** med upp till detta belopp" | "{yearlyGap} kr/år" + "Skillnaden mellan din ersättning och marknadsspannets övre gräns, omräknat på årsbasis" |

### 3f. `EarningsBanner.tsx` — **Delvis problematisk**
| Nuvarande | Förslag |
|---|---|
| "kan du tjäna {diffPercent}% mer" | "din ersättning ligger {diffPercent}% under medianen" (neutralt konstaterande) |
| "Vill du se exakta belopp och få **förhandlingstips**?" | "Se fullständig jämförelse i rapporten" |

### 3g. `HighEarnerCard.tsx` — **Delvis problematisk**
| Nuvarande | Förslag |
|---|---|
| "**Så kan du öka** din ersättning" | "Ytterligare datapunkter" |
| "Överväg uppdrag i en annan zon för att **öka din ersättning**" | "Andra zoner har andra ramavtalspriser för samma roll" |

### 3h. `LockedStrategyCard.tsx` — **Problematisk**
| Nuvarande | Förslag |
|---|---|
| "Hur du kan **förhandla upp** din lön/ersättning" | "Fullständig marknadsjämförelse" |
| "Din möjliga konsultintäkt" | "Konsultmarknadens ersättningsspann" |

### 3i. `TeaserHeader.tsx` — **OK men kan förbättras**
| Nuvarande | Förslag |
|---|---|
| "Din **löneanalys** är klar" | "Din marknadsanalys är klar" |

### 3j. `PermanentBenchmarkCard.tsx` — **Delvis problematisk**
| Nuvarande | Förslag |
|---|---|
| "Övre kvartil (P75) — **ditt mål**" | "Övre kvartil (P75)" |

---

## 4. Rapporten (`ConsultantTrackContent.tsx`)

### 4a. Statusbadge (rad 157-170) — **Problematisk**
| Nuvarande | Förslag |
|---|---|
| "Du kan tjäna **upp till** {X} kr mer per månad" | "Skillnad mot marknadsspannet: {X} kr/mån" |
| "det finns utrymme att **förhandla upp** din ersättning" | "Baserat på ramavtalspriset i din region" |

### 4b. Förhandlingssektionen "Nästa steg — vad du ska säga" (rad 324-360) — **Mest problematisk**
Hela sektionen positionerar CompCare som rådgivare mot bemanningsföretaget. Förslag:

- **Rubrik:** "Nästa steg — vad du ska säga" → "Marknadsdata — så kan den användas"
- **Steg 2:** `"...därför borde min ersättning landa runt X kr/h efter er marginal"` → Neutralisera till: `"Ramavtalspriset för [roll] i min region är X kr/h. Hur förhåller sig min ersättning till det?"`
- **Steg 3:** `"Jag vill att min ersättning justeras. Kan vi hitta en lösning?"` → `"Jag vill diskutera min ersättning utifrån aktuell marknadsdata."`

### 4c. `negotiationData.ts` — **Problematisk**
| Nuvarande | Förslag |
|---|---|
| "din ersättning **bör** ligga X% högre" | "Ramavtalspriset ligger X% över din nuvarande ersättning" |
| "Begär ett möte...presentera ramavtalspriserna" | "Ramavtalspriserna kan användas som referens i ett ersättningssamtal" |
| "bra förhandlat!" | "Din ersättning ligger nära marknadsspannet" |
| "det är **rimligt att förhandla** en högre ersättning" | Ta bort — CompCare ska inte ge förhandlingsråd |
| "det signalerar att du är insatt" | Ta bort — värderande |

### 4d. "Din andel av kundpriset"-sektionen (rad 440-507)
| Nuvarande | Förslag |
|---|---|
| "det finns **tydligt förhandlingsutrymme**" | "Andelen ligger under marknadens genomsnitt" |

### 4e. "Du ligger redan i toppskiktet" (rad 509-540)
Mestadels neutral redan. Ändra:
| Nuvarande | Förslag |
|---|---|
| "Så kan du **öka** din totala ersättning" | "Ytterligare ersättningskomponenter" |

### 4f. "Så fungerar analysen" (rad 661-680) — **Bra, neutral redan**

---

## 5. Rapporten (`PermanentTrackContent.tsx`)

| Nuvarande | Förslag |
|---|---|
| "Du kan tjäna **upp till** {X} kr mer per månad" | "Skillnad mot P75: {X} kr/mån" |
| "du har goda skäl att **kräva** en rejäl ersättningsrevision" | "Skillnaden mot medianen är betydande" |
| "**begär** en justering till minst mediannivå" | "Din ersättning ligger under medianen" |
| "Förhandlingsutrymme mot P75" | "Avstånd till P75" |
| "under **toppskiktet** för din yrkesgrupp" | "under P75 för din yrkesgrupp" |

---

## 6. FAQ-sidan (`FAQ.tsx`)

| Nuvarande | Förslag |
|---|---|
| "Hur vet jag om jag är **underbetald**?" | "Hur ligger min ersättning jämfört med marknaden?" |
| "...argumentera att din ersättning **bör spegla** ditt faktiska marknadsvärde" | "...referera till officiella ramavtalspriser som datapunkt" |
| "hur du kan **förhandla bättre**" | "ramavtalspriser och marknadsdata" |
| "ger en mer realistisk bild av ditt **marknadsvärde**" | "ger en referenspunkt för vad vårdgivare betalar" |

---

## 7. `InvoiceReviewCTA.tsx`
| Nuvarande | Förslag |
|---|---|
| "Har du fått **rätt betalt** för alla dina timmar?" | Neutral: "Stämmer dina fakturor med avtalsvillkoren?" |
| "Många konsulter **missar** ersättning" | "Fakturor kan ibland avvika från avtalade tillägg" |

---

## 8. `PersonalInsights.tsx` — **OK, mestadels neutral**

---

## 9. `ColleagueComparison.tsx` — **OK, neutral**

---

## Sammanfattning: filer som behöver ändras

1. `src/components/teaser/WowHero.tsx` — neutralisera rubrik + belopp
2. `src/components/teaser/EmailHookMessage.tsx` — ta bort destructive-styling för underpaid
3. `src/components/teaser/MarketDiagnosisCard.tsx` — neutral färg, ta bort "utrymme"
4. `src/components/OpportunityGap.tsx` — ta bort "förlorar", neutral ikon
5. `src/components/teaser/IncomeImpactCard.tsx` — neutral rubrik
6. `src/components/teaser/EarningsBanner.tsx` — neutralisera CTA-text
7. `src/components/teaser/HighEarnerCard.tsx` — ta bort "öka"
8. `src/components/teaser/LockedStrategyCard.tsx` — neutralisera items
9. `src/components/teaser/TeaserHeader.tsx` — "marknadsanalys"
10. `src/components/teaser/PermanentBenchmarkCard.tsx` — ta bort "ditt mål"
11. `src/components/report/ConsultantTrackContent.tsx` — neutralisera statusbadge + förhandlingsscript
12. `src/components/report/PermanentTrackContent.tsx` — neutralisera gap-copy + tips
13. `src/components/report/negotiationData.ts` — omformulera alla tips
14. `src/pages/FAQ.tsx` — neutralisera 4 formuleringar
15. `src/components/report/InvoiceReviewCTA.tsx` — neutralisera rubrik

Ingen logik eller layout ändras — bara strängar och i vissa fall CSS-klasser (destructive → primary/neutral).

