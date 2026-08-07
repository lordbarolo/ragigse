# SEO- och agent-analys av vardbemanning.ai

Kontrollerat mot livedomänen (renderad HTML), `public/sitemap.xml`, `public/robots.txt`,
`public/llms.txt`, `public/ai.txt` samt route-filerna. Nedan är fynden och en
åtgärdsplan. Ingen kod är ändrad.

## Vad som fungerar

- Sidorna prerenderas: titel, description, canonical, og-taggar och `<h1>` finns i HTML för `/`, `/faktasidor` och rapportsidorna.
- Canonical pekar rätt (`https://vardbemanning.ai/...`) och `robots` är `index, follow` på publika sidor.
- Gamla programmatiska URL:er 301:ar korrekt (`/rapport/ssk` → `/rapport/sjukskoterska`, `/timpris/*`, `/region/*`).
- robots.txt blockerar inget publikt, listar sitemap och har egna regler för AI-crawlers.
- Rapportsidorna har JSON-LD (Article/Dataset/FAQ + Organization).

## Fynd som hämmar synligheten

### 1. Dubbla `<title>`-taggar på varje sida (hög)
Varje renderad sida innehåller två `<title>`: en från route-`head()`/root och en från
`react-helmet-async` i sidkomponenten. Två parallella metadata-mekanismer krockar; Google
väljer själv vilken som gäller och risken för fel titel i SERP är reell. Samma dubblering
gäller description/og-taggar.

### 2. llms.txt pekar agenter mot noindex-sidor utan JSON-LD (hög)
`llms.txt` säger att `/lon/{specialty}/{city}` är den strukturerade kunskapsendpointen med
`Schema.org/Occupation`. Verkligheten: `/lon/radiolog/umea` är `noindex, follow`, saknar
JSON-LD helt och har ~295 ord. Agenter som följer llms.txt landar alltså på sidor som varken
får indexeras eller kan parsas. `ai.txt` beskriver dessutom en gammal sidkarta
(`/kampanj/*` som indexerbara, `/rapport/anestesisjukskoterska` som enda rapport).

### 3. llms.txt följer inte formatet (medel)
Ingen sammanfattande blockquote och inga länklistor (`- [Titel](/path): beskrivning`). Filen är
prosa om datapolicy i stället för en karta över sidorna, vilket är exakt det agenter läser den för.

### 4. Prisdatan är inlåst bakom konto (medel — produktbeslut)
`/faktasidor` maskerar priser för utloggade. Det är medvetet, men konsekvensen är att sidan har
lite unikt indexerbart innehåll och att den enda crawlbara prisdatan finns i de 16
rapportsidorna.

### 5. Tunn URL-yta och inget redaktionellt innehåll (medel)
20 URL:er i sitemapen. Ingen guide-/artikelyta alls, inga region- eller ortsidor som får
indexeras. Sökintentioner som "hyrläkare lön 2026", "vad tjänar en hyrsjuksköterska",
"timpris IVA-sjuksköterska Stockholm" har ingen landningssida. Utan inkommande länkar är
långstjärtat innehåll den realistiska vägen in.

### 6. Sitemapen är helt statisk och underhålls manuellt (låg)
`scripts/generate-sitemap.ts` har hårdkodade slugs med kommentaren "keep in sync". Nya
rapportsidor glöms bort. Alias-slugarna hanteras redan via 301 vilket är rätt.

### 7. Övrigt (låg)
- Ingen `og:image` per sida — alla delningar ser identiska ut (samma `vardbemanning-og.png`).
- `agent_content`-fyndet om generisk länktext ("Läs mer") och kort alt-text på logotypen ligger kvar.
- Ingen `BreadcrumbList` på rapportsidorna, som ligger två nivåer ner.

## Åtgärdsplan

**Steg 1 — Rensa metadata-dubbletten (ingen visuell förändring)**
Välj route-`head()` som enda mekanism. Flytta titel/description/canonical/og/JSON-LD från
`<SEO>`-komponenten i sidkomponenterna upp i respektive route-fil, och ta bort
`HelmetProvider`/`<SEO>` när alla sidor är migrerade. Görs sida för sida med verifiering av
renderad HTML (exakt en `<title>`, en canonical) efter varje grupp.

**Steg 2 — Bestäm `/lon/*`-ytans status**
Antingen (a) gör dem indexerbara: ta bort `noindex`, lägg in `Occupation`-JSON-LD, unik
`head()` per roll/ort och tillräckligt innehåll, och lägg dem i sitemapen — eller (b) ta bort
dem ur `llms.txt`/`ai.txt` och peka agenter mot rapportsidorna + `agent-index.json` i stället.
Kräver ditt val, se frågan nedan.

**Steg 3 — Skriv om llms.txt till spec + uppdatera ai.txt**
H1, blockquote-sammanfattning och `## Sidor`-sektion med länklista över alla 20 live-URL:er
plus `openapi.json` och `agent-index.json`. `ai.txt` uppdateras så listan matchar verkliga
rutter (inga `/kampanj/*` som indexerbara).

**Steg 4 — Gör sitemap-generatorn datadriven**
Läs slugs från `src/data/doctorSpecialtyReports.ts` och från route-filerna i
`src/routes/rapport/` i stället för den hårdkodade listan, så nya sidor kommer med automatiskt.
`<lastmod>` utelämnas fortsatt (ingen sidspecifik tidsstämpel finns).

**Steg 5 — Bygg innehållsyta (störst effekt, kräver ditt beslut om omfattning)**
Föreslagen start: tre guider under `/guide/` — `hyrlakare-lon-2026`,
`hyrsjukskoterska-lon-2026`, `sa-fungerar-skr-ramavtalet` — med tabeller per zon, FAQ-schema och
interna länkar till rapportsidorna. Ingen förklaring av uträkningsmodellen (befintlig regel).

**Steg 6 — Småfixar**
Beskrivande länktext i stället för "Läs mer", alt-text "vårdbemanning.ai logotyp",
`BreadcrumbList`-JSON-LD på rapportsidorna, och per-sida `og:image` om du vill ha unika
delningsbilder.

## Tekniska detaljer

- Metadata-migreringen berör `src/components/SEO.tsx` (tas bort sist), 21 sidkomponenter och motsvarande route-filer i `src/routes/`.
- `head()` får inte innehålla canonical i `__root.tsx` — canonical ligger bara på leaf-routes.
- Ingen layout, styling eller copy ändras i steg 1, 4 och 6.

## Fråga innan bygge

`/lon/{roll}/{ort}` — ska den ytan öppnas för indexering (många sidor, kräver unikt innehåll per
kombination) eller ska agent-filerna sluta hänvisa till den?
