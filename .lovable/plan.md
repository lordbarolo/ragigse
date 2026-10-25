# Åtgärd: CodeQL "Clear text storage" i AnalysisScreen.tsx:212

## Bedömning
- Fyndet gäller att enkätsvaren (lön, lönetyp) skrivs till webbläsarens sessionStorage. Rad 212 lägger dessutom till e-postadressen.
- sessionStorage är bunden till fliken och sajten och töms när fliken stängs. Risken är låg men verklig vid delad dator eller vid ett eventuellt XSS-fel.
- Samma enkätsvar sparas redan tidigare i flödet (Survey.tsx, InlineTerminalSurvey.tsx, AnalysisScreen.tsx:57). Rad 212 tillför bara e-posten och är i övrigt en omskrivning.
- Kryptering i webbläsaren, som CodeQL föreslår, ger inget skydd här eftersom nyckeln också måste ligga i webbläsaren. Den åtgärden avråder jag från.

## Förslag (minsta ändring, ingen synlig skillnad)
1. AnalysisScreen.tsx rad 211–213: ta bort omskrivningen av `surveyData` med e-post. E-posten finns redan i komponentens state (`setEmail`) och sparas i databasen via `saveEmail`. Ingen e-post hamnar i sessionStorage.
2. Kontrollera att inget läser `surveyData.email` (Onboarding.tsx:42 och AnalysisScreen.tsx:38). Om något gör det läses värdet från state eller profilen i stället.
3. Lägg ett test i `AnalysisScreen.redirect.test.tsx`: efter att e-posten sparats innehåller `sessionStorage.surveyData` ingen e-post.
4. Lön och lönetyp blir kvar i sessionStorage. Att ta bort dem kräver att Onboarding och analysen hämtar svaren från servern via leadId. Det är en större ändring som du får ta ställning till separat.
5. Fyndet markeras i GitHub/CodeQL som "won't fix – accepted risk" för lönefälten, med motivering. Det görs av dig, eftersom jag inte har tillgång till GitHubs säkerhetsflik.

## Ändras inte
Ingen text som användaren ser, ingen databas, inga andra filer utöver testet. Ingen publicering.
