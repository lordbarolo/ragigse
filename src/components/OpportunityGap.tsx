import { AlertTriangle } from "lucide-react";
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

        {/* Blurred placeholder — locked content */}
        <div className="relative rounded-lg border border-destructive/20 bg-card p-4 overflow-hidden">
          <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Per månad</p>
                <p className="text-xl font-bold text-muted-foreground">−XX XXX kr</p>
              </div>
              <div className="rounded-lg bg-muted/40 p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Per år</p>
                <p className="text-xl font-bold text-muted-foreground">−XXX XXX kr</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/60 backdrop-blur-[2px]">
            <span className="text-lg mb-1">🔒</span>
            <p className="text-sm font-medium text-foreground text-center px-4 leading-snug">
              Se exakt hur mycket du förlorar — och hur du förhandlar upp det
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
