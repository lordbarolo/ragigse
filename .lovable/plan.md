# Innehållsmodul: relaterade sidor & CTA per roll

Mål: varje rollsida (13 läkarspecialiteter, sjuksköterskerapporterna, allmänmedicin, anestesi och guiden) får ett återanvändbart block längst ner med beskrivande internlänkar till närliggande roller, guide och faktasidor — plus semantisk kontext i JSON-LD. Inget nytt i sidans övriga utformning; samma mörka kortstil som redan används på rapportsidorna.

## Vad som byggs

**1. Relationskarta (data)**
Ny fil `src/data/relatedContent.ts`:
- Grupper av roller som hör ihop (t.ex. akut/operation: anestesi + IVA + kardiolog; barn: barnmedicin + BUP + barnmorska; medicin: internmedicin, hematologi, njurmedicin, neurologi; psykiatri: psykiatri + BUP; övrigt: ÖNH, dermatolog, radiologi, ögon).
- Slug-listan läses ur `DOCTOR_SPECIALTY_REPORTS` + de kanoniska sjuksköterskerapporterna, så inget dubbellagras.
- Regel: 3–4 relaterade rollsidor per roll, alltid samma yrkesgrupp först, sedan närliggande grupp om det behövs för att fylla ut. Aldrig länk till sig själv, aldrig till noindex-sidor (`/lon/*`, `/kampanj/*`, alias-slugar).

**2. Modulen (UI)**
Ny komponent `src/components/report/RelateradeSidor.tsx`:
- Rubrik "Relaterade roller och underlag" i samma stil som befintliga sektionsrubriker.
- Kort med beskrivande länktext, ingen "Läs mer": t.ex. "Anestesiläkare – ramavtalspris och ersättning 2026" med kort undertext som nämner zonspann.
- Efter rollistan: 2 kontextlänkar — guiden `/guide/hyrlakare-lon-2026` (för läkarroller) och `/faktasidor` (prisöversikt alla roller).
- Sist en CTA-rad som återanvänder befintlig verktygsteaser-logik: personlig rapport `/?yrke=<prefillSlug>` och lönekoll `/?yrke=<prefillSlug>&fokus=lonekoll`. Ingen ny primärknapp — samma kortstil som idag.
- `trackEvent("related_link_clicked", { from, to, kind })` på klick, enligt projektets befintliga mönster.

**3. Semantisk kontext (JSON-LD)**
`src/lib/seo/roleReportSchema.ts` får ett valfritt fält `relatedPaths?: string[]` som mappas till `relatedLink` på Article-noden och en `ItemList` med de relaterade sidorna. Befintliga scheman ändras inte i övrigt; sidor som inte skickar fältet får identisk output som idag.

**4. Inkoppling**
Modulen renderas längst ner (efter Metod/Verktygsteaser) i:
- `src/pages/LakareSpecialtyReport.tsx` (täcker alla 13 specialiteter)
- `src/pages/SjukskoterskaReport.tsx`
- `src/pages/AnestesiReport.tsx`
- `src/pages/AllmanmedicinReport.tsx`
- `src/pages/HyrlakareLon2026.tsx` (guiden får rollistan, inte guide-länken till sig själv)

I `LakareSpecialtyReport` ersätter modulens CTA-del de två redan befintliga teaser-korten så att sidan inte får dubbla CTAs.

## Utanför scope
Inga ändringar av priser, marginalmodeller, hooks eller sitemap-logik (alla länkmål finns redan i sitemapen). Ingen ny route, ingen ändrad layout/typografi utanför det nya blocket.
