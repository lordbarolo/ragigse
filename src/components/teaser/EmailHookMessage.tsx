import { TrendingDown, Scale, Trophy } from "lucide-react";

type Tier = "underpaid" | "at_market" | "above_market";

interface Props {
  tier: Tier;
  hourlyGap: number;
  monthlyGap: number;
  kommun: string;
  ceilingRate?: number;
  zon?: string;
  pctEarningMore?: number;
  /** The user's current rate (hourly or monthly depending on context) */
  currentRate?: number;
  occupation?: string;
}

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("sv-SE");
}

const config: Record<Tier, { icon: typeof TrendingDown; accentClass: string }> = {
  underpaid: { icon: TrendingDown, accentClass: "text-destructive" },
  at_market: { icon: Scale, accentClass: "text-primary" },
  above_market: { icon: Trophy, accentClass: "text-amber-500" },
};

export default function EmailHookMessage({
  tier,
  hourlyGap,
  monthlyGap,
  kommun,
  ceilingRate,
  zon,
  pctEarningMore,
  currentRate,
  occupation,
}: Props) {
  const { icon: Icon, accentClass } = config[tier];
  const roleName = occupation?.toLowerCase() || "din roll";

  return (
    <div className="space-y-4 mb-5">
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-muted shrink-0 mt-0.5">
          <Icon className={`w-4 h-4 ${accentClass}`} />
        </div>
        <div className="space-y-1.5">
          {tier === "underpaid" && (
            <>
              <p className="text-[15px] font-semibold text-foreground leading-snug">
                Analysen visar att{" "}
                {currentRate ? (
                  <span className="text-muted-foreground">{fmt(currentRate)} kr/tim</span>
                ) : (
                  "din ersättning"
                )}{" "}
                ligger <span className={accentClass}>under marknaden</span> för{" "}
                {roleName} i {kommun}.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vi skickar den fullständiga analysen kostnadsfritt till din e-post.
              </p>
            </>
          )}

          {tier === "at_market" && (
            <>
              <p className="text-[15px] font-semibold text-foreground leading-snug">
                Analysen visar att{" "}
                {currentRate ? (
                  <span className="text-muted-foreground">{fmt(currentRate)} kr/tim</span>
                ) : (
                  "din ersättning"
                )}{" "}
                ligger <span className={accentClass}>i linje med marknaden</span> för{" "}
                {roleName} i {kommun}.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vi skickar den fullständiga analysen kostnadsfritt till din e-post.
              </p>
            </>
          )}

          {tier === "above_market" && (
            <>
              <p className="text-[15px] font-semibold text-foreground leading-snug">
                Analysen visar att{" "}
                {currentRate ? (
                  <span className="text-muted-foreground">{fmt(currentRate)} kr/tim</span>
                ) : (
                  "din ersättning"
                )}{" "}
                ligger <span className={accentClass}>över marknaden</span> för{" "}
                {roleName} i {kommun}.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Vi skickar den fullständiga analysen kostnadsfritt till din e-post.
              </p>
            </>
          )}
        </div>
      </div>

      {/* CTA label */}
      <p className="text-sm font-semibold text-foreground">
        Ange din e-post för att få hela analysen.
      </p>
    </div>
  );
}