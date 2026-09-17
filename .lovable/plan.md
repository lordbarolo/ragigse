# FAS 3 — AI-avtalsgranskare på `/beta`

## Mål
Bygg ett publikt, mobilanpassat trestegsflöde för uppladdning, resultat och motbud utan inloggning eller lokal lagring av dokumentinnehåll.

## Genomförande
1. Skapa `src/routes/beta.tsx` med unik metadata och `robots: noindex,nofollow`.
2. Skapa isolerade beta-typer och API-klient i `src/lib/beta/*` med klientvalidering, filgräns 10 MB, base64-konvertering och svenska statusfel.
3. Bygg beta-komponenter för:
   - stegindikator och mörk sidram med vårdbemanning.ai-wordmark,
   - uppladdning/drag-and-drop eller inklistrad text,
   - analysprogress och manuellt kompletteringsformulär,
   - responsivt scorecard med SVG-mätare, antaganden, risker och maskerad sammanfattning,
   - redigerbart motbud, kopiering och lead-sparning.
4. Behåll allt tillstånd i React-minnet; dokumenttext sparas inte i webbläsarlagring.
5. Verifiera hela flödet i preview på desktop och 375 px, inklusive kopiering och lead-händelser i databasen.

## Tekniska avgränsningar
- Endast `src/routes/beta.tsx`, `src/components/beta/*`, `src/hooks/beta/*`, `src/lib/beta/*` och automatiskt genererad `src/routeTree.gen.ts` får ändras.
- Ingen publicering, ingen navigation eller sitemap ändras. Sitemap-generatorn använder en fast lista och tar därför inte automatiskt med `/beta`.
- Befintlig PostHog-wrapper accepterar inte beta-event utan ändring i delad kod; analytics-eventen hoppas därför över enligt instruktionen.
- Månadslön divideras med 165 i klienten innan den skickas som manuell timlön, vilket matchar serverns befintliga modell.

## Kontroll
- Typkontroll och bygge ska vara felfria.
- Sex skärmdumpar: tre steg i desktop och mobil.
- Databaskontroll att `copied`, `save_email` och vid valt samtycke `lead_opt_in` registreras.
- Säkerhetskontroll enligt change-protocol samt diffkontroll av tillåtna filer.
