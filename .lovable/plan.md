## Diagnos

För rapport `c631b173-…` är `status='preview'`, `unlocked_by_referral=false`, ägare `b3ccb369-…`. Edge-funktionen `get-report` returnerar då **utan** `result_json` (teaser-läge — korrekt PII-skydd).

Men `Report.tsx` hanterar inte teaser-läget:

```ts
const r = report.result_json;          // undefined
<ConsultantTrackContent r={r} ... />   // r.market → TypeError → komponenten kraschar
```

Resultat: header + Förhandlingsassistent-kort + "Vad är möjlig ersättning?"-kortet renderas, sen kastas resten bort när `ConsultantTrackContent` läser `r.market`. Det är exakt vad skärmdumpen visar.

Två separata problem ligger bakom att det inträffar för dig som inloggad ägare:

1. **Ingen teaser-fallback** i `Report.tsx`. Även för icke-ägare ska sidan visa något vettigt, inte krascha.
2. **Ägar-detektering misslyckas troligen i edge-funktionen.** `supabase.functions.invoke("get-report", { body })` skickar JWT automatiskt, men i nuvarande kod hämtas session först (rad 63) utan att användas. Om sessionen inte är klar när `useEffect` körs (race med auth-init) får funktionen ingen Authorization-header → `authUserId = null` → `fullAccess = false` → teaser även för ägaren. Detta matchar vårt kända mönster (se Lovable Stack Overflow-noten om auth-race + `enabled`).

## Plan

### 1. `src/pages/Report.tsx` — vänta på auth + skicka header explicit
- Importera `useAuthReady` (eller motsvarande) — om den inte finns, vänta på `supabase.auth.getSession()` resolver innan fetch:en startar.
- Skicka Authorization explicit till edge-funktionen:
  ```ts
  const { data: { session } } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke("get-report", {
    body: { report_id: reportId },
    headers: session?.access_token
      ? { Authorization: `Bearer ${session.access_token}` }
      : undefined,
  });
  ```
- Re-fetch när `user?.id` ändras (lägg till i dependency-arrayen) så att en sen inloggning triggar omhämtning.

### 2. `src/pages/Report.tsx` — teaser-fallback (skydd mot framtida krascher)
När `report.result_json` saknas (icke-ägare, ej betalt, ej referral-unlocked):
- Rendera header + Förhandlingsassistent-kortet + `PossibleCompensationInfo` som idag.
- **Hoppa över** `ConsultantTrackContent` och utility-actions.
- Visa istället ett tydligt "Logga in för att se din analys"-kort (med CTA till `/logga-in?redirect=/rapport/:id`) — neutral copy, inga värdeladdade ord.

### 3. Verifiering
- Bygg-output går grönt.
- Öppna `/rapport/c631b173-…` inloggad som ägaren → full rapport.
- Öppna samma URL utloggad → header + teaser-CTA, ingen tom sida.
- Edge-loggar visas inga fel.

## Tekniska detaljer

- Ingen DB/RLS-ändring; endast frontend + möjligen Authorization-header.
- Edge-funktionens behörighetslogik (paid / referral / owner) lämnas oförändrad — den är korrekt enligt project-knowledge.
- Inga texter på `/resultat`/teaser bryter mot neutralitets-/SCB-/peer-comparison-reglerna.
