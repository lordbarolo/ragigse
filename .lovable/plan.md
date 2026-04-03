

## Plan: Ta bort jämförelser med andra — visa bara möjlig ersättning

### Sammanfattning
Rensa bort alla formuleringar som jämför besökarens ersättning med andra konsulter/kollegor (t.ex. "topp 20%", "över snittet", "jämfört med kollegor"). Behåll allt som visar vad besökaren kan tjäna baserat på regionernas priser och bemanningsföretagens marginaler.

### Ändringar

**1. `src/components/report/PersonalInsights.tsx`**
- Ta bort raden "Du ligger över snittet av konsulter i din specialitet"
- Ta bort percentilberäkning (`percentilePosition`) och median-jämförelsen ("Medianen är X %")
- Behåll zon-jämförelse (det är regiondata, inte jämförelse med andra) och andel av kundpris (men formulera om utan "medianen")
- Ändra rubriken "Din marknadsposition" → t.ex. "Insikter"

**2. `src/components/report/ColleagueComparison.tsx` + användning i `ConsultantTrackContent.tsx`**
- Ta bort hela `ColleagueComparison`-komponenten från rapporten (den uppmanar att jämföra med kollegor)
- Ta bort importen och renderingen i `ConsultantTrackContent.tsx`

**3. `src/components/teaser/MarketDiagnosisCard.tsx`**
- Ändra "Din position i marknaden" och "Under/Nära/Över median"-språket
- Formulera om till att visa möjlig ersättning istället: t.ex. "Under marknadsspannet" / "Inom marknadsspannet" / "Över marknadsspannet" (baserat på regionens priser, inte jämförelse med andra)

**4. `src/components/teaser/ReportPreviewList.tsx`**
- PERMANENT_ITEMS: Ändra "Din löneposition — Se exakt var du ligger jämfört med kollegor i samma sektor" → t.ex. "Din löneposition — Se var din lön ligger i förhållande till officiell statistik"
- CONSULTANT_ITEMS: "Skillnad mellan din nivå och snitt" → "Skillnad mot marknadsspannet"

**5. `src/pages/AnalysisScreen.tsx`**
- Ändra loading-meddelande "Jämför din ersättning med kollegor…" → "Beräknar marknadsspann…"
- Ändra step "Jämför med din specialitet" → "Matchar din yrkeskategori"

**6. `src/components/demo/ServiceCarousel.tsx`**
- Ändra "Jämför din ersättning mot över 10 000 andra konsulter i realtid." → t.ex. "Se vad du kan tjäna baserat på regionernas ramavtalspriser."

**7. `src/components/chat/ChatMessage.tsx`**
- Ändra `salary_position: "din position mot marknaden"` → "möjlig ersättningsnivå"
- Ändra `compare_roles: "rolljämförelse"` → ta bort eller formulera om

**8. `src/components/teaser/EmailHookMessage.tsx`**
- Texterna här jämför redan mot marknaden (inte mot andra), men "under marknadsspannet" etc. är ok — dessa refererar till regionens priser. Behåll som de är.

