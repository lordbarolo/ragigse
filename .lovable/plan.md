## Mål
Bygg en isolerad demo-sida som återskapar exakt utformningen från Tailwind UI-hjälten "With phone mockup" (ljust tema, prickigt rutnät i bakgrunden, två-kolumns layout med text vänster och lutande telefon-mockup höger). Ingen toppnav. Hero-innehållet byts till CompCare-copy och telefonens skärm renderar vårt befintliga `InlineTerminalSurvey`.

## Route & filer
- Ny route: `/demo/hero-tailwind` (registreras i `src/App.tsx` tillsammans med övriga `/demo/*`).
- Ny sida: `src/pages/demo/HeroTailwind.tsx`.
- Ny komponent: `src/components/demo/PhoneMockup.tsx` — ren presentational wrapper (telefon-frame i SVG/CSS) som tar `children` och renderar innehållet inuti skärmen med korrekt clipping och rundade hörn.
- Återanvänder: `InlineTerminalSurvey` (befintlig) som `children` i telefonen.

## Visuell spec (matchar bilden 1:1)
- Bakgrund: vit `#ffffff` med subtilt prickigt rutnät (radial-gradient dots, `rgba(15,23,42,0.08)`, ~24px grid) som tonar ut mot kanterna via mask-image.
- Container: `max-w-7xl mx-auto px-6 lg:px-8`, hero-padding `pt-24 pb-32 lg:pt-32 lg:pb-40`.
- Grid: `lg:grid-cols-2 gap-12 items-center`. Text vänster, telefon höger.
- Vänster kolumn:
  - Pill-badge överst: rundad full, vit bakgrund, tunn grå border, två segment delade av vertikal linje. Vänster: violett text "Vi rekryterar inte". Höger: grå text "Läs mer →". (CompCare-anpassning av "We're hiring · See open positions").
  - H1: `text-5xl lg:text-6xl font-bold tracking-tight text-slate-900` — "Ett bättre sätt att förhandla din ersättning".
  - Ingress: `text-lg text-slate-600 max-w-xl` — kort CompCare-pitch (neutral ton, inga värdeord, ingen peer-jämförelse).
  - CTA-rad: primärknapp violett `bg-[#4f46e5] hover:bg-[#4338ca] text-white text-sm font-semibold px-6 py-3 rounded-md` "Kom igång" + textlänk `Läs mer →` i mörk slate. Följer button-standard (kompakt, ej `lg`, ej `w-full`).
- Höger kolumn (telefon):
  - Telefon-frame: ~`w-[320px] h-[640px]`, mörk `#0f172a` chassi, rundade hörn `rounded-[3rem]`, tunn inre border, notch upptill, sidoknappar (vänster vol, höger power) som tunna avlånga rektanglar.
  - Skärm-innehåll: vit bakgrund, `rounded-[2.5rem]` clipping, padding `p-4`. Renderar `<InlineTerminalSurvey />` skalad så att hero-formuläret får plats (CSS `transform: scale(0.75)` + `transform-origin: top center` på en wrapper, höjd kompenseras).
  - Liten lutning: `rotate-[2deg]` + mjuk skugga `shadow-2xl` för att matcha bildens perspektiv.
- Responsivt: under `lg` staplas kolumnerna; telefonen centreras under texten med `mx-auto`, ingen rotation på mobil.

## Innehåll (CompCare-copy, neutralt)
- Badge: "Vi rekryterar inte | Vi visar bara vad ramavtalen säger →"
- H1: "Ett bättre sätt att förhandla din ersättning"
- Ingress: "Jämför din nuvarande ersättning mot SKR:s ramavtal på under 60 sekunder. Neutral analys, inga säljsamtal."
- Primär CTA: "Kom igång" (scrollar fokus till telefonens formulär på mobil, eller fokuserar första input på desktop).
- Sekundär: "Så funkar det →" (länk till `/sa-funkar-det` om finns, annars anchor).

## Vad som INTE byggs
- Ingen toppnav (per ditt val).
- Ingen dark mode-toggle, inga "Get the code"-element från originalet.
- Befintliga `/` (LandingV2) rörs inte.
- Inga ändringar i `InlineTerminalSurvey` — den används som den är.

## Tekniska detaljer
- Färger inline (hex) tillåts här eftersom det är en visuell 1:1-klon av extern referens; designtokens kunde användas men violett `#4f46e5` matchar referensen direkt. Övriga ytor använder Tailwinds slate-skala.
- Inga nya beroenden.
- SEO: `<SEO>` med `noindex` (demo-sida).
- PostHog: ingen ny tracking; sidan är en visuell prototyp.

## Acceptanskriterier
1. `/demo/hero-tailwind` renderar utan errors.
2. Desktop matchar referensbilden visuellt (badge, H1, ingress, knappar, prickigt rutnät, lutande telefon höger).
3. Telefon-mockupen visar `InlineTerminalSurvey` korrekt klippt inom skärmen.
4. Mobilvyn staplar kolumnerna utan horisontell scroll.
5. Inga ändringar i `/` eller andra produktionssidor.