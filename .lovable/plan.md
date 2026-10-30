# CompCare pekar fortfarande på vardbemanning.ai

## Läget
CompCare är nu bara kopplat till compcare.se. Men projektet nämner vardbemanning.ai på 189 ställen i cirka 50 filer. Eftersom domänen nu visar ett annat projekt drabbar det både CompCare och vardbemanning.ai.

## Negativa effekter just nu
1. **Mejl leder till fel sajt.** Länkarna i CompCares mejl går till vardbemanning.ai, där CompCares sidor inte finns längre. Det gäller registreringsbekräftelser, inloggningslänker, lösenordsåterställning, uppföljningsmejl, välkomstmejl, rapportutskick och referensmejl. De här länkarna går sönder eller hamnar i fel projekt. Det kan även hända att inloggningsuppgifter skickas till den andra sajten.
2. **Signaler till Google och AI-assistenter blir felaktiga.** Det gäller till exempel sitemap.xml, robots.txt, llms.txt, openapi.json, agent-index.json, ai-plugin.json och sidornas kanoniska adresser och strukturerade data. De anger vardbemanning.ai som CompCares adress. Google kan därför tolka sidorna som dubbletter och peka på sidor som inte finns där. CompCare.se tappar då sin synlighet, och vardbemanning.ai får felaktiga länkar.
3. **Spårningen blandas ihop.** CompCare räknar fortfarande vardbemanning.ai som sin produktionssajt. Besöksdata från de två projekten kan alltså blandas.
4. **De senaste säkerhetsfixarna** tillåter fortfarande vardbemanning.ai som returadress. CompCare kan alltså skicka användare till det andra projektet.

## Förslag på åtgärd (efter ditt godkännande)
- Byt CompCares egen adress från vardbemanning.ai till https://compcare.se i mejl, sitemap, robots, AI-filer, kanoniska adresser och strukturerad data.
- Ta bort vardbemanning.ai från listorna över tillåtna returadresser i CompCare.
- Uppdatera spårningens inställning för vilken sajt som räknas som produktion.
- Kontrollera att inloggningens returadresser pekar på compcare.se.
- Varumärket "vårdbemanning.ai" i texter och loggor rörs inte, eftersom det är ett produktbeslut som du får fatta.
- Lägg ut mejlfunktionerna på nytt och publicera, först efter ditt OK.

## Öppen fråga
Ska CompCare fortsätta använda varumärket "vårdbemanning.ai", eller ska det tillbaka till "CompCare"?
