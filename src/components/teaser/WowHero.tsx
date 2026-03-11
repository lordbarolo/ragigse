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

        <p className="text-lg sm:text-xl font-bold leading-snug text-background/90">
          Du ligger{" "}
          <span className="text-primary">{fmt(hourlyGap)} kr/h</span>{" "}
          under marknaden
        </p>

        <p className="text-xs text-background/40 mt-3 mb-1 uppercase tracking-wider font-medium">
          Det motsvarar
        </p>

        <div className="space-y-2 font-mono">
          <div className="flex items-baseline gap-3">
            <span className="text-background/50 text-sm w-4 text-right">=</span>
            <span className="text-background font-bold text-xl sm:text-2xl">{fmt(monthly)} kr</span>
            <span className="text-background/50 text-sm">per månad</span>
          </div>
          <div className="flex items-baseline gap-3">
            <span className="text-background/50 text-sm w-4 text-right">=</span>
            <span className="text-primary font-extrabold text-3xl sm:text-4xl">{fmt(yearly)} kr</span>
            <span className="text-background/50 text-sm">per år</span>
          </div>
        </div>
      </div>

      {/* Trust badges */}
      <div className="flex items-center gap-2 px-1">
        <ShieldCheck className="w-3.5 h-3.5 text-primary shrink-0" />
        <p className="text-[11px] text-muted-foreground">
          {isPermanent
            ? "Baserat på Medlingsinstitutets officiella lönestatistik 2024"
            : `Baserat på SKR:s ramavtalspriser 2026 · Officiella regionpriser i ${kommun}`}
        </p>
      </div>
    </div>
  );
}
