

# Uppdaterad plan: Få e-post att fungera utan NS-poster

## Nuläge

All backend-infrastruktur för e-post är **korrekt uppsatt**:
- pgmq-köer, cron-jobb, email_send_log, email_send_state — allt finns
- auth-email-hook och send-transactional-email edge functions finns
- Resend-connector är kopplad

**Enda problemet:** Domänen `info.compcare.se` kan inte DNS-verifieras eftersom Loopia inte stöder NS-poster för subdomäner. Utan verifierad domän skickar inte `process-email-queue` några mail.

## Lösning

Avaktivera Lovable Emails och låt `process-email-queue` skicka via Resend-gateway istället för Lovables e-post-API. Kö-systemet med retries, rate-limit-hantering och DLQ behålls intakt.

### Steg

1. **Avaktivera Lovable Emails** — tar bort kravet på DNS-verifiering av `info.compcare.se`

2. **Uppdatera `process-email-queue`** — byt sändningsanropet från Lovables e-post-API till Resend connector gateway (`https://connector-gateway.lovable.dev/resend/emails`). Alla andra delar av funktionen (kö-läsning, retry-logik, DLQ, rate-limit) lämnas orörda.

3. **Verifiera att `mail.compcare.se` fungerar i Resend** — den domänen används redan av `send-audit-confirmation` och kräver bara TXT/CNAME (som Loopia stöder).

4. **Deploya uppdaterad edge function**

5. **Ta bort DNS-posterna för `info.compcare.se`** från Loopia (TXT-posten `_lovable-email` kan också tas bort)

### Vad som ändras i koden

- `supabase/functions/process-email-queue/index.ts` — byt HTTP-anropet som skickar mail från Lovable Email API till Resend gateway. Behåll all kö/retry-logik.

### Fördelar jämfört med förra planen
- Behåller det befintliga kö-systemet med retries, rate-limit-hantering och DLQ
- Minimal kodändring (bara sändningssteget i process-email-queue)
- Befintliga React Email-mallar och auth-email-hook behöver inte ändras alls

### DNS att ta bort i Loopia (efter att allt fungerar)
- `_lovable-email.compcare.se` TXT-post
- Eventuella NS-poster för `info.compcare.se` (om de lades till)

