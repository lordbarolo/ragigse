import { useEffect, useState } from "react";

/**
 * Salary position card — shows percentage of market rate
 * with color-coded label (red/yellow/green).
 */
export default function SalaryGauge({
  currentHourly,
  marketLow,
  marketHigh,
  blurred = false,
}: {
  currentHourly: number;
  marketLow: number;
  marketHigh: number;
  blurred?: boolean;
}) {
  const [animatedPercent, setAnimatedPercent] = useState(0);

  // Percent of market high
  const rawPercent = marketHigh > 0 ? Math.round((currentHourly / marketHigh) * 100) : 0;
  const percent = Math.max(0, Math.min(150, rawPercent));

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedPercent(percent), 100);
    return () => clearTimeout(timer);
  }, [percent]);

  let label: string;
  let labelColor: string;
  let bgColor: string;
  if (percent < 80) {
    label = "Under marknad";
    labelColor = "text-destructive";
    bgColor = "bg-destructive/10";
  } else if (percent < 95) {
    label = "Nära marknad";
    labelColor = "text-yellow-600 dark:text-yellow-400";
    bgColor = "bg-yellow-500/10";
  } else {
    label = "I nivå med marknad";
    labelColor = "text-accent";
    bgColor = "bg-accent/10";
  }

  const fmt = (v: number) => v.toLocaleString("sv-SE");

  return (
    <div className="relative">
      {blurred && (
        <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl">
          <div className="backdrop-blur-md bg-card/70 rounded-xl p-5 text-center border border-border max-w-[260px]">
            <p className="text-sm font-semibold text-foreground">Lås upp för att se var du ligger</p>
            <p className="text-xs text-muted-foreground mt-1">i förhållande till marknaden</p>
          </div>
        </div>
      )}

      <div className={blurred ? "blur-sm select-none pointer-events-none" : ""}>
        {/* Main percentage */}
        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
            Din position relativt marknad
          </p>
          <div className="flex items-baseline justify-center gap-1">
            <span
              className="text-5xl sm:text-6xl font-extrabold tracking-tighter text-foreground transition-all duration-1000"
            >
              {animatedPercent}
            </span>
            <span className="text-2xl font-bold text-muted-foreground">%</span>
          </div>
          <span className={`inline-block text-xs font-semibold px-3 py-1 rounded-full ${labelColor} ${bgColor}`}>
            {label}
          </span>
        </div>

        {/* Comparison row */}
        <div className="grid grid-cols-2 gap-4 mt-6">
          <div className="rounded-lg border border-border p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Din lön</p>
            <p className="text-lg font-bold text-foreground">{fmt(currentHourly)} kr/h</p>
          </div>
          <div className="rounded-lg border border-primary/20 bg-primary/5 p-3 text-center">
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider mb-1">Marknadsvärde</p>
            <p className="text-lg font-bold text-primary">{fmt(marketHigh)} kr/h</p>
          </div>
        </div>
      </div>
    </div>
  );
}
