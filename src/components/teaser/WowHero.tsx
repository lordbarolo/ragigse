import { fmt } from "@/shared/formatters";
import { ShieldCheck, TrendingDown } from "lucide-react";

interface Props {
  /** Hourly gap (user vs market recommended max) */
  diffHourly: number;
  /** Whether user is on permanent track */
  isPermanent: boolean;
  /** For permanent: monthly gap vs P75 */
  monthlyGap?: number;
  /** User's kommun */
  kommun: string;
}

const HOURS_PER_MONTH = 167;

export default function WowHero({ diffHourly, isPermanent, monthlyGap = 0, kommun }: Props) {
  const hourlyGap = isPermanent ? Math.round(monthlyGap / HOURS_PER_MONTH) : diffHourly;
  const monthly = isPermanent ? monthlyGap : diffHourly * HOURS_PER_MONTH;
  const yearly = monthly * 12;

  if (hourlyGap <= 0 || monthly <= 0) return null;

  return (
    <div className="space-y-3">
      <div className="rounded-2xl bg-foreground text-background p-6 sm:p-8">
        <div className="flex items-center gap-2.5 mb-5">
          <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center">
            <TrendingDown className="w-4 h-4 text-accent" />
          </div>
          <p className="text-sm font-bold uppercase tracking-wider text-accent">
            Din ersättning ligger under marknaden
          </p>
        </div>

        <p className="text-body-sm text-background/60 font-medium">
          Du kan tjäna upp till
        </p>
        <p className="text-3xl sm:text-4xl font-extrabold text-primary tracking-tight font-mono mt-1">
          {fmt(monthly)} kr
        </p>
        <p className="text-body-sm text-background/60 font-medium mt-0.5">
          mer per månad
        </p>

        <div className="mt-5 pt-4 border-t border-background/10 space-y-2 font-mono">
          <div className="flex items-baseline gap-3">
            <span className="text-background/50 text-sm w-4 text-right">=</span>
            <span className="text-background font-bold text-lg">{fmt(hourlyGap)} kr/h</span>
            <span className="text-background/50 text-sm">under marknaden</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-background/50 text-sm w-4 text-right">=</span>
            <span className="text-primary font-bold text-2xl sm:text-3xl">{fmt(yearly)} kr</span>
            <span className="text-background/50 text-sm">per år</span>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex items-center justify-center gap-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-caption">Officiella ramavtalspriser</span>
        </div>
        <div className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-caption">Beräknat i realtid</span>
        </div>
      </div>
    </div>
  );
}
