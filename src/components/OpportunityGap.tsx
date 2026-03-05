import { AlertTriangle } from "lucide-react";

interface OpportunityGapProps {
  userHourly: number;
  marketHigh: number;
  employmentType: "anstalld" | "foretagare";
}

export default function OpportunityGap({ userHourly, marketHigh, employmentType }: OpportunityGapProps) {
  const diffPercent = Math.round(((marketHigh - userHourly) / marketHigh) * 100);
  const isUnderpaid = userHourly < marketHigh;

  if (!isUnderpaid || diffPercent < 1) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-card card-shadow overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
            <AlertTriangle className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <p className="text-base font-bold text-foreground leading-tight">
              {diffPercent >= 10
                ? "Din lön kan öka med mer än 10%"
                : "Din lön kan öka med mer än 5%"}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              Baserat på offentliga ramavtalspriser i din zon
            </p>
          </div>
        </div>

        <div className="relative rounded-lg border border-border bg-muted/30 p-4 overflow-hidden">
          <div className="blur-sm select-none pointer-events-none" aria-hidden="true">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Per månad</p>
                <p className="text-xl font-bold text-muted-foreground">−XX XXX kr</p>
              </div>
              <div className="rounded-lg bg-muted p-3 text-center">
                <p className="text-xs text-muted-foreground mb-1">Per år</p>
                <p className="text-xl font-bold text-muted-foreground">−XXX XXX kr</p>
              </div>
            </div>
          </div>
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-card/70 backdrop-blur-[2px]">
            <span className="text-lg mb-1">🔒</span>
            <p className="text-sm font-semibold text-foreground text-center px-4 leading-snug">
              Se exakt hur mycket du förlorar — och hur du förhandlar upp det
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
