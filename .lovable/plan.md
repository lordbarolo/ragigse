## Vad jag förstått

Idag består `SearchableSelect` av **två fält**:

1. En **trigger-knapp** (visar "Sök kommun…" som placeholder eller vald kommun)
2. När man klickar öppnas en dropdown med ett **separat sökfält** ("Sök…") där användaren skriver

Du vill ha **ett enda fält**: själva "Sök kommun…"-rutan ska vara det fält användaren skriver i. Listan under filtreras direkt från det fältet — ingen extra "Sök…"-ruta ska dyka upp.

## Vad jag bygger

Refaktor i `src/components/SearchableSelect.tsx` — ingen annan fil ändras (Survey, MarketSearchBox, HeroRateLookup etc. fortsätter använda samma API: `value`, `onValueChange`, `placeholder`, `options`).

Beteende efter ändringen:
- Trigger är ett `<input>` istället för `<button>`. Visar vald kommun när stängd, placeholder ("Sök kommun…") när tom.
- **Klick eller fokus** → öppnar dropdown och rensar inputvärdet så användaren kan börja skriva direkt; chevron-pilen finns kvar till höger.
- **Skrivning** filtrerar listan i realtid (samma logik som idag, bara att källan blir trigger-inputen istället för den nestade söken).
- **Enter / klick på rad** väljer kommun, stänger dropdown, inputvärdet blir vald kommun.
- **Escape / klick utanför** stänger dropdown och återställer inputvärdet till tidigare val.
- Den separata `<input>`-raden inne i dropdownen (med förstoringsglas + "Sök…") **tas bort**.
- Keyboard-nav (↑/↓/Home/End/Enter/Esc), gruppheaders (region), flipUp, scroll-into-view och ARIA (`role="combobox"`, `aria-expanded`, `aria-controls`, listbox) behålls.
- Visuell styling (höjd, border, glow, `triggerClassName`, `placeholderClassName`) oförändrad — utseendet på det yttre fältet ändras inte.

## Vad jag INTE rör

- Survey-steget, copy ("Sök kommun…"), färger, höjd, layout runt fältet.
- Andra användare av `SearchableSelect` (roll-väljare, marknadsfilter etc.) — de får samma förbättring automatiskt, men API:t är identiskt.

## Verifiering

- Mobil Playwright-screenshot av `/` survey-steg "På vilken ort ska du arbeta?" före/efter, för att bekräfta att bara ett fält syns och att man kan skriva direkt i "Sök kommun…".
- Snabbtest av tangentbordsnav.

Säg till så implementerar jag.