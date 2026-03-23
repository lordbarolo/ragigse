

# Fix: Admin Dev Bypass — Säkerhetsåtgärd

## Problem

Nuvarande bypass i `adminAuth.ts` (edge function) kontrollerar `referer`/`origin`-headern för att avgöra om miljön är dev/preview. **Referer-headers kan spoofas** — vem som helst kan skicka en request med `Referer: https://id-preview--x.lovableproject.com` och få full admin-åtkomst utan inloggning.

På klientsidan (`useAdminAuth.ts`) kontrolleras hostname, vilket är säkrare men ändå ger öppet admin-läge i alla preview-miljöer.

## Lösning

Byt från referer-baserad bypass till en **server-side environment variable** (`ADMIN_DEV_BYPASS`). Bypasset aktiveras bara om servern explicit har satt variabeln — inte baserat på vad klienten skickar.

### Steg

**1. Edge function (`adminAuth.ts`)**
- Ta bort referer-baserad check
- Läs `Deno.env.get("ADMIN_DEV_BYPASS")` istället
- Bypass aktiveras bara om env-variabeln === `"true"`

```typescript
const devBypass = Deno.env.get("ADMIN_DEV_BYPASS") === "true";
if (devBypass) {
  return { userId: "dev-bypass" };
}
```

**2. Sätt secret `ADMIN_DEV_BYPASS`**
- Använda secrets-verktyget för att sätta `ADMIN_DEV_BYPASS=true` i test-miljön
- I produktion sätts den aldrig → bypass är inaktivt

**3. Klient-hook (`useAdminAuth.ts`)**
- Behåll dev-bypass på klientsidan (hostname-check) — detta styr bara UI-visning, inte dataskydd
- Alternativt: gör klienten konsekvent och alltid fråga servern

**4. Deploy edge functions** som använder `adminAuth.ts`

### Påverkan
- **Ingen funktionell ändring** i dev/preview (bypass funkar fortfarande via env var)
- **Produktionssäkerhet**: omöjligt att spoofa sig förbi admin-check
- Berörda filer: `supabase/functions/_shared/adminAuth.ts`, eventuellt `src/hooks/useAdminAuth.ts`

