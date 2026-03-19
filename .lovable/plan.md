

## Fördröj cookie-bannern

Cookie-bannern visas direkt vid sidladdning och blockerar CTA:n på landningssidan. Lösningen är att fördröja den tills användaren har hunnit orientera sig.

### Trigger-logik
Visa bannern efter **det första som inträffar** av:
1. Användaren scrollar (minst 50px)
2. 8 sekunder har gått
3. Användaren klickar på ett role-kort (dvs interagerar med CTA)

### Ändringar

**`src/components/CookieBanner.tsx`**
- Lägg till fördröjningslogik med `setTimeout` (8s) och `scroll`-listener
- Bannern börjar som dold även om consent saknas, och blir synlig först när något trigger-villkor uppfylls
- Om consent redan finns (accepted/rejected) visas bannern aldrig — befintligt beteende bibehålls

Ingen ändring i övriga filer behövs.

