import { fmt } from "@/shared/formatters";

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
  // Calculate chain
  const hourlyGap = isPermanent ? Math.round(monthlyGap / HOURS_PER_MONTH) : diffHourly;
  const monthly = isPermanent ? monthlyGap : diffHourly * HOURS_PER_MONTH;
  const yearly = monthly * 12;

  if (hourlyGap <= 0 || monthly <= 0) return null;

  return (
    <div className="rounded-2xl bg-foreground text-background p-6 sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-wider text-background/50 mb-4">
        Ditt löneutrymme
      </p>

      <p className="text-lg sm:text-xl font-bold leading-snug">
        Du tjänar{" "}
        <span className="text-primary">{fmt(hourlyGap)} kr/h</span>{" "}
        under marknaden
      </p>

      <div className="mt-4 space-y-1.5 font-mono text-sm sm:text-base text-background/70">
        <p>= <span className="text-background font-bold">{fmt(monthly)} kr</span>/mån</p>
        <p>= <span className="text-background font-bold text-xl sm:text-2xl">{fmt(yearly)} kr</span>/år</p>
      </div>

      <p className="text-xs text-background/40 mt-4">
        {isPermanent
          ? "Baserat på Medlingsinstitutets lönestatistik"
          : `Baserat på ramavtalspriser i ${kommun}`}
      </p>
    </div>
  );
}
