import type { BetaTier } from "@/lib/beta/types";

const TIER_CLASS: Record<BetaTier, string> = {
  green: "text-success",
  yellow: "text-warning",
  red: "text-destructive",
};

export function BetaMarginGauge({ margin, tier }: { margin: number; tier: BetaTier }) {
  const nonPositive = margin < 0;
  const clamped = nonPositive ? 0 : Math.min(45, Math.max(0, margin));
  const circumference = 2 * Math.PI * 52;
  const dashOffset = circumference * (1 - clamped / 45);

  return (
    <div className="flex flex-col items-center text-center">
      <div className={`relative h-40 w-40 ${nonPositive ? "text-muted-foreground" : TIER_CLASS[tier]}`}>
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={nonPositive ? "Erbjudandet ligger över takpriset" : `Beräknad marginal ${Math.round(margin)} procent`}>
          <circle cx="60" cy="60" r="52" fill="none" stroke="currentColor" strokeOpacity="0.15" strokeWidth="8" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={dashOffset}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-4xl font-semibold text-foreground">{nonPositive ? "—" : `${Math.round(margin)} %`}</span>
        </div>
      </div>
      <p className="mt-3 text-sm font-medium">Byråns beräknade bruttomarginal</p>
      {nonPositive && <p className="mt-1 max-w-52 text-xs text-muted-foreground">Erbjudandet ligger över takpriset</p>}
    </div>
  );
}
