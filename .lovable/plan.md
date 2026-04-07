

## Plan: Integrera Ersättningsvyn i dashboarden

### Vad som ändras
CompensationView-komponenten (hero-kort med kundpris, lönespann och förhandlingstips) placeras direkt i Profile-dashboarden — mellan "Profil"-kortet och "Mina rapporter"-kortet.

### Hur
1. **Profile.tsx** — Importera `CompensationView` och rendera den mellan Profil-kortet (rad 186) och ProfileInsights (rad 189). Skicka in profildata (roll, ort) som props så den visar rätt data för inloggad användare istället för hårdkodade defaultvärden.

2. **CompensationView.tsx** — Gör komponenten dynamisk:
   - Ta bort hårdkodade default-data
   - Acceptera `role` och `location` som props
   - Hämta korrekt kundpris, zon och lönespann baserat på användarens roll och ort (antingen via props eller genom att slå upp mot befintlig prisdata/API)
   - Visa komponenten kompakt (utan extra padding/bakgrund) så den passar in i dashboardens layout

3. **Rutthantering** — Överväg att ta bort den fristående rutten `/consultant/ersattning` och sidan `CompensationPreview.tsx` eftersom vyn nu lever i dashboarden.

### Tekniska detaljer
- `CompensationView` behöver bli dynamisk med props: `role`, `location`, ev. `invoiceRate` och `salaryRange` från profildata eller ProfileInsights-logiken
- Befintlig prislogik i ProfileInsights kan återanvändas för att slå upp zon och kundpris
- Placering i JSX: efter rad 186 (slutet av Profil-kortet), före rad 189 (ProfileInsights)

