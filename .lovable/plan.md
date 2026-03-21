

## Plan: Åtgärda 5 lösa trådar från sessionen

### 1. Rate limiting på salary-negotiation-agent
Agenten gör dyra AI-anrop men saknar rate limiting. Lägg till `checkRateLimit` (redan finns i `_shared/rateLimit.ts`) i agentens main handler med en gräns på ~20 req/IP/timme.

**Fil:** `supabase/functions/salary-negotiation-agent/index.ts`

---

### 2. Analytics-tracking i chatten
Lägg till nya event-namn i `trackEvent` och kalla dem från `useNegotiationChat`:
- `negotiation_started` — när första meddelandet skickas
- `negotiation_message_sent` — varje meddelande
- `negotiation_advice_received` — lyckat svar med capabilities_used

**Filer:** `src/lib/trackEvent.ts`, `src/hooks/useNegotiationChat.ts`

---

### 3. Navigation till /forhandla
Lägg till en "Förhandla"-länk i `Navbar.tsx` (bredvid profil/logga in). Alternativt som en sekundär CTA i teaser/report-sidorna om det passar bättre — men navbar ger synlighet för alla sidor.

**Fil:** `src/components/Navbar.tsx`

---

### 4. Sitemap-uppdatering
Lägg till `/forhandla` i `public/sitemap.xml`.

**Fil:** `public/sitemap.xml`

---

### 5. SEO-metadata för /forhandla
Sätt `document.title` och en meta description via `useEffect` i `Negotiate.tsx`. Lägg till JSON-LD som beskriver tjänsten som ett AI-verktyg för löneförhandling.

**Fil:** `src/pages/Negotiate.tsx`

---

### Ordning
Rate limiting först (säkerhet), sedan analytics, navigation, sitemap och metadata.

