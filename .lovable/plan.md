

# Förbättra e-postgaten i AnalysisScreen

## Nuläge
Fas 2 ("paused_for_email") visar redan en kort resultat-teaser ("Din ersättning på X kr/h ligger under/över marknadsspannet") och ett e-postfält. Men det saknas:
1. En tydlig uppmaning kopplad till vad rapporten innehåller
2. En lista över rapportens delar (som finns i `ReportPreviewList.tsx`)

## Ändringar

### 1. Lägg till resultat-teaser med procentuell diff (rad ~354–361)
Byt ut den nuvarande texten "ligger under/över marknadsspannet" till en mer specifik formulering med procentuell avvikelse:
- Beräkna `diffPercent` från `teaserData` (jämfört med `high` för underpaid, `low` för overpaid)
- Visa t.ex. *"Din ersättning på **480 kr/h** ligger **14 % under** marknadsspannet för sjuksköterska i zon 1"*

### 2. Ersätt "Ange din e-post" med rapportinnehållslista (rad ~399–408)
Byt ut det nuvarande "Ange din e-post / Så skickar vi hela analysen direkt" med:
- Rubrik: **"Ange din e-postadress för att få hela din rapport"**
- Undertitel: **"Det här ingår:"**
- Lista rapportens delar (från `ReportPreviewList`) — kompakt, med ikoner, inuti kortet
- Bestäm consultant vs permanent baserat på `survey.employmentType`

### 3. Importera och använda rapportlistans data
Importera `CONSULTANT_ITEMS` / `PERMANENT_ITEMS` direkt (eller exportera dem från `ReportPreviewList.tsx`) och rendera dem som en kompakt checklista inuti e-postkortet.

## Filer som ändras

| Fil | Ändring |
|---|---|
| `src/components/teaser/ReportPreviewList.tsx` | Exportera `CONSULTANT_ITEMS` och `PERMANENT_ITEMS` |
| `src/pages/AnalysisScreen.tsx` | Importera items, beräkna diffPercent, visa resultat-teaser + rapportlista ovanför e-postfältet |

## Före → Efter (konceptuellt)

**Före:**
```
[Analysen klar badge]
"Din analys väntar på dig"
[Kort teaser: "Din ersättning på 480 kr/h ligger under marknadsspannet"]
[Locked card med kundpris + din ersättning]
  "Ange din e-post — Så skickar vi hela analysen direkt"
  [email input + knapp]
```

**Efter:**
```
[Analysen klar badge]
"Din analys väntar på dig"
[Kort teaser: "Din ersättning på 480 kr/h ligger 14 % under marknadsspannet för sjuksköterska i zon 1"]
[Locked card med kundpris + din ersättning]
  "Ange din e-postadress för att få hela din rapport"
  "Det här ingår:"
  ✓ Ramavtalspris
  ✓ Rekommenderad ersättning
  ✓ Ersättningsgap-analys
  ✓ Zonjämförelse
  ✓ Förhandlingsscript
  [email input + knapp]
```

