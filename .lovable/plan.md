

## Plan: Centrera stat-korten mot mitten av hjältesektionen

**Problemet**: De tre stat-korten (616kr/timme, 15-20%, 508kr/timme) har `ml-auto` och `pr-6 lg:pr-10`, vilket pressar dem mot högerkanten.

**Lösningen**: Byt ut `ml-auto pr-6 lg:pr-10` mot `mx-auto` på stat-kortens wrapper-div (rad 206) så att de centreras horisontellt i den lediga ytan.

### Ändring

**Fil**: `src/pages/demo/LandingV2.tsx`, rad 206

Från:
```
<div className="relative z-10 ml-auto pr-6 lg:pr-10 py-20 hidden lg:flex flex-col gap-5">
```

Till:
```
<div className="relative z-10 mx-auto py-20 hidden lg:flex flex-col gap-5">
```

Det är en enradig ändring som tar bort högerförskjutningen och centrerar korten i den tillgängliga bredden bredvid textblocket.

