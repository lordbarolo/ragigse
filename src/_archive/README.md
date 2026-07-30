# src/_archive

Arkiverad kod från konsolideringen 2026-07-28 (Fas 3).

- Ingenting här importeras av appen och inget bundlas av Vite.
- Katalogen är exkluderad från typecheck (`tsconfig.app.json` → `exclude`).
- Strukturen speglar den ursprungliga `src/`-strukturen, så en fil kan
  flyttas tillbaka rakt av om spåret återupptas.
- `@/...`-imports inne i arkivet pekar på `src/` och kan därför vara brutna.
  Det är avsiktligt — de repareras först vid en eventuell återställning.

Arkiverade spår: Referly/Ref-ID, Dokhus/Verify, Uppdragsradar, Agency/B2B,
Marketplace, Fakturakontroll, Academy, Eget bolag, AI-chatt, demo-/experimentsidor
samt oanvända landing- och teaser-komponenter.
