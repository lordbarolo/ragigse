/**
 * Visual salary gauge showing where the user's salary falls:
 * Red (underpaid) → Yellow (near market) → Green (top-tier)
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
  // Position: 0 = far below market, 50 = at low end, 100 = at/above high end
  const range = marketHigh - marketLow * 0.7; // extend range below low
  const floor = marketLow * 0.7;
  const position = Math.max(0, Math.min(100, ((currentHourly - floor) / range) * 100));

  let label: string;
  let labelColor: string;
  if (currentHourly < marketLow * 0.95) {
    label = "Underbetald";
    labelColor = "text-destructive";
  } else if (currentHourly <= marketHigh) {
    label = "Marknadsmässig";
    labelColor = "text-yellow-600";
  } else {
    label = "Top-tier";
    labelColor = "text-accent";
  }

  return (
    <div className={blurred ? "blur-sm select-none pointer-events-none" : ""}>
      <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
        <span>Underbetald</span>
        <span>Marknadsmässig</span>
        <span>Top-tier</span>
      </div>
      {/* Gradient bar */}
      <div className="relative h-3 rounded-full overflow-hidden bg-secondary">
        <div
          className="absolute inset-0 rounded-full"
          style={{
            background: "linear-gradient(to right, hsl(0 84% 60%), hsl(45 93% 47%), hsl(155 60% 40%))",
          }}
        />
        {/* Marker */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full border-2 border-card bg-foreground shadow-md transition-all duration-700"
          style={{ left: `calc(${position}% - 8px)` }}
        />
      </div>
      <p className={`text-center text-sm font-semibold mt-2 ${labelColor}`}>
        {label}
      </p>
    </div>
  );
}
