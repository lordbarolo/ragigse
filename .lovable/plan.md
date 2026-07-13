# Plan: Bemlo-källa får aldrig nämnas

## Nuläge
En sökning i hela repot ger **endast två träffar** på "bemlo", båda är SQL-kommentarer i migrationen `supabase/migrations/20260318001114_...sql` (rad 2 och 6, i `source text` kolumn-kommentaren). Inget i UI, edge functions, publika docs (`llms.txt`, `openapi.json`, `agent-api.md`, `radar-api-README.md`), tests eller memories nämner Bemlo. Ingen aktiv import finns.

## Vad som ska göras

### 1. Städa bort Bemlo ur SQL-kommentarerna
Migrationen är redan körd, så vi kan inte redigera den historiskt utan risk. Istället läggs en ny migration som skriver om `COMMENT ON TABLE` / `COMMENT ON COLUMN` för `calloff_imports`:

- `COMMENT ON TABLE public.calloff_imports IS 'Historiska avrop från offentliga källor (avropsplatsen samt data begärd ut från regionerna). Aldrig framtida/live-avrop.'`
- `COMMENT ON COLUMN public.calloff_imports.source IS 'Källa, t.ex. avropsplatsen | region_utlamning | manual'`

Ingen data eller schema ändras – bara kommentarerna. Migrationsfilen från 2026-03-18 lämnas orörd (historiskt korrekt).

### 2. Lås källformuleringen i memory
Ny constraint-memory `mem://constraints/no-bemlo-source` med regeln:

- Bemlo (eller andra tredjepartsaggregatorer) får **aldrig** nämnas som källa i UI, copy, edge functions, docs, kommentarer eller AI-prompts.
- Godkänd formulering för avropsdata utanför Avropsplatsen: **"offentlig data begärd ut från respektive region"** (eller kortform "regionutlämning").
- Gäller även om vi återinför en import senare – importens interna kodnamn får inte läcka till användare.

Indexet uppdateras med raden.

### 3. Förberedelse för ev. återinförd import (ingen kod nu)
Om vi senare bygger en ny import ska den:
- Ligga i egen edge function med generiskt namn (t.ex. `radar-region-ingest`), inte `bemlo-*`.
- Skriva `source = 'region_utlamning'` (eller region-specifikt som `region_vgr_utlamning`) i `calloff_imports`.
- Ha admin-UI som beskriver källan som "Offentlig data begärd ut från regionen".
- Denna del byggs först när du säger till – ingår inte i det här draget.

## Teknisk detalj
- **Ny migration**: 1 fil, endast `COMMENT ON` för tabell + kolumn. Ingen `ALTER TABLE`, inga policies, inga grants (kräver ej eftersom vi bara ändrar metadata).
- **Memory**: 1 ny fil `.lovable/memory/constraints/no-bemlo-source.md` + index-uppdatering.
- **Ingen frontend-kod ändras** eftersom inga UI-strängar innehåller Bemlo idag.

## Utanför scope
- Faktisk återinförd import (görs på separat begäran).
- Ändring av `radar-import` eller `calloff_imports`-schemat.
- Retroaktiv redigering av den gamla migrationsfilen.
