

## Plan: Byt alla URL:er från compcare.lovable.app till compcare.se

### Bakgrund
Domänen **www.compcare.se** är redan kopplad till projektet. Men det finns 41 hårdkodade referenser till `compcare.lovable.app` i 6 filer (mest edge functions och e-postmallar) som behöver uppdateras.

### Ändringar

Byt `compcare.lovable.app` → `compcare.se` i följande filer:

1. **`supabase/functions/save-email/index.ts`** — rapport-URL:er som skickas i e-post (rad 184–185, 216)
2. **`supabase/functions/_shared/transactional-email-templates/report-delivery.tsx`** — fallback-URL och preview-data (rad 34, 50)
3. **`supabase/functions/_shared/transactional-email-templates/reference-invite.tsx`** — preview-data (rad 85)
4. **`supabase/functions/_shared/transactional-email-templates/welcome.tsx`** — profilknapp-URL (rad 35)
5. **`supabase/functions/auth-email-hook/index.ts`** — SAMPLE_PROJECT_URL (rad 49)
6. **`supabase/functions/radar-notify/index.ts`** — radar-länk i e-post (rad 77)

Alla ersättningar är rena sök-och-ersätt: `compcare.lovable.app` → `compcare.se`. Ingen logikändring krävs.

### Teknisk detalj
Edge functions deployas automatiskt efter ändringarna, så de nya URL:erna börjar gälla direkt.

