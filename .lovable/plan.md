## Mål
CTA-bannern "Redo att ta kontroll?" (LandingV2.tsx, rad 426) använder idag en platt mörklila bakgrund (`bg-[#1a1545]`). Den ska få exakt samma visuella bakgrund som hero-sektionen högst upp på sidan: gradient + två radiella ljus-overlays + ett subtilt grid-mönster.

## Ändring
I `src/pages/demo/LandingV2.tsx` byts CTA-banner-blocket (rad 425–437) ut mot en variant som:

1. Använder `relative overflow-hidden` på wrappern (samma rundade hörn och spacing behålls).
2. Lägger in fyra absoluta bakgrundslager identiska med hero (rad 294–319):
   - Bas-gradient: `bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070]`
   - Stort radiellt ljus uppe till höger (lila glow, 1000×900px)
   - Mindre radiellt highlight uppe till höger (520×600px)
   - Grid-mönster med `opacity-5` (vita linjer var 40:e px)
3. Innehåll (rubrik, paragraf, knappar) wrappas i `relative z-10` så det alltid ligger ovanpå bakgrundslagren.

Inga andra sektioner, färger eller text ändras. Knapparna behåller sin lila/transparenta styling som matchar bra mot den nya bakgrunden (precis som CTA-knappen i hero).

## Resultat
CTA-bannern får samma djup, ljusspel och rutnät som hero-sektionen — visuellt sammanhållen ram runt sidan med två "speglande" mörka ytor i topp och botten.
