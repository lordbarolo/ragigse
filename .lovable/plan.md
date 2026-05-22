## Mål
Byt ut nuvarande mörka hero på `/` mot en Anthropic-inspirerad variant:
- Cream/off-white bakgrund (`#EFECE3` ungefär — samma varma off-white som anthropic.com).
- Svart, mycket tung sans-serif rubrik (font-weight 700–800, tight tracking, vänsterställd på mobil).
- Två nyckelord i rubriken understrukna (Anthropic-signaturen).
- Lugn, kort ingress i mörkgrå.
- InlineTerminalSurvey kvar nedanför som CTA-yta — men på cream-bakgrund istället för mörk.

## Scope (endast frontend)
Bara hero-sektionen i `src/pages/Index.tsx`. Inga ändringar i:
- InlineTerminalSurvey-logik
- Pillars, Trust, Footer
- Nav (men nav-bakgrunden behöver matcha cream)
- Backend, RLS, edge functions

## Konkreta ändringar

**`src/pages/Index.tsx`**
1. Byt hero-section från `hero-dark` mörk gradient till cream bakgrund (`bg-[#EFECE3]`).
2. Ersätt nuvarande H1 ("Förhandla utifrån data, inte magkänsla") med Anthropic-stil:
   - Rubrik: **"Löneanalys och förhandlingsstöd för vårdens konsulter"**
   - "Löneanalys" och "förhandlingsstöd" får `underline underline-offset-[6px] decoration-[6px]`.
   - `text-5xl md:text-7xl font-extrabold tracking-tight leading-[1.05] text-black`.
3. Ingress: kortare, mörkgrå (`text-neutral-700`), behåller SKR-referensen.
4. Ta bort mesh-gradient/grid-overlays i hero.
5. Justera nav-bakgrund så den smälter in mot cream (transparent eller samma cream).
6. Gradient-fade i botten av hero tas bort (var till för mörk → background overgang).
7. Behåll `<InlineTerminalSurvey />` — den ligger redan på `bg-card` så den kontrasterar fint mot cream.

**Inga ändringar i `index.css` eller `tailwind.config.ts`** — använder Tailwind-klasser inline för cream-hexen (engångsfärg, ej design-token).

## Teknisk detalj
- Cream-hex `#EFECE3` matchar Anthropic visuellt; svart `text-black` (inte `text-foreground` här, vi vill ha exakt #000 mot cream).
- Mobile-first vänsterställd rubrik (`text-left`), centrerad från `md:` om så önskas — Anthropic kör vänsterställd även på desktop, vi gör samma.
- Behåll JSON-LD, SEO-meta, useTimeOnPage, trackEvent oförändrade.

## Acceptanskriterier
- Mobilvy (393px): cream bakgrund, tung svart rubrik, två ord understrukna, ingress + survey under.
- Desktop: samma cream bakgrund, rubriken klättrar inte över `~720px` bredd, vänsterställd.
- Inga mörka gradient-rester kvar i hero.
- Nav smälter in (ingen hård kant).
- Resten av sidan (Pillars, Trust, Footer) oförändrad.
