import { useEffect, useRef } from "react";
import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

type Position = "under" | "near" | "above";

interface Props {
  diffPercent: number;
  isPermanent: boolean;
  yrke: string;
  kommun: string;
  isAboveThreshold?: boolean;
  emailProvided?: boolean;
}

function getPosition(diffPercent: number, isAboveThreshold: boolean): Position {
  if (isAboveThreshold || diffPercent <= 0) return "above";
  if (diffPercent <= 5) return "near";
  return "under";
}

const positionConfig: Record<Position, { color: string; bgColor: string; icon: typeof TrendingDown; barColor: string }> = {
  under: {
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    icon: TrendingDown,
    barColor: "hsl(var(--destructive))",
  },
  near: {
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    icon: Minus,
    barColor: "hsl(45, 93%, 47%)",
  },
  above: {
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: TrendingUp,
    barColor: "hsl(var(--primary))",
  },
};

export default function MarketDiagnosisCard({ diffPercent, isPermanent, yrke, kommun, isAboveThreshold = false, emailProvided = false }: Props) {
  const trackedRef = useRef(false);
  const position = getPosition(diffPercent, isAboveThreshold);
  const config = positionConfig[position];
  const Icon = config.icon;

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("diagnosis_shown" as any, { position, diff_percent: diffPercent, role: yrke, kommun });
    }
  }, []);

  // Percentage to display
  const displayPct = position === "above" ? 100 : position === "near" ? 100 - diffPercent : 100 - diffPercent;

  const subtitle = !emailProvided
    ? position === "above"
      ? `Du ligger över marknadsvärdet`
      : position === "near"
        ? `Du ligger nära marknadsvärdet`
        : `Du ligger under marknadsvärdet`
    : position === "above"
      ? `Du ligger över marknadsvärdet`
      : position === "near"
        ? `Du ligger ${diffPercent}% under marknadsvärdet — men nära`
        : `Du ligger ${diffPercent}% under marknadsvärdet`;

  return (
    <div className="rounded-xl bg-card/50 p-6">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Din lön vs marknaden
      </p>

      <div className="flex items-end gap-4 mb-4">
        <p className="text-7xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent leading-none tracking-tight">
          {displayPct}%
        </p>
        <div className={`p-2 rounded-lg ${config.bgColor} mb-2`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
      </div>

      <p className="text-base text-muted-foreground mb-4">
        {subtitle}
      </p>

      {/* Position indicator */}
      <div className="relative">
        <div className="flex justify-between text-[10px] text-muted-foreground mb-1.5">
          <span>Under</span>
          <span>Median</span>
          <span>Över</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out"
            style={{
              width: position === "above" ? "85%" : position === "near" ? "55%" : `${Math.max(15, 50 - diffPercent)}%`,
              background: config.barColor,
            }}
          />
        </div>
        <div className="absolute top-[calc(100%-8px)] left-1/2 -translate-x-1/2 w-0.5 h-2 bg-muted-foreground/40 rounded-full" />
      </div>

      <p className="text-xs text-muted-foreground mt-3">
        {isPermanent
          ? "Baserat på Medlingsinstitutets lönestatistik"
          : `Baserat på ramavtalspriser i ${kommun}`}
      </p>
    </div>
  );
}
