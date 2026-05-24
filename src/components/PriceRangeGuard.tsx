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
  /**
   * Teaser-safe mode. Tre lägen:
   *  - "off" (default): validera `hourly_min/max` rakt av.
   *  - "underlying": validera mot `underlyingMin/underlyingMax` (de oförvanskade
   *    värdena innan brus/blur applicerats). Detta är rätt val när UI visar
   *    noised/blurred siffror men de underliggande värdena är deterministiska.
   *  - "bypass": hoppa över validering helt (för rena UI-blur-fall där inga
   *    siffror exponeras). Loggar `price_range_guard_bypassed` för audit.
   */
  teaserMode?: "off" | "underlying" | "bypass";
  /** Underliggande (oförvanskade) värden — krävs vid teaserMode="underlying". */
  underlyingMin?: number | null;
  underlyingMax?: number | null;
}

/**
 * Wrappar visning av ett prisspann och säkerställer att det följer
 * pricing-modellen (ramavtal × marginalspann ± 2%). Vid avvikelse:
 * visa fallback och logga `price_range_mismatch`.
 *
 * Teaser-flöden: använd `teaserMode="underlying"` med `underlyingMin/Max` så
 * guarden validerar de oförvanskade värdena medan UI visar noised siffror.
 * Använd `teaserMode="bypass"` om hela kortet är blurat och inga konkreta
 * siffror når användaren.
 */
export default function PriceRangeGuard({
  surface,
  children,
  fallback,
  teaserMode = "off",
  underlyingMin,
  underlyingMax,
  ...input
}: Props) {
  // Välj vilka värden som ska valideras
  const validationInput: RangeGuardInput = useMemo(() => {
    if (teaserMode === "underlying") {
      return {
        ...input,
        hourly_min: underlyingMin ?? input.hourly_min,
        hourly_max: underlyingMax ?? input.hourly_max,
      };
    }
    return input;
  }, [
    teaserMode,
    underlyingMin,
    underlyingMax,
    input.role,
    input.timpris_kund,
    input.employmentType,
    input.hourly_min,
    input.hourly_max,
    input.employerFactor,
    input.shareOverride?.min,
    input.shareOverride?.max,
  ]);

  const result = useMemo(
    () => (teaserMode === "bypass" ? null : validateRange(validationInput)),
    [teaserMode, validationInput],
  );

  const fired = useRef(false);
  useEffect(() => {
    if (teaserMode === "bypass") {
      // Audit-trail: en bypass per mount
      if (!fired.current) {
        fired.current = true;
        // Re-använd allowed event-namnet "price_range_mismatch" är fel — gör det
        // tyst i konsolen istället för att skapa stört signal-brus.
        if (import.meta.env.DEV) {
          // eslint-disable-next-line no-console
          console.debug("[PriceRangeGuard] bypass", { surface });
        }
      }
      return;
    }
    if (!result || result.ok || fired.current) return;
    fired.current = true;
    trackEvent("price_range_mismatch" as any, {
      surface,
      teaser_mode: teaserMode,
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
  }, [result, surface, teaserMode, input.role, input.employmentType, input.timpris_kund]);

  // Bypass: render utan validering
  if (teaserMode === "bypass") {
    return <>{children({
      ok: true,
      expected_min: 0, expected_max: 0,
      shown_min: input.hourly_min ?? 0, shown_max: input.hourly_max ?? 0,
      shown_min_customer: 0, shown_max_customer: 0,
      expected_mid: 0, shown_mid_customer: 0,
      min_deviation_pct: 0, max_deviation_pct: 0, mid_deviation_pct: 0,
    })}</>;
  }

  if (!result?.ok) {
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
