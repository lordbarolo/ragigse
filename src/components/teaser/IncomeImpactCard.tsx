import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  /** Hourly gap (market - user) in SEK */
  diffHourly: number;
  /** Monthly gap in SEK */
  diffMonthly: number;
  /** Whether this is permanent track */
  isPermanent: boolean;
  /** Diff percent for permanent track */
  diffPercent?: number;
  /** User monthly salary for permanent track */
  userMonthly?: number;
  /** P75 monthly for permanent track */
  p75Monthly?: number;
}

function fmt(v: number): string {
  return v.toLocaleString("sv-SE");
}

export default function IncomeImpactCard({
  diffHourly,
  diffMonthly,
  isPermanent,
  diffPercent = 0,
  userMonthly = 0,
  p75Monthly = 0,
}: Props) {
  const trackedRef = useRef(false);

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("income_impact_shown" as any, {
        diff_hourly: diffHourly,
        diff_monthly: diffMonthly,
        is_permanent: isPermanent,
      });
    }
  }, []);

  const yearlyGap = isPermanent
    ? (p75Monthly - userMonthly) * 12
    : diffMonthly * 12;

  const monthlyGap = isPermanent
    ? p75Monthly - userMonthly
    : diffMonthly;

  if (monthlyGap <= 0) return null;

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
        Ekonomisk konsekvens
      </p>

      <p className="text-3xl sm:text-4xl font-black text-foreground tracking-tight">
        {fmt(yearlyGap)} kr
      </p>
      <p className="text-sm text-muted-foreground mt-1">
        Så mycket mer kan du tjäna per år
      </p>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-sm text-muted-foreground leading-relaxed">
          {isPermanent
            ? `Kollegor i din yrkesgrupp som ligger i övre kvartilen tjänar ${fmt(monthlyGap)} kr mer per månad.`
            : `Det motsvarar ungefär ${fmt(monthlyGap)} kr mer per månad, eller ${fmt(diffHourly)} kr/h.`
          }
        </p>
      </div>
    </div>
  );
}
