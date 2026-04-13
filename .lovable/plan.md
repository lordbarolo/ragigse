

## Plan: Korrigera STORHELG_2026 i invoice-analyzer

### Problem

Nuvarande `STORHELG_2026`-lista i `supabase/functions/invoice-analyzer/index.ts` (rad 10-14) innehåller felaktiga datum. Enligt ramavtalet ska storhelg avse exakt dessa 12 dagar:

```text
Nyårsdagen, trettondagen, långfredagen, påskdagen, annandag påsk,
midsommardagen, juldagen, annandagen,
påskafton, midsommarafton, julafton och nyårsafton.
```

### Nuvarande fel

- `2026-04-02` (skärtorsdag) — **inte storhelg**
- `2026-05-01` (första maj) — helgdag, inte storhelg
- `2026-05-14` (kristi himmelsfärdsdag) — helgdag, inte storhelg
- `2026-05-24` — varken storhelg eller helgdag
- `2026-06-06` (nationaldagen) — helgdag, inte storhelg
- `2026-10-31` (alla helgonsdag) — helgdag, inte storhelg
- `2026-04-04` (påskafton) — **saknas**, ska vara storhelg

### Ändring

Ersätt `STORHELG_2026` med korrekt lista (12 dagar):

| Datum | Dag |
|-------|-----|
| 2026-01-01 | Nyårsdagen |
| 2026-01-06 | Trettondagen |
| 2026-04-03 | Långfredagen |
| 2026-04-04 | Påskafton |
| 2026-04-05 | Påskdagen |
| 2026-04-06 | Annandag påsk |
| 2026-06-19 | Midsommarafton |
| 2026-06-20 | Midsommardagen |
| 2026-12-24 | Julafton |
| 2026-12-25 | Juldagen |
| 2026-12-26 | Annandagen |
| 2026-12-31 | Nyårsafton |

Lägg dessutom till en separat `HELGDAG_2026`-lista för de fyra helgdagarna (första maj, kristi himmelsfärdsdag, nationaldagen, alla helgonsdag) och uppdatera `isHelgdag()` att kontrollera lördag, söndag **eller** `HELGDAG_2026`.

### Fil som ändras

- `supabase/functions/invoice-analyzer/index.ts` — rad 10-14 (STORHELG), ny HELGDAG-konstant, uppdaterad `isHelgdag()`

