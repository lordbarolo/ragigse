import { AlertTriangle, MapPin } from "lucide-react";

interface OpportunityGapProps {
  userHourly: number;
  marketHigh: number;
  employmentType: "anstalld" | "foretagare";
  nearestHigherKommun?: string | null;
}

function formatKr(value: number): string {
  return value.toLocaleString("sv-SE");
}

export default function OpportunityGap({ userHourly, marketHigh, employmentType, nearestHigherKommun }: OpportunityGapProps) {
  const diffHourly = Math.max(0, marketHigh - userHourly);
  const diffMonthly = diffHourly * 167;
  const isUnderpaid = userHourly < marketHigh;

  if (!isUnderpaid || diffHourly <= 0) return null;

  const isSmallGap = diffHourly < 20; // roughly <5% at typical rates

  if (isSmallGap && !nearestHigherKommun) return null;

  return (
    <div className="rounded-lg border border-destructive/30 bg-card card-shadow overflow-hidden">
      <div className="p-5 space-y-4">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-destructive/10 shrink-0">
            {isSmallGap ? (
              <MapPin className="w-4 h-4 text-destructive" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-destructive" />
            )}
          </div>
          <div>
            <p className="text-base font-bold text-foreground leading-tight">
              {isSmallGap
                ? `Du kan tjäna mer i ${nearestHigherKommun}`
                : `Din ${employmentType === "foretagare" ? "ersättning" : "lön"} kan öka med ${formatKr(diffHourly)} kr/h`}
            </p>
            <p className="text-sm text-muted-foreground mt-1">
              {isSmallGap
                ? "Baserat på zonindelade ramavtalspriser"
                : `Det motsvarar ca ${formatKr(diffMonthly)} kr/mån`}
            </p>
          </div>
        </div>

        {!isSmallGap && (
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
        )}
      </div>
    </div>
  );
}
