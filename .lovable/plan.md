
Mål

Gör demosidan öppningsbar i preview utan att användaren fastnar på `/index`, samtidigt som sidan förblir preview-only.

Orsaksbedömning

- `BrowserRouter` används redan korrekt i `src/App.tsx`.
- Rutten `/dev/demo` finns redan definierad och pekar på `DemoLanding`.
- Jag hittar ingen appkod som omdirigerar `/dev/demo` till `/index`, och appen har ingen egen `/index`-route.
- Det pekar på att problemet sannolikt ligger i preview-navigeringen för just `/dev/...`, inte i själva demo-komponenten.

Plan

1. Lägg till en preview-säker aliasrutt
   - Lägg till en enklare route, t.ex. `/demo`, som renderar `DemoLanding`.
   - Behåll gärna `/dev/demo` som legacy-alias, men sluta förlita oss på den som enda ingång.

2. Gör lösningen preview-only
   - Gata demo-rutterna så att de fungerar i preview/dev men visar `NotFound` i publicerad produktion.
   - Då respekterar vi ditt tidigare val: “bara preview”.

3. Lägg till en intern öppningsväg i appen
   - Lägg en liten DEV-only länk/knapp på en befintlig sida du redan kan nå i preview, t.ex. startsidan.
   - Den ska navigera internt via React Router till demon, så du slipper skriva en problematisk path manuellt.

4. Säkerställ att demon fortsatt använder enkätens rollstruktur
   - När routingen justeras, passa på att flytta de delade roll-/specialiseringsdefinitionerna till en gemensam modul.
   - Då använder `Survey.tsx` och `MarketSearchBox.tsx` exakt samma källa framåt.

5. Verifiering efter implementation
   - Bekräfta att internlänken från startsidan öppnar demon i preview.
   - Bekräfta att `/demo` fungerar i preview.
   - Bekräfta att demo-rutten inte exponeras i publicerad miljö.

Tekniska detaljer

- Berörda filer:
  - `src/App.tsx`
  - troligen `src/pages/consultant/SalaryCheck.tsx` eller `src/pages/Index.tsx` för en preview-only länk
  - ev. en ny delad rollkonfig som används av både `Survey.tsx` och `src/components/demo/MarketSearchBox.tsx`
- Ingen backend- eller databashantering behövs för detta.
- Rekommenderad routing:
  - `/demo` → `DemoLanding` i preview/dev
  - `/dev/demo` → samma komponent eller redirect till `/demo` i preview/dev
  - båda → `NotFound` i produktion

Varför detta är rätt fix

Det angriper problemet på rätt nivå: din demo verkar fungera som komponent, men öppningen via previewns path-hantering för `/dev/demo` verkar vara opålitlig. Därför bör vi göra åtkomsten robust utan att göra sidan publik.
