import { useEffect, useRef } from "react";
import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

type Position = "under" | "normal" | "above" | "unknown";

interface Props {
  /** User's reported hourly rate (kr/h, already normalised). */
  userHourly: number;
  /** Lower edge of "möjlig ersättning" (kr/h). */
  rangeLow: number;
  /** Upper edge of "möjlig ersättning" (kr/h) — also the marker we measure from. */
  rangeHigh: number;
  /** Resolved consultant share at upper edge (0.85 = 15% margin, 0.90 = 10% margin).
   *  Comes from the pricing engine, so it correctly reflects role classification
   *  (e.g. any of the 64 specialist sub-specialties → 0.90). */
  consultantShareMax: number;
  yrke: string;
  kommun: string;
}

const POSITION: Record<Exclude<Position, "unknown">, { label: string; icon: typeof TrendingDown }> = {
  under: { label: "Under möjlig ersättning", icon: TrendingDown },
  normal: { label: "Inom möjlig ersättning", icon: Minus },
  above: { label: "Över möjlig ersättning", icon: TrendingUp },
};

export default function MarketDiagnosisCard({
  userHourly,
  rangeLow,
  rangeHigh,
  consultantShareMax,
  yrke,
  kommun,
}: Props) {
  const trackedRef = useRef(false);




  const position: Position =
    !userHourly || userHourly <= 0 || !rangeLow || !rangeHigh
      ? "unknown"
      : userHourly < rangeLow
        ? "under"
        : userHourly > rangeHigh
          ? "above"
          : "normal";

  // Visuell position på bandet (4–96%).
  const span = Math.max(1, rangeHigh - rangeLow);
  const rawPct = ((userHourly - rangeLow) / span) * 50 + 25; // 25% = low, 75% = high
  const markerPct = Math.max(4, Math.min(96, rawPct));

  useEffect(() => {
    if (trackedRef.current || position === "unknown") return;
    trackedRef.current = true;
    trackEvent("diagnosis_shown", { position, role: yrke, kommun });
  }, [position]);

  const config = position === "unknown" ? POSITION.normal : POSITION[position];
  const Icon = config.icon;

  const headline =
    position === "unknown"
      ? `Möjlig ersättning för ${yrke} i ${kommun}.`
      : position === "under"
        ? `Din ersättning ligger under möjlig ersättning för ${yrke} i ${kommun}.`
        : position === "above"
          ? `Din ersättning ligger över möjlig ersättning för ${yrke} i ${kommun}.`
          : `Din ersättning ligger inom möjlig ersättning för ${yrke} i ${kommun} — under övre spann.`;

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <p className="text-caption mb-4">Din ersättning mot möjlig ersättning</p>

      <div className="flex items-start gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
          <Icon className="w-5 h-5 text-primary" />
        </div>
        <p className="text-base font-bold leading-snug text-foreground">{headline}</p>
      </div>

      {/* 3-läges-band */}
      <div className="relative">
        <div className="flex h-2 rounded-full overflow-hidden">
          <div className="flex-1 bg-muted-foreground/15" />
          <div className="flex-1 bg-primary/35" />
          <div className="flex-1 bg-muted-foreground/15" />
        </div>

        {/* Markering = användarens position på bandet */}
        {position !== "unknown" && (
          <div
            className="absolute -top-1 w-1 h-4 rounded-full bg-primary shadow-[0_0_0_3px_hsl(var(--background))]"
            style={{ left: `calc(${markerPct}% - 2px)` }}
            aria-hidden="true"
          />
        )}

        <div className="flex justify-between mt-2 text-micro">
          <span>Under</span>
          <span>Möjlig ersättning</span>
          <span>Över</span>
        </div>
      </div>

      <p className="text-hint mt-4 leading-relaxed">
        Baserat på SKR-ramavtalspriser i {kommun}.
      </p>
    </div>
  );
}
