# Omstrukturera e-postgaten i AnalysisScreen

## Översikt

Ändra layouten i fas 2 ("paused_for_email") enligt användarens önskemål: rubrik med rapportinnehåll först, sedan prisrutan med ett nytt snittlön-meddelande, och en ny separat ruta om kostnader.

## Ny layout (uppifrån och ner)

```text
[Analysen klar badge]
[── RUBRIK: "Din rapport innehåller" ──
  • Ramavtalspris
  • Rekommenderad ersättning
  • Ersättningsgap-analys
  • Zonjämförelse
  • Förhandlingsscript"]

── E-postfält + knapp ──
  [email input]
  [Visa min rapport]
  ✓ Visas direkt  ✓ Ingen inloggning

── RUTA 1: Regionens kundpris + Din ersättning ──
  Regionens kundpris       616 kr/h
  Din ersättning           480 kr/h
  "Genomsnittslönen för Zon 1 är lägre än din ersättning"

── RUTA 2 (ny, separat): Kostnadsinfo ──
  "Kostnader för resa, boende, introduktion, SITHS-kort,
   HLR-utbildning m.m kan påverka ersättningen som
   erbjuds av uppdragsgivare"
```

## Ändringar i `src/pages/AnalysisScreen.tsx`

### 1. Flytta rapportinnehållslistan ovanför prisrutan

Rubrik "Din rapport innehåller" med items i stor stil (text-[15px]) — placeras direkt efter resultat-teasern, före prisrutan.

### 2. Lägg till snittlöne-jämförelse i prisrutan

Under "Din ersättning"-raden, ny rad med texten:

- `"Genomsnittslönen för {zone} är lägre/i närheten/högre än din ersättning"`
- Logik: om `userHourly < low` → "högre", om `userHourly > high` → "lägre", annars "i närheten av"

### 3. Ny separat kostnadsruta

Under prisrutan, en fristående card med texten: "Kostnader för resa, boende, introduktion, SITHS-kort, HLR-utbildning m.m kan påverka ersättningen som erbjuds av uppdragsgivare"

### 4. Flytta e-postfältet ut ur prisrutan

E-postinput, knapp och trust-badges placeras under kostnadsrutan — inte inuti prisrutan.

## Fil som ändras


| Fil                            | Ändring                                                                                                    |
| ------------------------------ | ---------------------------------------------------------------------------------------------------------- |
| `src/pages/AnalysisScreen.tsx` | Omstrukturerar fas 2-layouten: rapportlista ovanför, snittlön i prisrutan, ny kostnadsruta, e-post utanför |
