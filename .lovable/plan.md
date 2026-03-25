

# Städning av död kod

## Sammanfattning
Ta bort ~14 oanvända filer och rensa inaktiv logik i `Teaser.tsx` relaterad till den borttagna betalväggen, A/B-tester, exit intent och checkout.

## Filer att radera

| Fil | Anledning |
|-----|-----------|
| `src/components/teaser/TeaserInsights.tsx` | Importeras men renderas aldrig |
| `src/components/teaser/WowHero.tsx` | Importeras men renderas aldrig |
| `src/components/teaser/EarningsBanner.tsx` | Ingen import |
| `src/components/teaser/HighEarnerCard.tsx` | Ingen import |
| `src/components/teaser/IncomeImpactCard.tsx` | Ingen import |
| `src/components/teaser/PermanentBenchmarkCard.tsx` | Ingen import |
| `src/components/teaser/ConsultantVerdictCard.tsx` | Ingen import |
| `src/components/teaser/PaywallOverlay.tsx` | Ingen import (utanför raderade filer) |
| `src/components/teaser/ReferralBottomSheet.tsx` | Ingen import |
| `src/components/teaser/ReferralDialog.tsx` | Ingen import |
| `src/components/ExitIntentReferral.tsx` | Endast importerad i PaywallOverlay (raderas) |
| `src/components/OpportunityGap.tsx` | Ingen import |
| `src/shared/CheckoutCTA.tsx` | Ingen import |
| `src/shared/ReportPreviewList.tsx` | Ingen import (den aktiva versionen ligger i `teaser/`) |
| `src/shared/useCheckout.ts` | Enda import i Teaser.tsx — tas bort därifrån |
| `src/hooks/useExitIntent.ts` | Enda import i Teaser.tsx — tas bort därifrån |

## Rensa i `src/pages/Teaser.tsx`

**Ta bort imports:** `WowHero`, `TeaserInsights`, `useCheckout`, `useExitIntent`

**Ta bort variabler/state:**
- `showInsightsVariant` (A/B-test, rad 52–60)
- `useCheckout()` (rad 39)
- `unlocked` / `partialUnlocked` state (rad 40–41)
- `exitIntentVisible` (rad 74)
- `couponDiscount` / `couponRedeemed` (rad 44–45)
- Hela `useEffect` för referral-check (rad 136–143)
- Hela `useEffect` för coupon-validering (rad 146–165)
- `abVariant` / `priceKr` (rad 167–168)
- `isFree` (rad 194–195)
- `unlockFreeReport` callback (rad 197–215)
- `onCheckout` funktion (kan förenklas eller tas bort helt)
- `nearestHigherKommun` (beräknas men används aldrig i JSX)

## Filer som behålls oförändrade
- `src/components/teaser/ReportPreviewList.tsx` — används i både `Teaser.tsx` och `AnalysisScreen.tsx`
- `src/components/teaser/EmailGate.tsx`, `EmailHookMessage.tsx`, `TeaserHeader.tsx`, `OccupationInfo.tsx`, `MarketDiagnosisCard.tsx` — aktiva komponenter

