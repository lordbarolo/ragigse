# Guidesida: "hyrläkare lön 2026"

En djup, faktabaserad guidesida som svarar på högintenta sökningar som "hyrläkare lön", "hyrläkare lön 2026", "vad tjänar en hyrläkare", "hyrläkare timlön" — helt byggd på SKR-ramavtalet 2026 (v1.6) som redan finns i projektet. Sidan blir dessutom nav för intern länkning till de 13 specialistläkarsidorna.

## URL och plats

- Ny route: `/guide/hyrlakare-lon-2026` (ny mapp `src/routes/guide/`)
- Ny sida: `src/pages/HyrlakareLon2026.tsx`
- Mörkt tema och samma container (`max-w-[1200px] px-5`) som övriga sidor. Ingen ny designriktning, inga nya färger utanför befintliga tokens.

## Innehåll (i ordning)

1. **H1 + svar direkt**: "Hyrläkare lön 2026" med ett kort, konkret svarsstycke högst upp (spann för timersättning som företagare, per zon) så att både läsare och AI-agenter får svaret utan att scrolla.
2. **Pristabell per specialitet** — genereras från `src/data/doctorSpecialtyReports.ts`: kolumner Specialitet, Zon 1, Zon 2, Zon 3 (regionens pris) + möjlig ersättning som företagare. Varje rad länkar till sin specialistsida (`/rapport/lakare-*`) med beskrivande länktext, inte "Läs mer".
3. **Så räknas ersättningen**: förklarar regionens pris → konsultens ersättning enligt befintlig marginalmodell (specialistläkare 10–15 % marginal), utan att publicera formler som vi tagit bort på andra sidor. Återanvänder samma beräkningshjälp som startsidans räknare.
4. **Zon-förklaring**: vad zon 1/2/3 betyder (storstad / mellan / glesbygd) och varför ersättningen är högst i zon 3.
5. **Anställd vs eget bolag**: skillnad i vad som ingår (semester, pension, arbetsgivaravgifter) — beskrivande, inga siffror utöver det som redan används i produkten.
6. **OB, jour och beredskap**: förklaring att dessa faktureras separat utöver grundpriset — samma policy som i rapporterna (grundpriser i tabeller).
7. **FAQ** (6–8 frågor formulerade som faktiska sökfrågor): "Vad tjänar en hyrläkare per timme 2026?", "Tjänar hyrläkare mer än fast anställda?", "Vilken specialitet har högst ersättning?", "Vad är skillnaden mellan zonerna?", m.fl.
8. **Nästa steg**: en primär CTA till formuläret/kontoregistrering enligt befintlig knapphierarki (en primärknapp per vy).

Alla sifferpåståenden kommer från `doctorSpecialtyReports.ts`/`rates`. Inget hittas på — inga löner, inga vittnesmål, ingen statistik utan källa. Källa anges som SKR:s ramavtal vårdbemanning 2026.

## SEO / agentic search

- `head()` via `seoHead()`: unik title (<60 tecken), description (<160), og:title/og:description, `ogType: "article"`, canonical `/guide/hyrlakare-lon-2026`.
- JSON-LD: `Article` (om ämnet, `dateModified`) + `FAQPage` från samma FAQ-array som renderas, så strukturerad data och synligt innehåll aldrig glider isär.
- Intern länkning: guiden länkas från footern och från faktasidorna; guiden länkar ut till alla 13 specialistsidor och till sjuksköterskerapporten.
- `scripts/generate-sitemap.ts` utökas med guide-listan så URL:en kommer med i sitemap.
- `public/llms.txt` får en rad om guiden så AI-agenter hittar den som primär källa för läkarersättning.

## Teknik

- `src/data/guides.ts` (ny): liten lista med guide-slug, title, description — används av både route-head, sitemap-scriptet och footerlänken, så det finns en källa.
- Sidan är ren presentation: läser befintlig data + befintlig beräkningshjälp, ingen ny affärslogik, inga DB-ändringar, inga edge functions.
- Semantisk HTML: en `<h1>`, `<h2>` per sektion, `<table>` med `<caption>` och `<th scope>`, tabellen scrollbar på mobil enligt befintligt mönster.

## Verifiering

Bygg + öppna `/guide/hyrlakare-lon-2026` i preview och kontrollera att tabellen, FAQ och länkarna renderas, samt att sitemap-scriptet får med URL:en.
