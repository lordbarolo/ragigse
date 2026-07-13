---
name: No Bemlo Source Reference
description: Bemlo och andra tredjepartsaggregatorer får aldrig anges som källa. Använd "offentlig data begärd ut från respektive region".
type: constraint
---

Bemlo (eller andra tredjepartsaggregatorer/scrapers) får **aldrig** nämnas som källa någonstans — UI-copy, edge functions, publika docs (llms.txt, openapi.json, agent-api.md), SQL-kommentarer, admin-UI eller AI-prompts.

**Godkända källformuleringar för avropsdata:**
- "Avropsplatsen" (för data därifrån)
- "Offentlig data begärd ut från respektive region" (kortform: "regionutlämning")
- Region-specifikt: t.ex. "Utlämning från Region Stockholm"

**Om vi återinför en import senare:**
- Edge function måste ha generiskt namn (t.ex. `radar-region-ingest`), aldrig `bemlo-*`.
- `calloff_imports.source` skrivs som `region_utlamning` eller `region_<kod>_utlamning`, aldrig `bemlo`.
- Admin-UI beskriver källan som "Offentlig data begärd ut från regionen".
- Internt kodnamn på leverantör/scraper får inte läcka till användare eller loggar som exponeras.

**Why:** Vi vill inte associeras direkt med tredjepartsaggregatorer och deras juridiska/etiska frågor. Legitim grund för datan är offentlighetsprincipen — det ska framgå.
