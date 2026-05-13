import { useEffect, useMemo, useRef, type ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import {
  validateRange,
  type RangeGuardInput,
  type RangeGuardResult,
} from "@/lib/priceRangeGuard";

interface Props extends RangeGuardInput {
  /** Yt-identifierare för analytics, t.ex. "report.compensation" */
  surface: string;
  /** Render-prop när invariant håller. */
  children: (validated: RangeGuardResult) => ReactNode;
  /** Fallback-UI vid mismatch. Standard = neutralt kort. */
  fallback?: ReactNode;
}

/**
 * Wrappar visning av ett prisspann och säkerställer att det följer
 * pricing-modellen (ramavtal × marginalspann ± 2%). Vid avvikelse:
 * visa fallback och logga `price_range_mismatch`.
 *
 * OBS: Skicka in icke-brusade värden (ej teaser-noise) för validering.
 */
export default function PriceRangeGuard({
  surface,
  children,
  fallback,
  ...input
}: Props) {
  const result = useMemo(() => validateRange(input), [
    input.role,
    input.timpris_kund,
    input.employmentType,
    input.hourly_min,
    input.hourly_max,
    input.employerFactor,
    input.shareOverride?.min,
    input.shareOverride?.max,
  ]);

  const fired = useRef(false);
  useEffect(() => {
    if (result.ok || fired.current) return;
    fired.current = true;
    trackEvent("price_range_mismatch" as any, {
      surface,
      role: input.role ?? null,
      employment_type: input.employmentType,
      timpris_kund: input.timpris_kund ?? null,
      expected_min: result.expected_min,
      expected_max: result.expected_max,
      shown_min: result.shown_min,
      shown_max: result.shown_max,
      shown_min_customer: result.shown_min_customer,
      shown_max_customer: result.shown_max_customer,
      min_deviation_pct: result.min_deviation_pct,
      max_deviation_pct: result.max_deviation_pct,
      mid_deviation_pct: result.mid_deviation_pct,
      reason: result.reason ?? null,
    });
  }, [result, surface, input.role, input.employmentType, input.timpris_kund]);

  if (!result.ok) {
    return (
      <>
        {fallback ?? (
          <Card className="p-4 border border-border bg-muted/30">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-foreground">
                  Vi kunde inte verifiera prisspannet just nu
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Vi uppdaterar inom kort. Kontakta oss om problemet kvarstår.
                </p>
              </div>
            </div>
          </Card>
        )}
      </>
    );
  }

  return <>{children(result)}</>;
}
