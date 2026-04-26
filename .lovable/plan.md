## Mål
Förenkla hero på `/` till en tydlig rubrik + en underrubrik. Allt brus runt omkring (roterande ord, två extra meningar, bullets, sekundär CTA, disclaimer) tas bort. `HeroRateLookup`-widgeten behålls som primär handling.

## Ny hero-struktur

```text
[ Rubrik:    Jämför din ersättning och få hjälp med förhandlingen ]
[ Subrubrik: Vi vet vad du borde tjäna och hur du når dit         ]
[ HeroRateLookup-widget                                            ]
```

## Ändringar i `src/pages/Index.tsx` (rad 91–129)

1. **Rubrik** — ersätt `Skydda din <RotatingHeroWord />` med statisk text:
   *"Jämför din ersättning och få hjälp med förhandlingen"*
2. **Subrubrik** — ersätt de två befintliga `<p>`-styckena med en enda mening:
   *"Vi vet vad du borde tjäna och hur du når dit"*
3. **Ta bort** de tre bullet-punkterna (rad 104–111).
4. **Ta bort** sekundär CTA-knappen + disclaimer (rad 117–126). Widgeten har redan en CTA ("Se din ersättning") när roll+kommun valts.
5. **Behåll** `HeroRateLookup` oförändrad.
6. **Städa imports** — ta bort `RotatingHeroWord` och `MessageSquare` (om inte använd någon annanstans i filen; `MessageSquare` används fortfarande av pelaren `Förhandlingsassistent` så den stannar).

## Inte i scope
- `RotatingHeroWord.tsx` lämnas i kodbasen (bara importen tas bort).
- Pelar-sektionen, trust-sektionen och footer rörs inte.
- Inga ändringar i `HeroRateLookup`.

## Filer som ändras
- `src/pages/Index.tsx` — endast hero-blocket + en import.
