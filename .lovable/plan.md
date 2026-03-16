

## Problem

The teaser view uses a "locked" metaphor (Lock icons, "Lås upp" text, blurred content) to gate the email collection. This feels restrictive and transactional. The user wants a friendlier approach to explaining why we collect email.

## Where the lock appears

1. **AnalysisScreen.tsx** (lines 399–427): A "locked negotiation row" with a `Lock` icon, "Ditt förhandlingsutrymme" label, and "Lås upp" CTA. Clicking without email shakes the input and shows an error toast.
2. **Teaser.tsx** (lines 550–558): The email gate card uses `border-primary/30` framing that feels like a paywall boundary.
3. **BlurredReportTeaser.tsx** and **LockedStrategyCard.tsx**: Not currently imported in Teaser.tsx but contain Lock icons and blur overlays.

## Plan

### 1. AnalysisScreen — Replace locked row with a friendly "continue" prompt

Remove the Lock icon + "Lås upp" row (lines 399–427). Replace it with a softer message below the two visible metrics:

- Instead of a locked row, show a subtle divider and text: **"Ange din e-post så skickar vi hela analysen direkt"** — no lock icon, no "unlock" language.
- Use a `Mail` icon instead of `Lock` to signal "we'll email you the full report."
- Remove the shake animation + error toast on click. Instead the email input already has focus.

### 2. Teaser.tsx — Soften the email gate framing

- Change `border-primary/30` wrapper to a gentler `bg-foreground/[0.02]` card without a colored border (matching the ReportPreviewList card style).
- Update `EmailHookMessage` text: keep the market position insight but change the CTA line from "Ange din e-post för att få hela analysen" to something warmer like **"Vi skickar den fullständiga analysen till din e-post — helt kostnadsfritt."**

### 3. EmailHookMessage.tsx — Remove "Ange din e-post" imperative

Change the bottom CTA text (line ~100) from "Ange din e-post för att få hela analysen." to a softer value statement that explains the benefit rather than commanding: **"Rapporten skickas direkt till din inkorg."**

### 4. Clean up unused lock components

- Delete `BlurredReportTeaser.tsx` and `LockedStrategyCard.tsx` since neither is imported anywhere.

### Files modified

- `src/pages/AnalysisScreen.tsx` — replace locked row with friendly mail prompt
- `src/pages/Teaser.tsx` — soften email gate card styling
- `src/components/teaser/EmailHookMessage.tsx` — friendlier CTA text
- `src/components/teaser/BlurredReportTeaser.tsx` — delete
- `src/components/teaser/LockedStrategyCard.tsx` — delete

