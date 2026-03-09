import { useEffect, useRef } from "react";
import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

type Position = "under" | "near" | "above";

interface Props {
  /** Percent difference vs market median. Positive = user is below median. */
  diffPercent: number;
  isPermanent: boolean;
  yrke: string;
  kommun: string;
  isAboveThreshold?: boolean;
  /** Whether the user has provided their email (unblurs values) */
  emailProvided?: boolean;
}

function getPosition(diffPercent: number, isAboveThreshold: boolean): Position {
  if (isAboveThreshold || diffPercent <= 0) return "above";
  if (diffPercent <= 5) return "near";
  return "under";
}

const positionConfig: Record<Position, { label: string; color: string; bgColor: string; icon: typeof TrendingDown }> = {
  under: {
    label: "Under median",
    color: "text-destructive",
    bgColor: "bg-destructive/10",
    icon: TrendingDown,
  },
  near: {
    label: "Nära median",
    color: "text-yellow-500",
    bgColor: "bg-yellow-500/10",
    icon: Minus,
  },
  above: {
    label: "Över median",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: TrendingUp,
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

  // Show text label without percentage when blurred
  const diagnosisText = !emailProvided
    ? position === "above"
      ? `Du ligger över medianen för ${yrke} i din region.`
      : position === "near"
        ? `Du ligger nära medianen för ${yrke} i din region.`
        : `Du ligger under medianen för ${yrke} i din region.`
    : position === "above"
      ? `Du ligger över medianen för ${yrke} i din region.`
      : position === "near"
        ? `Du ligger nära medianen för ${yrke} i din region — men det finns utrymme.`
        : `Du ligger ${diffPercent}% under medianen för ${yrke} i din region.`;

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-4">
        Din löneposition
      </p>

      <div className="flex items-center gap-3 mb-4">
        <div className={`p-2.5 rounded-lg ${config.bgColor}`}>
          <Icon className={`w-5 h-5 ${config.color}`} />
        </div>
        <div>
          <p className="text-base font-bold text-foreground leading-tight">
            {diagnosisText}
          </p>
        </div>
      </div>

      {/* Position indicator */}
      <div className="relative mt-4">
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
              background: position === "above"
                ? "hsl(var(--primary))"
                : position === "near"
                  ? "hsl(45, 93%, 47%)"
                  : "hsl(var(--destructive))",
            }}
          />
        </div>
        {/* Median marker */}
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
