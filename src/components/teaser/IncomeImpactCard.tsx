import { useEffect, useRef } from "react";
import { trackEvent } from "@/lib/trackEvent";

interface Props {
  diffHourly: number;
  diffMonthly: number;
  isPermanent: boolean;
  diffPercent?: number;
  userMonthly?: number;
  p75Monthly?: number;
  emailProvided?: boolean;
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
  emailProvided = false,
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

  const blurClass = !emailProvided ? "blur-md select-none" : "";

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <p className="text-caption mb-3">
        Ekonomisk konsekvens
      </p>

      <p className={`text-3xl sm:text-4xl font-black text-foreground tracking-tight ${blurClass}`}>
        {fmt(yearlyGap)} kr/år
      </p>
      <p className="text-body-sm mt-1">
        Din ersättning kan öka med upp till detta belopp
      </p>

      <div className="mt-4 pt-4 border-t border-border">
        <p className="text-body-sm leading-relaxed">
          Se hur vi räknat och få en fullständig analys i din personliga rapport.
        </p>
      </div>
    </div>
  );
}
