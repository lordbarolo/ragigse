

## Plan: Förifyld exempelvy på /demo

### Vad ändras
Sidan `/demo` ska visa ett **färdigt resultat direkt** utan att kräva input. Inga dropdown-steg, utan en statisk exempelvy med hårdkodad data.

### Exempeldata
- **Roll**: Specialistläkare allmänmedicin
- **Ort**: Örebro (Region Örebro, Zon 1)
- **Priser**: Zon 1: 1 238 kr/tim, Zon 2: 1 513 kr/tim, Zon 3: 1 787 kr/tim

### Upplägg

1. **Överst**: Rubrik "Regionernas priser per zon" + roll (Specialistläkare allmänmedicin)
2. **Användarens zon** (highlightad): Örebro — Zon 1 — 1 238 kr/tim
3. **Övriga zoner**: Zon 2 och Zon 3 med sina priser
4. **Gated sektion** (blur + lås): Kommuner per zon + beräknad ersättning, med CTA "Skapa konto"

### Tekniskt
- Ersätt hela `DemoLanding.tsx` med en ren statisk komponent — ingen Supabase-fetch, inga dropdown-steg
- Behåll samma visuella stil (kort, zonfärger, gated overlay)
- Inga nya beroenden

