
## Mål
Långa specialitetsnamn i specialitets-dropdownen (hero-formuläret på /) ska rymmas på en rad i mobil. Lösning: korta visningsetiketter + ellipsis-fallback. Sökning och resolved role (det som skickas vidare till survey) lämnas oförändrade så ingen affärslogik påverkas.

## Omfattning
- Endast presentation. Inga ändringar i `resolvedRole`, slugs, prefill-mappning eller backend.
- Gäller listan som byggs i `src/lib/specialitySlugs.ts` och renderas av `SearchableSelect` i hero-formuläret.

## Förkortningsregler (visningsnamn)
Mappning från fullt namn → kort etikett. Sökning matchar fortfarande fullt namn.

Läkare (utdrag, samma princip för alla 63):
- "Specialistläkare barn- och ungdomsneurologi med habilitering" → "Barnneurologi & habilitering"
- "Specialistläkare barn- och ungdomshematologi och onkologi" → "Barnhematologi & onkologi"
- "Specialistläkare barn- och ungdomskardiologi" → "Barnkardiologi"
- "Specialistläkare barn- och ungdomskirurgi" → "Barnkirurgi"
- "Specialistläkare barn- och ungdomsmedicin" → "Barnmedicin"
- "Specialistläkare barn- och ungdomspsykiatri" → "Barn- & ungdomspsykiatri"
- "Specialistläkare barn- och ungdomsallergologi" → "Barnallergologi"
- "Specialistläkare klinisk immunologi och transfusionsmedicin" → "Klinisk immunologi"
- "Specialistläkare medicinsk gastroenterologi och hepatologi" → "Gastroenterologi & hepatologi"
- "Specialistläkare arbets- och miljömedicin" → "Arbets- & miljömedicin"
- "Specialistläkare obstetrik och gynekologi" → "Obstetrik & gynekologi"
- "Specialistläkare hud- och könssjukdomar" → "Hud & kön"
- "Specialistläkare öron-, näs- och halssjukdomar" → "ÖNH"
- "Specialistläkare hörsel- och balansrubbningar" → "Hörsel & balans"
- "Specialistläkare röst- och talrubbningar" → "Röst & tal"
- Övriga "Specialistläkare X" → "X" med versal initial (t.ex. "Anestesi och intensivvård" → "Anestesi & IVA", "Klinisk neurofysiologi" → "Klinisk neurofysiologi").

Generella regler för resten:
- Strippa prefixet "Specialistläkare " i visningen.
- Ersätt " och " med " & ".
- "barn- och ungdoms" → "barn-" eller släpp "ungdoms" där det är otydligt — se mappning ovan för redan kända kollisioner.
- Kapa kvarvarande långa namn med CSS `truncate` + `title={fullName}` som säkerhet.

Sjuksköterskor: nuvarande etiketter är redan korta (t.ex. "IVA-sjuksköterska"), behåller dem.

## Tekniska steg
1. Lägg till `displayLabel` i `SpecialityOption` (`src/lib/specialitySlugs.ts`) och fyll i enligt mappningen ovan. `label` (fullt namn) behålls för sökmatchning.
2. I `SearchableSelect` (eller call-site i `HeroInlineForm`): rendera `displayLabel ?? label` och lägg `truncate` + `title={label}` på raden så att även icke-mappade namn håller sig på en rad med ellipsis.
3. Säkerställ att sökmotorn i `SearchableSelect` matchar mot `label` (fullt namn) så att "transfusion" fortfarande hittar "Klinisk immunologi".
4. Ingen ändring i `PREFILL_MAP`/Survey — slug och `resolvedRole` är oförändrade.

## Verifiering
- Mobil 393px: ingen rad bryts i dropdownen för de tio längsta namnen.
- Sök på "transfusion", "habilitering", "gastro" returnerar rätt rad.
- Vald specialitet skickar samma `?yrke=…`-slug som idag och Survey resolvar samma roll.
