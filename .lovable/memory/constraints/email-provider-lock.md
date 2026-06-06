---
name: Email Provider Lock — Resend Only
description: HARD LOCK. All email (auth + transactional) går via Resend på mail.compcare.se. Lovable Emails får ALDRIG aktiveras/scaffoldas igen utan explicit "lyft email-låset"-kommando från användaren.
type: constraint
---

# Email Provider Lock

**Status:** LÅST sedan 2026-06-06.
**Provider:** Resend (connector key `RESEND_API_KEY_1`) via `connector-gateway.lovable.dev/resend`.
**Verifierad domän:** `mail.compcare.se` (Verified i Resend, halvarholding workspace).
**Avsändare:** `CompCare <noreply@mail.compcare.se>`.

## Förbjudet utan explicit "lyft email-låset"

- ❌ `email_domain--toggle_project_emails { enabled: true }`
- ❌ `email_domain--setup_email_infra`
- ❌ `email_domain--scaffold_transactional_email`
- ❌ `email_domain--scaffold_auth_email_templates`
- ❌ Återinföra `enqueue_email` / pgmq-kö i `send-transactional-email`, `auth-email-hook`, `send-password-recovery`.
- ❌ Lägga till nya NS-records på `notify.compcare.se` eller annan subdomän som pekar på Lovable.
- ❌ Recommendera "Lovable Emails" som lösning vid felsökning. Felsök ALLTID inom Resend-flödet.

## Tillåtet

- ✅ Lägga till nya React Email-templates i `supabase/functions/_shared/transactional-email-templates/` och registrera dem i `registry.ts`.
- ✅ Anropa `send-transactional-email` (som nu går direkt till Resend gateway).
- ✅ Skicka via Resend gateway i andra edge functions med samma headers (`Authorization: Bearer ${LOVABLE_API_KEY}` + `X-Connection-Api-Key: ${RESEND_API_KEY_1}`).
- ✅ Justera `RESEND_FROM_DOMAIN` / `RESEND_FROM_NAME` env om användaren ber om det.

## Felsökning

Om mejl inte kommer fram:
1. Kolla `email_send_log` (`status`, `error_message`, `metadata.resend_id`).
2. Kolla `suppressed_emails`.
3. Kolla Resend dashboard (resend.com → Logs).
4. ALDRIG svara "kör om setup_email_infra" eller "aktivera Lovable Emails".

## Hur låset lyfts

Endast om användaren skriver ordagrant något i stil med:
> "lyft email-låset" / "byt tillbaka till Lovable Emails" / "scaffolda om email-infra"

Då (och endast då): bekräfta först, lista konsekvenserna (DNS-konflikt på mail.compcare.se, dubbelsändning, deliverability-risk), och vänta på "kör".
