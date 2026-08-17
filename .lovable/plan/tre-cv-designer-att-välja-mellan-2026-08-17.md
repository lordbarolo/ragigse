# Tre CV-designer att välja mellan

Canva finns inte som koppling i plattformen, så mallarna byggs och lagras i din egen databas. Det passar också ditt önskemål: kopplingen ska bara ske en gång — här sker den aldrig, designerna bor direkt hos oss.

Du återkommer med tre CV:n. Planen bygger därför infrastrukturen nu med tre startdesigner (Klassisk / Modern / Kompakt) som jag sedan finkalibrerar mot dina tre filer när de kommer — utan att röra någon logik i CV-assistenten.

## Vad användaren får

- Tre valbara designer i CV-assistenten, alltid tillgängliga.
- Valet syns som tre små förhandsvisningar (miniatyr av layouten) ovanför nedladdningsknapparna.
- Vald design används i både PDF och Word.
- Valet sparas per användare, så nästa besök kommer ihåg designen.

## De tre startdesignerna

| Design | Karaktär |
| --- | --- |
| Klassisk | Serif-rubriker, tunn linje under sektioner, generösa marginaler, helsvart typografi |
| Modern | Sans-serif, accentfärg i rubriker och sektionslinjer, namn i stor vikt, luftig rytm |
| Kompakt | Tät radavstånd och mindre grader för att pressa in mer på en sida, versala minirubriker |

Alla tre förblir ATS-läsbara: text är verklig text, inga bilder eller flerkolumnsflöden som förstör inläsning.

## Teknisk beskrivning

**Databas — ny tabell `public.cv_templates`**
- `id`, `slug` (`klassisk`/`modern`/`kompakt`), `name`, `description`, `sort_order`, `is_active`, `design` (jsonb med typografi, grader, radavstånd, färg, marginaler, sektionslinje), `created_at`, `updated_at`.
- GRANT `SELECT` till `anon` + `authenticated`, `ALL` till `service_role`. RLS på med en läspolicy för aktiva mallar; ingen skrivpolicy (endast admin via service_role/migration).
- Migrationen innehåller `INSERT` för de tre mallarna så de finns direkt.

**Val per användare**
- Ny kolumn `cv_template_slug text` på `cv_optimizations` (default `klassisk`), sparas när användaren byter design. Ingen ändring av befintliga fält eller AI-flöde.

**Rendering**
- `src/lib/cvExport.ts` byter från hårdkodade stilar till att ta emot ett `design`-objekt (font, grader, radavstånd, accentfärg, marginaler) i både `downloadCvAsDocx` och `downloadCvAsPdf`. Markdown-parsern rörs inte.
- `src/lib/cvTemplates.functions.ts`: server function som läser aktiva mallar; hämtas via `useQuery` i kortet, med en liten lokal fallback så exporten aldrig blockeras av nätfel.

**UI**
- `src/components/profile/CvTemplatePicker.tsx`: tre klickbara kort med CSS-ritad miniatyr (ingen bildfil), tydlig markering av valt, kompakta knappar enligt husstandard.
- `src/components/profile/CvAssistantCard.tsx`: pickern placeras direkt ovanför nedladdningsknapparna och skickar vald design vidare till exportfunktionerna.

**När dina tre CV:n kommer**
Jag läser dem, plockar ut typografi, grader, färger och marginaler och uppdaterar `design`-jsonen för respektive mall via en migration. Ingen kodändring behövs då — bara data.

## Utanför scope

Ingen ändring av CV-assistentens prompts, modeller, frågeflöde eller versionshistorik. Ingen ändring av profilsidans övriga sektioner.
