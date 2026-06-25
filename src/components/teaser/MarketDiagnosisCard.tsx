import { useEffect, useRef } from "react";
import { TrendingDown, Minus, TrendingUp } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { isSpecialistDoctor } from "@/lib/calc";

type Position = "under" | "normal" | "above";

interface Props {
  /** User's reported hourly rate (kr/h, already normalised). */
  userHourly: number;
  /** Lower edge of "möjlig ersättning" (kr/h). */
  rangeLow: number;
  /** Upper edge of "möjlig ersättning" (kr/h) — also the marker we measure from. */
  rangeHigh: number;
  yrke: string;
  kommun: string;
}

const POSITION: Record<Position, { label: string; icon: typeof TrendingDown; tone: string }> = {
  under: { label: "Under möjlig ersättning", icon: TrendingDown, tone: "text-foreground" },
  normal: { label: "Inom möjlig ersättning", icon: Minus, tone: "text-foreground" },
  above: { label: "Över möjlig ersättning", icon: TrendingUp, tone: "text-foreground" },
};

export default function MarketDiagnosisCard({
  userHourly,
  rangeLow,
  rangeHigh,
  yrke,
  kommun,
}: Props) {
  const trackedRef = useRef(false);

  // BF-marginal som markering (vad vi mäter från): 10% läkare / 15% övriga.
  const isDoctor = isSpecialistDoctor(yrke);
  const markerMarginPct = isDoctor ? 10 : 15;

  const position: Position =
    userHourly > 0 && userHourly < rangeLow
      ? "under"
      : userHourly > rangeHigh
        ? "above"
        : "normal";

  const config = POSITION[position];
  const Icon = config.icon;

  // Visuell position på bandet (0–100%).
  const span = Math.max(1, rangeHigh - rangeLow);
  const rawPct = ((userHourly - rangeLow) / span) * 50 + 25; // 25% = low, 75% = high
  const markerPct = Math.max(4, Math.min(96, rawPct));

  useEffect(() => {
    if (trackedRef.current) return;
    trackedRef.current = true;
    trackEvent("diagnosis_shown", { position, role: yrke, kommun });
  }, []);

  const headline =
    position === "under"
      ? `Din ersättning ligger under möjlig ersättning för ${yrke} i ${kommun}.`
      : position === "above"
        ? `Din ersättning ligger över möjlig ersättning för ${yrke} i ${kommun}.`
        : `Din ersättning ligger inom möjlig ersättning för ${yrke} i ${kommun} — under övre spann.`;

  return (
    <div className="rounded-xl border border-border bg-card p-6 card-shadow">
      <p className="text-caption mb-4">Din ersättning mot möjlig ersättning</p>

      <div className="flex items-start gap-3 mb-6">
        <div className="p-2.5 rounded-lg bg-primary/10 shrink-0">
          <Icon className={`w-5 h-5 text-primary`} />
        </div>
        <p className={`text-base font-bold leading-snug ${config.tone}`}>{headline}</p>
      </div>

      {/* 3-läges-band */}
      <div className="relative">
        <div className="flex h-2 rounded-full overflow-hidden">
          <div className="flex-1 bg-muted-foreground/15" />
          <div className="flex-1 bg-primary/35" />
          <div className="flex-1 bg-muted-foreground/15" />
        </div>

        {/* Markering = användarens position */}
        {userHourly > 0 && (
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
        Markeringen för &quot;möjlig ersättning&quot; utgår från {markerMarginPct} % marginal till bemanningsföretaget
        {isDoctor ? " (specialistläkare)" : ""}. Baserat på ramavtalspriser i {kommun}.
      </p>
    </div>
  );
}
