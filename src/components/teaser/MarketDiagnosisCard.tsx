import { useEffect, useRef } from "react";
import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";

type Position = "under" | "near" | "above";

interface Props {
  diffPercent: number;
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

const positionConfig: Record<Position, { label: string; color: string; bgColor: string; icon: typeof TrendingDown }> = {
  under: {
    label: "Under möjlig ersättning",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: TrendingDown,
  },
  near: {
    label: "Inom möjlig ersättning",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: Minus,
  },
  above: {
    label: "Över möjlig ersättning",
    color: "text-primary",
    bgColor: "bg-primary/10",
    icon: TrendingUp,
  },
};

export default function MarketDiagnosisCard({ diffPercent, yrke, kommun, isAboveThreshold = false, emailProvided = false }: Props) {
  const trackedRef = useRef(false);
  const position = getPosition(diffPercent, isAboveThreshold);
  const config = positionConfig[position];
  const Icon = config.icon;

  useEffect(() => {
    if (!trackedRef.current) {
      trackedRef.current = true;
      trackEvent("diagnosis_shown", { position, diff_percent: diffPercent, role: yrke, kommun });
    }
  }, []);

  const diagnosisText = !emailProvided
    ? position === "above"
      ? `Din ersättning ligger över marknadsspannet för ${yrke} i din region.`
      : position === "near"
        ? `Din ersättning ligger inom marknadsspannet för ${yrke} i din region.`
        : `Din ersättning ligger under marknadsspannet för ${yrke} i din region.`
    : position === "above"
      ? `Din ersättning ligger över marknadsspannet för ${yrke} i din region.`
      : position === "near"
        ? `Din ersättning ligger inom marknadsspannet för ${yrke} i din region — se rapporten för fullständig jämförelse.`
        : `Din ersättning ligger ${diffPercent}% under marknadsspannet för ${yrke} i din region.`;

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <p className="text-caption mb-4">
        Din ersättning mot marknadsspannet
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
        <div className="flex justify-between text-micro mb-1.5">
          <span>Under</span>
          <span>Marknadsspann</span>
          <span>Över</span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-700 ease-out bg-primary"
            style={{
              width: position === "above" ? "85%" : position === "near" ? "55%" : `${Math.max(15, 50 - diffPercent)}%`,
            }}
          />
        </div>
        <div className="absolute top-[calc(100%-8px)] left-1/2 -translate-x-1/2 w-0.5 h-2 bg-muted-foreground/40 rounded-full" />
      </div>

      <p className="text-hint mt-3">
        {`Baserat på ramavtalspriser i ${kommun}`}
      </p>
    </div>
  );
}
