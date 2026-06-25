# Säkerhetsfix – plan

## 1. Raw error leakage i 500-svar (`raw_error_500_leak`)
Ersätt `error.message` i HTTP 500-body med generisk text i samtliga edge functions. Behåll full server-side logging via `console.error`.

Filer som ändras:
- `supabase/functions/admin-data/index.ts`
- `supabase/functions/admin-review-action/index.ts`
- `supabase/functions/redeem-coupon/index.ts`
- `supabase/functions/delete-account/index.ts`
- `supabase/functions/agent-api-admin/index.ts` (flera catch-block)
- `supabase/functions/agent-api-user-tokens/index.ts` (flera catch-block)
- `supabase/functions/get-avrop-predictions/index.ts`

Mönster:
```ts
} catch (err) {
  console.error("[fn-name]", err);
  return new Response(
    JSON.stringify({ error: "Internal server error" }),
    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
}
```
Behåll 4xx-svar med beskrivande meddelanden (validering, auth) – endast 5xx generaliseras.

## 2. Auth-gate på Uppdragsradar-endpoints (`avrop_radar_no_auth`)
Lägg till JWT-validering överst i båda funktioner innan någon DB-query körs.

Filer som ändras:
- `supabase/functions/get-avrop-predictions/index.ts`
- `supabase/functions/uppdragsradar-chat/index.ts` (innan SSE-stream startas)

Mönster:
```ts
const authHeader = req.headers.get("Authorization");
if (!authHeader) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: ... });
const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, { global: { headers: { Authorization: authHeader }}});
const { data: { user }, error } = await anon.auth.getUser();
if (error || !user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401, headers: ... });
```
Service-role-klienten behålls för själva DB-läsningen (RLS säger deny-all, vilket är ok eftersom vi nu auth-gatar i kod).

Påverkan på frontend: `Uppdragsradar.tsx`/`UppdragsradarV2.tsx` och `ReijdarChat.tsx` skickar redan Authorization-header för inloggade användare. ReijdarChat har redan en auth-gate i UI som blockerar utloggade – så regression-risken är låg, men jag verifierar att samtliga anrop skickar `session.access_token`.

## 3. Dependency-uppdateringar
Kör `bun add` med pinned versioner:
- `posthog-js` → senaste 1.x (åtgärdar critical protobufjs RCE + high/medium DoS-kedja)
- `@supabase/supabase-js` → senaste 2.x (åtgärdar `ws` DoS/memory disclosure)
- `react-router-dom` → senaste 6.x patch (åtgärdar open redirect / XSS)
- `jspdf` → senaste 4.x (åtgärdar DOMPurify-kedja) – medium, tas med på köpet

Verifiering: `bun run build` + smoke-test av /resultat, /uppdragsradar, /rapport efter uppgradering. PostHog-spårning verifieras enligt `posthog-daily-check`.

## Tekniska detaljer
- Inga DB-migrations behövs.
- Inga miljövariabler/secrets behövs.
- Inga UI-ändringar (utöver att utloggade som anropar radar-endpoints direkt nu får 401 istället för data – avsiktligt).
- Efter implementation: markera de fyra findings som `mark_as_fixed` via security-tooling.

## Out of scope
- Medium-fynd `vulnerable_dependencies_medium` adresseras delvis automatiskt via posthog/jspdf-uppgraderingen ovan. Övriga medium-fynd lämnas orörda om de inte försvinner naturligt – kan tas i separat omgång.
- RLS-policys på `calloff_imports` / `uppdragsradar_predictions` ändras INTE; vi behåller service-role-pattern med auth-gate i kod (mindre invasivt, samma effekt).
