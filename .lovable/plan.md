

# Förbättrad plan: Fakturakontrollsidan — No cure no pay, processguide och avtal

## Identifierade förbättringar jämfört med nuvarande plan

1. **Steg 1 är redan lång** — info-boxen och processguiden bör placeras *ovanför* formuläret som en introduktionssektion, inte blandat med upload-fälten. Tydligare separation: först "varför" (info + processguide), sedan "hur" (formuläret).

2. **Processguiden duplicerar STEP_LABELS** — de fyra stegen i den visuella guiden (Ladda upp → Analys → Resultat → No cure no pay) beskriver *tjänsten*, medan STEP_LABELS (Ladda upp → Analys → Sammanfattning → Bekräftelse) beskriver *formulärets steg*. Bra att de är separata, men rubriken bör tydliggöra att guiden visar "Så fungerar tjänsten" — inte formulärets steg.

3. **Avtalstexten saknar bolagsuppgifter** — Eneas avtal har tydligt angivna parter (org.nr, adress). CompCare-avtalet bör inkludera CompCares bolagsuppgifter som platshållare (`[CompCare AB, org.nr XXXXXX-XXXX]`) och dynamiskt visa kundens namn/e-post från auth-sessionen.

4. **Nedladdningsbar PDF i dialogen** — Lägg till en "Ladda ner avtal (PDF)"-knapp i dialogen som öppnar den genererade PDF:en. Ger användaren möjlighet att spara avtalet.

5. **Avtalet bör nämna GDPR/personuppgifter** — Eneas avtal har tystnadsplikt (punkt 6). CompCare bör dessutom nämna att uppladdade dokument behandlas i enlighet med GDPR och raderas efter avslutad granskning.

6. **Uppdatera plan.md** — Den nuvarande plan.md i `.lovable/` reflekterar den gamla planen och bör uppdateras.

## Reviderad plan

### 1. Introduktionssektion ovanför formuläret
Före upload-fälten, en visuellt avgränsad sektion med:
- **Rubrik**: "Så fungerar tjänsten"
- **4-stegs processguide** (horisontell desktop, vertikal mobil): Ladda upp → Analys → Rapport → No cure, no pay
- **Info-box** med ShieldCheck-ikon: "Ingen risk — vi tar bara betalt om vi hittar pengar. 25 % av identifierat belopp."

### 2. Avtalstexten i dialogen — 7 punkter
1. Kunden ger CompCare rätt att granska insända fakturor och tidrapporter.
2. CompCare åtar sig att revidera materialet för att identifiera avvikelser.
3. Arvodet är 25 % av identifierat avvikelsebelopp. Moms tillkommer.
4. "No cure – no pay" — tjänsten är kostnadsfri om inga avvikelser påvisas.
5. Avtalet avslutas automatiskt vid slutrapport.
6. CompCare har tystnadsplikt avseende alla mottagna uppgifter.
7. **Ny punkt**: Uppladdade dokument behandlas enligt GDPR och raderas efter avslutad granskning.

Inkludera CompCare-bolagsuppgifter som platshållare överst, och visa inloggad användares e-post som avtalstecknande part.

### 3. PDF-avtal
Generera `compcare_granskningsavtal.pdf` med samma 7 punkter, CompCare-branding, platshållare för kundnamn. Lägg till nedladdningslänk i dialogen.

### 4. Uppdatera plan.md
Synka `.lovable/plan.md` med aktuell status.

## Tekniska detaljer
- Alla UI-ändringar i `src/pages/consultant/FakturakontrollNy.tsx`
- Nya Lucide-imports: `BarChart3`, `ShieldCheck`, `HandCoins`, `FileOutput`, `Download`
- PDF genereras med reportlab, visuell QA genomförs
- Inga ändringar på `Index.tsx`

