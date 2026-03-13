import { TrendingDown, Scale, Trophy } from "lucide-react";

type Tier = "underpaid" | "at_market" | "above_market";

interface Props {
  tier: Tier;
  /** Hourly gap (positive = underpaid amount, for at_market = room to ceiling) */
  hourlyGap: number;
  /** Monthly equivalent of the gap */
  monthlyGap: number;
  kommun: string;
  /** For at_market: the ceiling rate */
  ceilingRate?: number;
  /** For above_market: zone name */
  zon?: string;
  /** For above_market: % of consultants earning more */
  pctEarningMore?: number;
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
}: Props) {
  const { icon: Icon, accentClass } = config[tier];

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
                Analysen visar att ersättningen för din roll i {kommun} ligger{" "}
                <span className={accentClass}>{fmt(hourlyGap)} kr/tim</span> högre
                än din nuvarande nivå.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Det motsvarar en skillnad på{" "}
                <span className="font-semibold text-foreground">
                  {fmt(monthlyGap)} kr per månad
                </span>
                .
              </p>
            </>
          )}

          {tier === "at_market" && (
            <>
              <p className="text-[15px] font-semibold text-foreground leading-snug">
                Din ersättning ligger i linje med marknaden. Ramavtalet för din
                roll i {kommun} har ett tak på{" "}
                <span className={accentClass}>{fmt(ceilingRate || 0)} kr/tim</span>.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Skillnaden mot taket är{" "}
                <span className="font-semibold text-foreground">
                  {fmt(hourlyGap)} kr/tim
                </span>
                .
              </p>
            </>
          )}

          {tier === "above_market" && (
            <>
              <p className="text-[15px] font-semibold text-foreground leading-snug">
                Du ligger över snittet för din roll i {kommun}.{" "}
                <span className={accentClass}>{pctEarningMore}%</span> av
                konsulter i zon {zon} har en högre ersättning.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Den fullständiga rapporten visar detaljerna.
              </p>
            </>
          )}
        </div>
      </div>

      {/* CTA label */}
      <p className="text-sm font-semibold text-foreground">
        {tier === "underpaid" && "Ange din e-post för att se hela analysen."}
        {tier === "at_market" && "Ange din e-post för att se hela analysen."}
        {tier === "above_market" && "Ange din e-post för att se hela analysen."}
      </p>
    </div>
  );
}
