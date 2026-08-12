# Varför inga mail vid registrering — och plan för att fixa

## Vad jag ser i nuläget

- Projektets avsändardomän är satt till `info.compcare.se`. Statusen är **misslyckad**: DNS-verifieringen slutfördes inte inom 14 dagar, så domänen är inte godkänd för utskick.
- E-postloggen visar inga rader alls för autentiseringsmail (signup/magic link) — bara app-mail ("welcome"). De senaste app-mailen misslyckades med avsändarfel: "This API key is not authorized to send emails from compcare.se" och ett ogiltigt `from`-fält.
- Registreringen i appen anropar konto-skapande med e-postbekräftelse, så mailet ska skickas av inloggningstjänsten — men eftersom ingen verifierad avsändardomän finns, går inget iväg.
- Sidan har bytt varumärke till **vardbemanning.ai**, men e-postdomänen pekar fortfarande på gamla compcare.se.

Kortsvar: mailen skickas inte eftersom ingen verifierad avsändardomän finns — den gamla (compcare.se) föll ut på DNS-verifiering och den nya (vardbemanning.ai) är inte uppsatt.

## Plan

1. **Sätt upp ny avsändardomän på vardbemanning.ai**
   Vi startar e-postuppsättningen för den domän varumärket faktiskt använder (t.ex. `notify.vardbemanning.ai`). Du får exakta DNS-poster att lägga in hos domänleverantören; verifieringen sker därefter automatiskt.

2. **Lägg in DNS-posterna (din åtgärd)**
   NS- och TXT-poster läggs in hos leverantören för vardbemanning.ai. Detta är det steg som saknades förra gången — utan det timeoutar verifieringen igen efter 14 dagar.

3. **Koppla om autentiseringsmailen till nya domänen**
   Registreringsbekräftelse, magic link och lösenordsåterställning byggs om mot den nya domänen med rätt avsändaradress, och märks upp med vardbemanning.ai-profilen. Gamla compcare.se-avsändare tas bort ur mail-utskicken så att 403-felen försvinner.

4. **Verifiera med skarpt test**
   Efter att DNS gått igenom: skapa ett testkonto, bekräfta att mailet landar och att länken leder till profilsidan. Vi kontrollerar även utskicksloggen så inga mail fastnar i kön.

5. **Beslut om övergångsläge (behöver ditt svar, se fråga nedan)**
   DNS-propagering kan ta upp till 72 timmar. Under den tiden kan nyregistrerade inte bekräfta sin e-post. Alternativ: (a) vänta, eller (b) tillfälligt låta konton bli aktiva direkt vid registrering utan mailbekräftelse, och slå på bekräftelse igen när domänen är verifierad.

## Tekniska detaljer

- Domänstatus: `info.compcare.se` = provisioning timed out. Kräver ny domänuppsättning, inte en retry.
- Auth-mail går via projektets auth-email-hook; den kan inte skicka utan aktiv sändardomän, vilket förklarar att inga auth-rader finns i `email_send_log`.
- App-mail (`send-transactional-email` m.fl.) har hårdkodad/felaktig avsändare mot compcare.se — uppdateras till den nya verifierade subdomänen (FQDN, inte rotdomän).
- Ingen ändring av sidans utformning eller övrig funktionalitet ingår.
