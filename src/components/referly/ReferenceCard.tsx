import { Badge } from "@/components/ui/badge";
import type { RefReference, RefReferenceStatus } from "@/types/referly";

interface ReferenceCardProps {
  reference: RefReference;
  goldMonths?: number;
  warnMonths?: number;
}

const STATUS_CONFIG: Record<RefReferenceStatus, { label: string; badgeClass: string }> = {
  active: { label: "Aktiv", badgeClass: "bg-primary/10 text-primary border-0" },
  pending: { label: "Inväntar svar", badgeClass: "bg-yellow-500/10 text-yellow-600 border-0" },
  revoked: { label: "Återkallad", badgeClass: "bg-destructive/10 text-destructive border-0" },
  expired: { label: "Utgången", badgeClass: "bg-muted text-muted-foreground border-0" },
};

function getMonthsAgo(dateStr: string): number {
  return Math.floor((Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24 * 30.44));
}

export function ReferenceCard({ reference, goldMonths = 24, warnMonths = 20 }: ReferenceCardProps) {
  const config = STATUS_CONFIG[reference.status];
  const monthsAgo = reference.confirmed_at ? getMonthsAgo(reference.confirmed_at) : getMonthsAgo(reference.created_at);

  const totalSpan = goldMonths * 1.2;
  const pct = Math.min(100, (monthsAgo / totalSpan) * 100);
  let barColor = "bg-primary/60";
  let ageLabel = "";
  if (monthsAgo > goldMonths) {
    barColor = "bg-muted-foreground/30";
    ageLabel = " — förnya";
  } else if (monthsAgo > warnMonths) {
    barColor = "bg-yellow-500/60";
    ageLabel = " — snart dags";
  }

  return (
    <div className="bg-card rounded-xl border border-border p-4">
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="text-sm font-medium text-foreground">{reference.giver_name || reference.giver_email}</p>
          <p className="text-xs text-muted-foreground">{reference.relationship}, {reference.workplace}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {reference.status !== "active" && <Badge className={config.badgeClass}>{config.label}</Badge>}
          <span className="text-[10px] text-muted-foreground/60">{monthsAgo} mån{ageLabel}</span>
        </div>
      </div>

      {reference.status === "active" && (
        <div className="relative h-1 bg-muted rounded-full overflow-hidden mb-2">
          <div className={`h-full rounded-full transition-all duration-500 ${barColor}`} style={{ width: `${pct}%` }} />
        </div>
      )}

      {reference.recommendation_score && reference.status === "active" && (
        <div className="flex items-center gap-0.5">
          {[1, 2, 3, 4, 5].map((i) => (
            <span key={i} className={`text-xs ${i <= reference.recommendation_score! ? "text-primary" : "text-muted-foreground/20"}`}>●</span>
          ))}
        </div>
      )}
    </div>
  );
}
