import { TrendingDown, AlertTriangle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface OpportunityGapProps {
  userHourly: number;
  marketHigh: number;
  employmentType: "anstalld" | "foretagare";
}

export default function OpportunityGap({ userHourly, marketHigh, employmentType }: OpportunityGapProps) {
  const diffPercent = Math.round(((marketHigh - userHourly) / marketHigh) * 100);
  const monthlyLoss = (marketHigh - userHourly) * 167;
  const yearlyLoss = monthlyLoss * 12;
  const isUnderpaid = userHourly < marketHigh;

  if (!isUnderpaid || diffPercent < 1) return null;

  const formattedMonthly = new Intl.NumberFormat("sv-SE").format(monthlyLoss);
  const formattedYearly = new Intl.NumberFormat("sv-SE").format(yearlyLoss);

  return (
    <Card className="card-shadow border-destructive/40 bg-destructive/5 overflow-hidden">
      <CardContent className="pt-5 pb-5 space-y-4">
        {/* Headline */}
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-full bg-destructive/10 shrink-0">
            <AlertTriangle className="w-5 h-5 text-destructive" />
          </div>
          <div>
            <p className="font-display text-lg font-bold text-foreground leading-tight">
              Du ligger {diffPercent}% under marknaden
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Baserat på offentliga ramavtalspriser i din zon
            </p>
          </div>
        </div>

        {/* Loss figures */}
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg bg-card border border-destructive/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Per månad
              </span>
            </div>
            <p className="text-xl font-bold text-destructive">
              −{formattedMonthly} kr
            </p>
          </div>
          <div className="rounded-lg bg-card border border-destructive/20 p-3 text-center">
            <div className="flex items-center justify-center gap-1 mb-1">
              <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Per år
              </span>
            </div>
            <p className="text-xl font-bold text-destructive">
              −{formattedYearly} kr
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          {employmentType === "anstalld"
            ? "Beräknat utifrån 167 timmar/mån efter arbetsgivaravgifter"
            : "Beräknat utifrån 167 timmar/mån som egenföretagare"}
        </p>
      </CardContent>
    </Card>
  );
}
