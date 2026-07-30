# CompCare

**Detta projekt är löneanalys-flödet.** Allt annat är arkiverat.

Svensk ersättningsintelligens för vårdkonsulter: en användare svarar på en kort
enkät och ser inom 60 sekunder vad regionen betalar enligt SKR:s ramavtal och
vad hen rimligen kan behålla.

## Aktiv yta

| Route | Vad |
|---|---|
| `/` | Landningssida med inline-enkät |
| `/resultat/:leadId` | Teaser + kontogate |
| `/rapport/:reportId` | Personlig rapport |
| `/rapport/<roll>` | Statiska SEO-rapporter (sjuksköterska, 13 läkarspecialiteter m.fl.) |
| `/kampanj/:role` | Kampanjlandningssidor |
| `/consultant/profil` | Inloggad profil |
| `/consultant/forhandla` | Löneassistenten |
| `/logga-in`, `/registrera`, `/aterstall-losenord` | Auth |
| `/vanliga-fragor`, `/integritetspolicy` | Legal |
| `/admin/*`, `/dev/analytics` | Intern admin |

## Läs detta först

| Fil | Innehåll |
|---|---|
| `TERMINOLOGY.md` | **Enda sanningen för namn.** Vad saker heter och vad de aldrig får heta. |
| `CONSOLIDATION.md` | Inventering + vad som arkiverades 2026-07-28 och varför. |
| `src/_archive/README.md` | Hur arkiverad kod återställs. |
| `.lovable/plan.md` | Endast pågående arbete. Ingen historik. |
| `LAUNCH_SNAPSHOT.md` | v1.0-referens. |
| `docs/archive/` | Gamla briefs och säkerhetsrapporter. |

## Teknik

React 18 + Vite + TypeScript + Tailwind (HSL-tokens, aldrig hårdkodade färger),
shadcn/ui. Backend på Lovable Cloud (Postgres + RLS, edge functions i Deno,
pg_cron). AI via Lovable AI Gateway. PostHog för anonym analytics.

## Utveckling

```bash
npm install
npm run dev        # http://localhost:8080
npx vitest run     # tester
```

`src/_archive/` är exkluderat från typecheck och bundlas inte.
