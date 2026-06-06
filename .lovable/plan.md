
## Mål

Slippa NS-delegering till Loopia. Skicka alla mejl via Resend, som bara kräver CNAME + TXT i Loopias DNS-editor (fungerar utan support).

## Vad ändras (och vad ändras INTE)

**Ändras:**
- `supabase/functions/send-transactional-email/index.ts` skickar direkt via Resend-gateway istället för att kö-läggas i pgmq → Mailgun.
- Alla 7 mallar (`welcome`, `report-delivery`, `invoice-confirmation`, `invoice-admin-notify`, `reference-invite`, `representation-invite`) fortsätter fungera oförändrade — de renderas fortfarande via React Email till HTML och skickas till Resend.

**Ändras INTE:**
- Anropssyntax i koden: alla `supabase.functions.invoke('send-transactional-email', { body: { templateName, recipientEmail, templateData } })` fortsätter fungera.
- `radar-notify` (redan på Resend).
- `email_send_log`, `suppressed_emails`, `email_unsubscribe_tokens` — behålls och skrivs till som idag (logg, suppression-check, unsubscribe-länkar).
- Mallar, registry, designspråk.

## DNS-flöde (det du gör själv i Loopia)

1. Skapa konto/domän i Resend → "Add domain" → t.ex. `send.compcare.se`.
2. Resend ger dig 3 poster (vanligtvis 1 MX + 2 TXT eller liknande). Alla läggs i Loopias DNS-editor på subdomän — **inga NS-poster**.
3. När Resend visar "Verified" → klart.
4. Stäng av Lovable Emails (jag gör det åt dig).
5. Ta bort de NS-poster för `notify.compcare.se` du försökt lägga in (de behövs inte längre).

## Trade-offs

- **Förlorar:** pgmq-kö (retry vid 429/5xx), DLQ, scheduler. Resend SDK gör 1 anrop direkt — om Resend svarar fel loggar vi `failed` i `email_send_log` men retryar inte.
- **Vinner:** ingen NS-delegering, enklare arkitektur, du äger DNS i Loopia.
- **Auth-mejl** (lösenordsåterställning, magic links etc.): går tillbaka till Lovables default-mallar när Lovable Emails stängs av. Custom `send-password-recovery` fortsätter fungera (skickar redan via Resend via process-email-queue → måste också byggas om för Resend-direkt). Tas i steg 2 om du vill.

## Teknisk implementation (steg 1 — denna runda)

1. Skriv om `send-transactional-email/index.ts`:
   - Behåll: CORS, input-validering, suppression-check, unsubscribe-token-hantering, `email_send_log`-rader.
   - Ta bort: `enqueue_email`-RPC-anropet.
   - Lägg till: direktanrop till `https://connector-gateway.lovable.dev/resend/emails` med `Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${RESEND_API_KEY_1}`.
   - From-adress läses från ny env-var `RESEND_FROM_DOMAIN` (du sätter t.ex. `send.compcare.se` när Resend verifierat den).
   - Lägg till unsubscribe-footer i HTML innan sändning (eftersom kö-dispatchern inte längre gör det).
   - Logga `sent` vid 200, `failed` vid annan status.
2. Deploya `send-transactional-email`.
3. Lägg till `RESEND_FROM_DOMAIN` som secret (du fyller i värdet när Resend gett dig domänen).
4. Stäng av Lovable Emails.

## Steg 2 (senare, om du vill)

- Bygg om `send-password-recovery` på samma sätt → då är auth-mejl också på Resend.
- Bygg om `auth-email-hook` så Supabase Auth-mejl (signup-bekräftelse, magic link) också går via Resend istället för Lovables default.

## Rollback

Om något krånglar: aktivera Lovable Emails igen (`toggle_project_emails: true`) och återställ `send-transactional-email` från git.

## Bekräfta innan jag kör

- Vilken **subdomän** vill du använda i Resend? Förslag: `send.compcare.se` (ren, ej krockar med `notify.compcare.se` som Lovable hanterat).
- Ska jag köra **bara steg 1** nu (app-mejl via Resend), och låta auth-mejl ligga kvar på Lovable Emails tills steg 2?
