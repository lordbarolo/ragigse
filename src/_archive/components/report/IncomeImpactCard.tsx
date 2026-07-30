import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmt } from "@/shared/formatters";

interface Props {
  currentHourly: number;
  recommendedMin: number;
  recommendedMax: number;
  isEmployee: boolean;
  /** Hours per month assumed for annualization. Default 167 per income-impact-assumptions. */
  hoursPerMonth?: number;
}

/**
 * Översätter timpris-skillnaden till konkreta kronor per år (167 h/mån × 12).
 * - Huvudsiffra: skillnad mot marknadsmedian (kan vara negativ)
 * - Sekundär rad: potential upp till övre marknadsspann
 *
 * Respekterar mem://logic/negotiation-safety-threshold:
 * Om användaren redan ligger över övre spann visas inte potential-raden
 * (den skulle annars rekommendera en LÄGRE nivå än användaren har).
 */
export default function IncomeImpactCard({
  currentHourly,
  recommendedMin,
  recommendedMax,
  isEmployee,
  hoursPerMonth = 167,
}: Props) {
  const median = Math.round((recommendedMin + recommendedMax) / 2);
  const annualHours = hoursPerMonth * 12;

  const diffVsMedianHourly = median - currentHourly;
  const diffVsMedianYearly = diffVsMedianHourly * annualHours;

  const potentialHourly = Math.max(0, recommendedMax - currentHourly);
  const potentialYearly = potentialHourly * annualHours;

  const isAtOrAboveCeiling = currentHourly >= recommendedMax;
  const isAtOrAboveMedian = diffVsMedianYearly <= 0;

  // Visual state: gold/positive when there's headroom, neutral when on par, muted-red when below
  const accentColor = isAtOrAboveMedian ? "text-foreground" : "text-amber-500 dark:text-amber-400";
  const Icon = diffVsMedianYearly > 0 ? TrendingUp : diffVsMedianYearly < 0 ? TrendingDown : Minus;

  const headlineLabel = isAtOrAboveMedian
    ? "Du ligger på eller över marknadsmedianen"
    : isEmployee
      ? "Skillnad mot marknadsmedianen, per år"
      : "Förlorad ersättning mot marknadsmedianen, per år";

  return (
    <div className="rounded-2xl border border-foreground/10 bg-gradient-to-br from-foreground/[0.04] to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <Icon className={`w-4.5 h-4.5 ${accentColor === "text-foreground" ? "text-primary" : accentColor}`} />
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-micro font-semibold tracking-[0.8px] uppercase text-muted-foreground mb-1">
            Årlig påverkan
          </p>

          {/* Huvudsiffra: skillnad mot median */}
          <p className="text-[26px] sm:text-[28px] font-bold tracking-tight leading-none text-foreground">
            {isAtOrAboveMedian ? "✓" : `${fmt(Math.abs(diffVsMedianYearly))} kr`}
          </p>

          <p className="text-body-sm mt-1 leading-snug">
            {headlineLabel}
          </p>

          {/* Sekundär rad: potential upp till övre spann */}
          {!isAtOrAboveCeiling && potentialYearly > 0 && (
            <div className="mt-3 pt-3 border-t border-foreground/[0.06]">
              <p className="text-hint leading-relaxed">
                Förhandlingspotential upp till övre möjlig ersättning:{" "}
                <span className="font-semibold text-foreground">
                  {fmt(potentialYearly)} kr/år
                </span>
              </p>
            </div>
          )}

          <p className="text-micro text-muted-foreground/70 mt-2.5">
            Beräknat på {hoursPerMonth} h/månad × 12 månader.
          </p>
        </div>
      </div>
    </div>
  );
}
