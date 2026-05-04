## Mål
Flödesmarkeraren ska börja i höjd med rubriken "Ersättningsjämförelse" (regional comparison-sektionen) och följa med vid scroll uppåt tills den når sin nuvarande vertikalt centrerade position — där den sedan stannar (sticky).

## Ändringar

**Fil: `src/components/report/ReportFlowIndicator.tsx`**

1. Lägg till en `anchorId` prop (t.ex. `"flow-regional"`) som anger vilket sektions-element överkanten ska linjera mot initialt.
2. Lägg till lokal state `topPx` (number) som styr `top`-positionen i px.
3. I en `useEffect` med scroll/resize-listener:
   - Hämta ankarelementets `getBoundingClientRect().top` (relativt viewport).
   - Beräkna minsta tillåtna top = vertikalt centrerat läge: `(window.innerHeight - indicatorHeight) / 2` (mät indikatorns höjd via ref).
   - `topPx = Math.max(minCenterTop, anchorTop)` — dvs följ ankaret nedåt på sidan men aldrig högre upp än centrum.
4. Byt ut `top-1/2 -translate-y-1/2` mot inline-style `style={{ top: topPx }}` och behåll `fixed left-0 z-30`. Lägg till `transition-[top]` för mjukare övergång (kort duration, t.ex. 150ms) eller hoppa över transition för att undvika lag vid scroll.
5. Använd `requestAnimationFrame` för att throttla scroll-handlern.

**Fil: `src/pages/Report.tsx`**

- Skicka `anchorId="flow-regional"` till `<ReportFlowIndicator />`.

## Edge cases
- Om ankarelementet inte finns (annan rapport-variant): fall tillbaka till nuvarande centrerade beteende.
- Vid mycket korta viewports där indikatorn är högre än fönstret: clamp till `top: 16`.
- Mobil (`hidden lg:block`) påverkas inte.
