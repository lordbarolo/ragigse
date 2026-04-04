

## Plan: Åtgärda kritiska säkerhetspunkter (C-2, C-1, H-2)

### Status — redan åtgärdat
- **C-3 / H-1** (verify-payment): Filen är redan raderad. Ingen frontend- eller backend-kod anropar den längre. **Klart.**

---

### 1. C-2: Idempotency-guard i stripe-webhook

**Problem**: Webhookens `checkout.session.completed`-handler kör `leads.update` och `reports.update` vid varje anrop, även retries. Bara `payments.insert` har duplikatskydd.

**Fix** i `supabase/functions/stripe-webhook/index.ts`:
- Flytta duplikatkollen (`payments` WHERE `stripe_session_id`) till **toppen** av case-blocket, *före* alla uppdateringar.
- Om raden redan finns → logga och `break` direkt.
- Annars: kör `leads.update`, `reports.update`, `payments.insert` i sekvens.

```text
checkout.session.completed:
  ├─ Kolla: payments WHERE stripe_session_id = session.id
  │   └─ Finns redan → log("duplicate, skipping") → break
  ├─ leads.update({ paid: true })
  ├─ reports.update({ status: 'paid' })
  └─ payments.insert(...)
```

---

### 2. C-1: Ta bort BankID-stubs från UI

**Filer som ändras:**

| Fil | Ändring |
|-----|---------|
| `src/pages/ReferenceForm.tsx` | Ta bort hela BankID-placeholder-blocket (rad 360–386), ta bort `bankidAcknowledged`-state och dess checkbox. Uppdatera `isValid` så att den inte kräver `bankidAcknowledged`. |
| `src/pages/SignRepresentation.tsx` | Byt "Signera med BankID" till "Bekräfta representation". Ta bort BankID-texter (rad 126, 201, 206, 211–214). |
| `src/pages/AgencyLanding.tsx` | Ersätt "BankID" i marknadsföringscopy med "digital signering" eller liknande neutral formulering. |
| `src/components/referly/VaultReferenceCard.tsx` | Ta bort `bankid`-verifikationstypen från badge-mappningen. |
| `src/pages/ReferenserInfo.tsx` | Granska och rensa eventuella BankID-omnämnanden. |
| `supabase/functions/bankid-verify/index.ts` | Radera filen + avdeploya edge function. |
| `supabase/config.toml` | Ta bort `[functions.bankid-verify]`-blocket. |

---

### 3. H-2: GDPR-raderingsflöde

**Ny Edge Function**: `supabase/functions/delete-account/index.ts`

Kräver autentisering (JWT). Flöde:
1. Verifiera JWT → hämta `user_id`
2. Anonymisera `leads` (sätt `email = null`, personliga fält till null) WHERE user_id
3. Radera från: `consultant_documents`, `consultant_references`, `consultant_profiles`
4. Anonymisera `reports` (nolla `result_json`, `email`) WHERE user_id
5. Radera `ref_references`, `ref_verifications`, `ref_profiles` WHERE user_id/individual_id
6. Radera `profiles` WHERE user_id
7. Anropa `supabase.auth.admin.deleteUser(user_id)`
8. Returnera `{ deleted: true }`

**Frontend**: Lägg till "Radera mitt konto"-knapp i `src/pages/Profile.tsx` med bekräftelsedialog. Vid bekräftelse → anropa edge function → logga ut → omdirigera till `/`.

**Config**: Lägg till `[functions.delete-account]` i `supabase/config.toml` med `verify_jwt = false` (JWT valideras i kod).

---

### Sammanfattning av leverabler

| Punkt | Åtgärd | Filer |
|-------|--------|-------|
| C-2 | Idempotency-guard | `stripe-webhook/index.ts` |
| C-1 | Ta bort BankID-stubs | 7 filer + radera edge function |
| H-2 | GDPR-radering | Ny edge function + Profile.tsx |
| C-3/H-1 | Redan åtgärdat | — |

