

## Rendera och skapa product shot av Solution Center-mockupen

Användaren har delat en HTML-mockup av "Solution Center by Compcare" -- en verifieringsmodul inbyggd i Avropsplatsens Partner Portal. Målet är att skapa en polerad produktbild (product shot) av denna design.

### Steg

1. **Spara HTML-mockupen** till `/tmp/solution-center.html`
2. **Rendera sidan i webbläsaren** genom att navigera till filen
3. **Ta screenshot** av den renderade mockupen (både idle-state och verified-state)
4. **Generera product shot** med `generate.py`-scriptet, med `midnight`- eller `ocean`-preset som matchar Avropsplatsens mörka header
5. **Leverera** som PNG till `/mnt/documents/`

### Output

- `solution-center-mockup.png` -- Product shot med window frame och gradient-bakgrund

### Tekniska detaljer

- Använder product shot generator-scriptet med `--preset ocean` för att matcha den mörka, professionella tonen
- Viewport sätts till desktop-bredd (1280px) för att visa hela layouten korrekt

