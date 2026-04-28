## Mål
Ersätt nuvarande `AgentNetwork` (12 spretiga noder, ständigt pulserande linjer och floatande satelliter) med en lugnare, mer fokuserad agentisk animation till höger i hero — som **rör sig mycket initialt** och sedan **lugnar ner sig** till ett stilla, andande sluttillstånd.

## Designkoncept: "Constellation Settle"
En central CompCare-nod med **6 satellitnoder** (istället för 12) i en ren cirkulär formation. Animationen har tre faser:

1. **0–1.2s — Boot:** Satelliter flyger in från slumpade positioner utanför viewporten, linjer ritas en efter en från center, datapaket skjuts ut snabbt mot varje nod (stagger).
2. **1.2–2.5s — Settle:** Noderna studsar mjukt på plats (spring easing), linjerna bleknar in till låg opacitet, ett sista "broadcast"-pulse går ut från center.
3. **2.5s+ — Idle (lugnt sluttillstånd):** Bara mycket subtila tecken på liv:
   - Center-noden andas långsamt (8s scale 1.0 → 1.04 → 1.0).
   - En enda långsam datapuls vandrar från center till en slumpad satellit var ~4s (inte 0.6s som nu).
   - Halos är statiska/mycket dämpade — ingen konstant pulsering på alla noder samtidigt.
   - Inga floatande noder. Inga blinkande linjer.

Resultat: imponerande "den vaknar till liv"-känsla första 2.5 sekunderna, sedan en stilla, professionell konstellation som inte stjäl uppmärksamhet från hero-copy och formuläret.

## Tekniska ändringar

**Fil:** `src/components/landing/AgentNetwork.tsx` (skrivs om)
- Reducera `NODES` från 12 → 6, jämnt fördelade i en cirkel (radie ~38%).
- Ta bort `agent-float` och `agent-halo` på alla satelliter (orsaken till "spretigheten").
- Lägg till `useState` för `phase: 'boot' | 'settle' | 'idle'` styrd av `setTimeout`.
- Boot-fas: satelliter renderas med `transform: translate(randomX, randomY) scale(0)` och animeras till slutposition via CSS-transition (cubic-bezier spring, 900ms stagger 120ms).
- Linjer ritas med `stroke-dasharray` + animerad `stroke-dashoffset` (draw-in effekt) under boot.
- Idle-fas: ett `setInterval` på **4000ms** (inte 600ms) väljer en nod för en mjuk datapuls.
- Center-nod får långsam `breathe` keyframe (8s).

**Fil:** `src/index.css`
- Ta bort/ersätt `agent-float` och `agent-halo` keyframes (kvarstår nu som källa till oroligheten).
- Lägg till nya keyframes:
  - `agent-boot-in` — scale + translate spring för satelliter.
  - `agent-line-draw` — stroke-dashoffset från full till 0 (line draw-in).
  - `agent-breathe` — 8s mycket subtil scale 1 → 1.04 → 1 för center.
  - `agent-broadcast` — engångs ring-pulse runt center vid övergång boot → idle.

**Fil:** `src/pages/demo/LandingV2.tsx`
- Ingen layoutändring — komponenten sitter redan korrekt i höger kolumn (rad 207–210).

## Vad användaren kommer märka
- Tydlig "wow"-moment vid sidladdning (första ~2.5s).
- Lugn, ren konstellation efter det — inga 12 ikoner som svävar och pulserar samtidigt.
- Center-noden fortsätter andas så det inte ser "fruset" ut.
- Endast en datapuls åt gången, glesare intervall — fokus stannar på hero-texten.
