---
name: Rate slug aliases (synonymfallback)
description: lookup_rate faller tillbaka på public.rate_slug_aliases (synonym-slug → exakt yrkeskategori) — inte role_aliases, som bara innehåller SSYK-grupper.
type: feature
---

`public.lookup_rate(specialty_slug, location_slug)` matchar först exakt på
`contract_version_rates.yrkeskategori` (via `cc_slugify`) och faller sedan tillbaka på
tabellen `public.rate_slug_aliases` (`alias_slug` → `yrkeskategori`, 1:1).

- `role_aliases`/`roles` kan INTE användas för prisuppslag: `roles.name` är SSYK-grupper
  ("Övriga specialistsjuksköterskor", "Specialistläkare") som bryter mot regeln om att
  roller aldrig får benämnas som grupp och saknar prisrader.
- `rate_slug_aliases` är låst: RLS på, inga policyer, endast `service_role`-grant.
  Läses bara av SECURITY DEFINER-funktioner.
- Migrationen validerar varje alias mot aktiv avtalsversion och avvisar grupprubriker
  (Grupp A/B, "Annan specialistläkarkompetens", OB-tillägg, bara "Specialistläkare"/
  "Specialistsjuksköterska").
- `lookup_rate` returnerar alltid det officiella rollnamnet, aldrig synonymen.
- Nya synonymer läggs till med INSERT i `rate_slug_aliases` — aldrig med fuzzy matchning.
