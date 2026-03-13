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
                Din ersättning ligger{" "}
                <span className={accentClass}>{fmt(hourlyGap)} kr/tim</span> under
                vad regionen betalar för din roll i {kommun}.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Det motsvarar{" "}
                <span className="font-semibold text-foreground">
                  {fmt(monthlyGap)} kr per månad
                </span>{" "}
                du lämnar kvar på bordet.
              </p>
            </>
          )}

          {tier === "at_market" && (
            <>
              <p className="text-[15px] font-semibold text-foreground leading-snug">
                Din ersättning ligger i linje med marknad — men ramavtalet för din
                roll i {kommun} har ett tak på{" "}
                <span className={accentClass}>{fmt(ceilingRate || 0)} kr/tim</span>.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Du har utrymme att förhandla ytterligare{" "}
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
                Du ligger över snittet för din roll i {kommun} — men{" "}
                <span className={accentClass}>{pctEarningMore}%</span> av
                konsulter i zon {zon} tjänar mer.
              </p>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Se var pengarna faktiskt finns.
              </p>
            </>
          )}
        </div>
      </div>

      {/* CTA label */}
      <p className="text-sm font-semibold text-foreground">
        {tier === "underpaid" && "Få ditt förhandlingsscript — ange din e-post."}
        {tier === "at_market" && "Se hur du tar dig till taket — ange din e-post."}
        {tier === "above_market" && "Få den regionala jämförelsen — ange din e-post."}
      </p>
    </div>
  );
}
