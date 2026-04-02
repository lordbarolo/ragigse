

## Plan: Integrera den uppladdade bilden i Sektion 2

### Sammanfattning
Byta ut den nuvarande `dashboard-phone.png`-bilden i sektion 2 ("Din nästa löneförhandling börjar här") mot den nya uppladdade bilden (hand som håller mobil). Bilden ska smälta in sömlöst med sektionens lavendel-bakgrund genom mjuka gradient-masker och en subtil glöd bakom motivet.

### Vad som ändras

**1. Kopiera den nya bilden till projektet**
- Kopiera `user-uploads://ChatGPT_Image_3_apr._2026_00_00_48.png` till `src/assets/hand-phone.png`
- Importera den i `SalaryCheck.tsx` istället för `dashboard-phone.png`

**2. Uppdatera bildkolumnen i sektion 2** (`SalaryCheck.tsx`, rad 155-171)
- Ersätt nuvarande `<img>` och sparkle-SVG:erna med den nya bilden
- Applicera en CSS `mask-image` med radiell gradient för att mjukt tona ut kanterna mot bakgrunden (inga hårda kanter)
- Lägg till en subtil radiell glöd (`div` med `bg-radial-gradient` i lila/lavendel) bakom bilden för premium-känsla
- Sätt `object-contain` och begränsa höjd till `max-h-[600px]`
- Ta bort sparkle-SVG:erna (de konkurrerar visuellt med den nya, mer detaljerade bilden)

**3. Responsiv layout**
- Desktop (`md:`): Behåll grid `md:grid-cols-[1fr_1.2fr]`, bild till höger, text till vänster (oförändrat)
- Mobil: Bilden visas under texten med mindre storlek (`max-h-[400px]`), centrerad, med samma fade-effekt

**4. Ingen förändring av text eller copy**
- All befintlig text, bullet points och CTA-knapp behålls exakt som de är

### Tekniska detaljer

```text
Sektion 2 layout (desktop):
┌──────────────────────────────────────────────┐
│  bg: rgb(205, 191, 213)                      │
│  ┌─────────────┐  ┌────────────────┐         │
│  │  Text        │  │  [radial glow] │         │
│  │  Rubrik      │  │   ┌──────┐     │         │
│  │  Brödtext    │  │   │ IMG  │     │         │
│  │  Bullets     │  │   │(fade)│     │         │
│  │  CTA         │  │   └──────┘     │         │
│  └─────────────┘  └────────────────┘         │
└──────────────────────────────────────────────┘
```

CSS mask for seamless edge fade:
```css
mask-image: radial-gradient(ellipse 80% 85% at center, black 55%, transparent 100%);
```

Subtle glow behind image:
```css
background: radial-gradient(circle, rgba(180, 160, 210, 0.5), transparent 70%);
filter: blur(40px);
```

