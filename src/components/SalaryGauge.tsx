import { useEffect, useState } from "react";

/**
 * Half-circle salary gauge with animated needle.
 * Segments: Red (0-33%), Yellow (34-66%), Green (67-100%).
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
  const [animatedAngle, setAnimatedAngle] = useState(0);

  // 0% = 20% below marketLow, 50% = marketLow, 100% = marketHigh
  const floor = marketLow * 0.8;
  const range = marketHigh - floor;
  const rawPercent = range > 0 ? ((currentHourly - floor) / range) * 100 : 50;
  const percent = Math.max(0, Math.min(100, rawPercent));

  // Map percent to angle: 0% = -90° (left), 100% = 90° (right)
  const targetAngle = -90 + (percent / 100) * 180;

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedAngle(targetAngle), 100);
    return () => clearTimeout(timer);
  }, [targetAngle]);

  let label: string;
  let labelColor: string;
  if (percent < 33) {
    label = "Röda";
    labelColor = "text-destructive";
  } else if (percent < 67) {
    label = "Gula";
    labelColor = "text-yellow-600 dark:text-yellow-400";
  } else {
    label = "Gröna";
    labelColor = "text-accent";
  }

  const fmt = (v: number) => v.toLocaleString("sv-SE");

  // SVG dimensions
  const cx = 140;
  const cy = 130;
  const r = 100;
  const strokeWidth = 22;

  // Arc helper: angle in degrees (-90 = left, 90 = right)
  const polarToCart = (angleDeg: number) => {
    const rad = (angleDeg * Math.PI) / 180;
    return {
      x: cx + r * Math.cos(rad),
      y: cy + r * Math.sin(rad),
    };
  };

  const arcPath = (startDeg: number, endDeg: number) => {
    // SVG arcs: 0° = right, we rotate -90 so our 0% is left
    const s = polarToCart(startDeg - 180);
    const e = polarToCart(endDeg - 180);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;
    return `M ${s.x} ${s.y} A ${r} ${r} 0 ${largeArc} 1 ${e.x} ${e.y}`;
  };

  // Needle endpoint
  const needleAngleRad = ((animatedAngle - 180) * Math.PI) / 180;
  const needleLen = r - strokeWidth / 2 - 4;
  const needleX = cx + needleLen * Math.cos(needleAngleRad);
  const needleY = cy + needleLen * Math.sin(needleAngleRad);

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
        {/* Values on sides */}
        <div className="flex justify-between items-end px-2 mb-1">
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Nuvarande lön</p>
            <p className="text-sm font-bold text-foreground">{fmt(currentHourly)} kr/h</p>
          </div>
          <div className="text-center">
            <p className="text-[10px] text-muted-foreground">Marknadsvärde</p>
            <p className="text-sm font-bold text-accent">{fmt(marketHigh)} kr/h</p>
          </div>
        </div>

        {/* SVG Gauge */}
        <div className="flex justify-center">
          <svg viewBox="0 0 280 150" className="w-full max-w-[280px]" aria-hidden="true">
            {/* Red segment: 0-33% → 0°-60° */}
            <path
              d={arcPath(0, 60)}
              fill="none"
              stroke="hsl(0 84% 60%)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.85}
            />
            {/* Yellow segment: 33-67% → 60°-120° */}
            <path
              d={arcPath(60, 120)}
              fill="none"
              stroke="hsl(45 93% 47%)"
              strokeWidth={strokeWidth}
              strokeLinecap="butt"
              opacity={0.85}
            />
            {/* Green segment: 67-100% → 120°-180° */}
            <path
              d={arcPath(120, 180)}
              fill="none"
              stroke="hsl(155 60% 40%)"
              strokeWidth={strokeWidth}
              strokeLinecap="round"
              opacity={0.85}
            />

            {/* Needle */}
            <line
              x1={cx}
              y1={cy}
              x2={needleX}
              y2={needleY}
              stroke="hsl(var(--foreground))"
              strokeWidth={2.5}
              strokeLinecap="round"
              style={{ transition: "all 1.2s cubic-bezier(0.34, 1.56, 0.64, 1)" }}
            />
            {/* Center dot */}
            <circle cx={cx} cy={cy} r={6} fill="hsl(var(--foreground))" />
            <circle cx={cx} cy={cy} r={3} fill="hsl(var(--card))" />
          </svg>
        </div>

        {/* Label */}
        <p className="text-center text-sm mt-1">
          <span className="text-muted-foreground">Din lön ligger i det </span>
          <span className={`font-semibold ${labelColor}`}>{label}</span>
          <span className="text-muted-foreground"> fältet</span>
        </p>
      </div>
    </div>
  );
}
