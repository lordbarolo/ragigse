# Automatisk SEO-uppföljning + färskhetsstämpel

Två delar som hänger ihop: ett eget schemalagt jobb som kontrollerar sidornas SEO-hygien och loggar resultatet, samt en "sist uppdaterad"-signal på rollsidor och guider som drivs av data i stället för hårdkodade datum.

Idag står `const LAST_UPDATED = "2026-01-15"` hårdkodat i fem rapportsidor (`LakareSpecialtyReport`, `SjukskoterskaReport`, `AnestesiReport`, `AllmanmedicinReport`, `BollnasAllmanspecialistReport`) och styr både synligt datum och `dateModified` i JSON-LD. Guiderna har eget `lastUpdated` i `src/data/guides.ts`. Sitemapen sätter bara `lastmod` för guider.

## Del 1 — Färskhetsregister (ersätter hårdkodade datum)

Ett register som håller ett datum per innehållsyta, med spårbar orsak till datumet:

- Nytt `src/data/contentFreshness.ts`: en post per sidnyckel (rollslug/guide) med `updatedAt`, `reason` ("SKR-ramavtal v1.7 2026-01-01", "priser justerade", "innehåll utökat") och den avtalsversion sidan bygger på.
- Rapportsidorna läser registret via en hjälpfunktion i stället för sin lokala `LAST_UPDATED`-konstant. Samma värde går till `TLDRBox` och till `buildRoleReportSchemas({ dateModified })`, så publikt datum och JSON-LD kan inte glida isär.
- `scripts/generate-sitemap.ts` läser registret och sätter `lastmod` för alla rapportsidor, inte bara guider.
- Ingen `lastmod` sätts från byggtid eller dagens datum — bara från registrets faktiska innehållsdatum.

Synligt resultat på sidan: befintlig rad "Senast uppdaterad …" behålls i samma design, men får rätt datum per sida och en kort källhänvisning till avtalsversionen.

## Del 2 — Eget skanningsjobb

En egen kontroll som körs regelbundet och sparar historik, så du kan se när datan senast verifierades:

- Ny tabell `seo_scan_runs` (tidpunkt, antal kontrollerade sidor, antal fel, antal varningar) och `seo_scan_findings` (sökväg, kontroll, allvarlighet, meddelande). RLS: bara admin läser, `service_role` skriver.
- Ny publik-men-nyckelskyddad route `src/routes/api/public/seo-scan.ts` som hämtar varje sitemap-URL och kontrollerar: HTTP-status, `<title>` finns och är under 60 tecken, meta description finns och under 160, exakt en `<h1>`, self-referencing canonical, `og:title`/`og:description`, giltig JSON-LD, samt att `dateModified` matchar registret från Del 1.
- Anropet kräver en delad hemlighet i header (verifieras i handlern) så att endast schemaläggaren kan trigga körningen.
- `pg_cron`-jobb som anropar routen en gång per vecka mot den stabila projekt-URL:en.

## Vad du ser efteråt

- Varje rollsida och guide visar ett datum som speglar när innehållet faktiskt ändrades, och samma datum finns i `dateModified` och i sitemapens `lastmod`.
- En veckovis körning ger en spårbar historik i databasen över SEO-hygien; avvikelser blir rader du kan hämta med en fråga.

## Utanför scope

- Ingen ändring av sidornas layout, copy eller prislogik.
- Ingen ändring av Lovables egen SEO-panel — den kör separat och triggas manuellt.
- Ingen admin-vy och inga notismail i det här steget (du valde publikt datum som synlig signal); enkelt att lägga till senare ovanpå tabellerna.

## Tekniska detaljer

- Register: `getContentFreshness(key)` returnerar `{ updatedAt, reason, contractVersion }`; sidor och sitemap-script delar samma modul, som är importerbar från både SSR och Node-scriptet.
- Skanner: `fetch` mot egna URL:er, HTML-parsning med regex/lättviktig extraktion (inga Node-only-paket, kompatibelt med Worker-runtime).
- Migration innehåller `CREATE TABLE` + `GRANT` (`service_role` full, `authenticated` select via admin-policy) + `ENABLE ROW LEVEL SECURITY` + policyer som använder befintlig `has_role(auth.uid(), 'admin')`.
- Hemligheten för routen läggs till som projekt-secret och läses i handlern via `process.env`.
