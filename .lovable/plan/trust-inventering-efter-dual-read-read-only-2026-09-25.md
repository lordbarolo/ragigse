# Trust: inventering efter dual-read (read-only)

## Status

| # | Del | Status | Var |
|---|-----|--------|-----|
| 1 | Publik share-read | BUILT | `src/routes/api/public/trust/share.$token.ts` (GET), `src/lib/trust/share.server.ts` (`resolveGrant`, `readSharedCredentials`, `serviceClient`), migration 0010 (`trust_create_share_grant`, `trust_resolve_share_grant`, `trust_revoke_share_grant`, append-only-trigger på accessloggen) |
| 2 | Attestation/revalidation | BUILT | `src/routes/api/public/trust/attest.$token.ts` (POST, skriver bara `attested`/`reconfirmed`-händelser, länken bränns efter sparat svar). Statusändring sker bara via `trust_transition_credential` (0006/0007) |
| 3 | Requirement-tabeller + evaluator | PARTIAL | Tabellerna `trust_requirement_sets`, `trust_requirements` och RPC `trust_evaluate_requirements` finns (0011, EXECUTE för authenticated). Ingen kod anropar den och det finns inga seedade kravset i kod |
| 4 | Writes via trust / dual-write bakom flagga | NOT BUILT | Ingen dual-write-väg och ingen trust-flagga (`FeatureFlagKey` har bara `marketplace_enabled`). Trust fylls bara via projektion/backfill (0013–0015) plus `trust_create_self_asserted_credential` (0006), som ingen produktkod anropar |
| 5 | Pensionering/cutover | NOT BUILT | Legacy (`consultant_documents`, `consultant_references`) styr fortfarande. `read.server.ts` och `dualRead.server.ts` används inte i produktflöden |
| 6 | Agent/MCP-exponering | NOT BUILT | Ingen agent-funktion och ingen `/api`-route läser `trust_*` |

Övrigt: dual-read (0016 + `dualRead.server.ts`) är byggt, men det finns ingen schemalagd körning. Skillnaden `issuer_verified` (read.server) och `document_verified` (adapter) finns kvar.

Avvikelse från beslutad ordning: steg 1–2 byggdes före steg 3, trots att ordningen var requirement engine först.

## Nästa ej byggda slice

**Writes via trust (dual-write) bakom feature flag.** Detta är nästa steg i ordningen hardening → share-datamodell → requirements → backfill → dual-read → share/attestation → **writes via trust** → pensionering.

Innehåll (implementeras först efter separat godkännande):
- En ny runtime-flagga `trust_dual_write_enabled` med standardläge AV, via samma dubbla spärr som `featureFlags.ts`.
- När legacy skriver till `consultant_documents` eller `consultant_references` körs befintlig projektion (`trust_project_consultant_*`) på servern. Det sker idempotent, och legacy fortsätter vara primär källa.
- Dual-read-loggen används som kontroll på att inga nya avvikelser uppstår.
- Ingen ändring i UI, i livscykeln eller i assurance-nivåerna.

Beslut som behövs innan dess:
1. Ska evaluatorn i steg 3 först kopplas till kod och seedade kravset, så att ordningen blir hel?
2. Ska skillnaden mellan `issuer_verified` och `document_verified` lösas före dual-write?
