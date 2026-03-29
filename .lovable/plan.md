

## CTA & Navigation Audit — Assessment

### Audit is WRONG on these (no fix needed)

| # | Claim | Reality |
|---|-------|---------|
| 1 | Radar "Bevaka uppdrag" has no onClick | **Has onClick** — scrolls to list + shows instructional toast |
| 5 | Index CTA hardwired to "ssk" | **Opens RoleSelector** via `handleStartSurvey()` — user picks role |
| 6 | ServiceCards always SSK | **Each card has own link** (`/forhandla`, `/fakturakontroll`) or triggers RoleSelector |
| 8 | BottomNav path typo `/referencer` | **Path is `/referenser`** — matches router exactly |

### Audit is RIGHT but already handled

| # | Issue | Status |
|---|-------|--------|
| 2 | ReferenceForm BankID button | **Already disabled** with `pointer-events-none opacity-50 disabled` and "Kommer snart" badge. No fix needed. |

### Audit is RIGHT — but components are unused

| # | Issue | Reality |
|---|-------|---------|
| 3 | ProfileStatusCard `onVerifyBankId` → modal never renders | `ProfileStatusCard` is **not imported in any page**. Dead code — no user impact. |
| 4 | ActionItems `missing_reference` has no handler | `ActionItems` is **not imported in any page**. Dead code — no user impact. |

### Audit is RIGHT — worth fixing

| # | Issue | Severity | Recommended fix |
|---|-------|----------|----------------|
| 7 | Barnmorska prefill `"__barnmorska"` | Low | Verify pricing engine handles this key. If not, map to actual occupation ID. |
| 9 | `pctEarningMore: 25` hardcoded | Low | Label as approximation in UI, or derive from actual percentile data. |
| 10 | LinkedIn share uses `window.location.origin` | Low | Acceptable for production. Only affects local dev — not user-facing. Could add `VITE_APP_URL` env var but low priority. |

### Summary

**4 of 10 findings are factually wrong.** 1 is already handled. 2 reference dead/unused components. Only 3 are legitimate minor issues (all low severity). No broken CTAs or dead-end navigation exist in the live app.

### Recommended action

1. **Clean up dead code** — remove or integrate `ProfileStatusCard` and `ActionItems` (they were built but never wired into Profile.tsx)
2. **Verify `__barnmorska` key** against the pricing engine to ensure it resolves correctly
3. **Add "(uppskattning)" label** next to the hardcoded 25% in the above_market teaser if actual percentile data isn't available

No urgent fixes needed. The app's navigation and CTAs are functional.

