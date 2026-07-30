# Konsolideringsprocess — CompCare

Mål: Ta tillbaka kontrollen utan att röra det som fungerar (löneanalys-flödet + auth + admin). Allt annat granskas, döps om enhetligt eller raderas.

Vi kör i 5 tydliga faser. Efter varje fas stannar jag och väntar på ditt godkännande innan nästa startar. Ingenting raderas utan din OK.

---

## Fas 1 — Inventering (läsa, inte röra)

Jag producerar **ett** dokument, `CONSOLIDATION.md`, med:

- **Aktiv yta**: Varje route i `src/App.tsx` klassad som `KEEP` / `REDIRECT` / `DEAD`.
- **Filkarta**: Varje mapp under `src/pages`, `src/components`, `src/hooks`, `supabase/functions` klassad likadant.
- **Terminologikonflikter**: Alla par som Verify/Dokhus/Din data, Referly/Ref-ID, ping/pling, Marketplace, agent/assistent — med nuvarande förekomster i kod och UI.
- **Minnesredundans**: Vilka `mem://`-poster som motsäger varandra eller är föråldrade.
- **DB-yta**: Tabeller utan referenser i frontend eller edge functions.

Leverabel: en enda markdown-fil. Ingen kodändring.

## Fas 2 — Beslutsrunda (du bestämmer)

Du går igenom `CONSOLIDATION.md` och markerar per rad: `behåll`, `radera`, `senare`. Jag ställer max 4 frågor via `ask_questions` för de tvetydiga fallen (t.ex. "Ska `/agency/*`-koden raderas eller frysas?").

Leverabel: ett godkänt beslutsunderlag. Ingen kodändring.

## Fas 3 — Radering (mekanisk, i småbitar)

Vi kör raderingen i **max 3 commits**, en per kategori:

1. Döda routes + tillhörande sidor/komponenter/hooks.
2. Döda edge functions + oanvända DB-objekt (via migration, med backup-notering).
3. Döda memory-poster + gamla `.md`-filer i repo-roten (`AUDIT_BRIEF.md`, gamla `security-reports`, etc.).

Efter varje commit: build + typecheck + snabb Playwright-smoke på `/`, `/logga-in`, `/consultant/profil`, `/rapport/sjukskoterska`.

Leverabel: mindre kodbas, samma beteende på KEEP-ytan.

## Fas 4 — Namnlåsning

En fil, `TERMINOLOGY.md`, i repo-roten som är **enda sanningen** för UI-namn:

```text
Dokhus         → "Din data" (route: /din-data)
Samarbetsintyg → route: /samarbetsintyg/:id
Ref-ID         → tidigare "Referly"
Pling          → tidigare "ping"
Löneassistenten, Fakturakontroll, Uppdragsradar → oförändrade
```

Jag uppdaterar `mem://index.md` så Core pekar på filen i stället för att duplicera reglerna. Backend-namn (tabeller, functions) rörs inte.

Leverabel: en fil + rensad memory-index.

## Fas 5 — Låsning

- `.lovable/plan.md` töms och blir en levande "nuvarande arbete"-lista, inte historik.
- Gamla planer/överlämningar arkiveras under `docs/archive/`.
- En kort `README.md` på toppen: "Detta projekt = löneanalys-flödet. Allt annat är arkiverat."

Leverabel: entydig ingång för både dig och framtida agent-sessioner.

---

## Regler under hela processen

- **Scope lock**: Inget rörs utanför den fas vi är i.
- **Ingen backend-riskfas utan explicit OK**: DB-migrations i Fas 3 kräver separat godkännande.
- **Rollback**: Varje fas är en egen commit så du kan reverta via History-fliken.
- **Tidsåtgång**: Fas 1 ~1 tur. Fas 2 ~1 tur. Fas 3 ~3 turer. Fas 4–5 ~1 tur vardera.

## Nästa steg

Godkänner du planen kör jag Fas 1 direkt och levererar `CONSOLIDATION.md` i nästa svar.
