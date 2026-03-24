import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { fmt } from "@/shared/formatters";

export interface PriceChange {
  yrkeskategori: string;
  zon: string;
  old_timpris: number | null;
  new_timpris: number;
  diff_abs: number;
  diff_pct: number;
  change_type: string;
  detected_at: string;
}

interface Props {
  changes: PriceChange[];
  userZone?: string;
  occupation: string;
}

export default function PriceHistory({ changes, userZone, occupation }: Props) {
  if (!changes || changes.length === 0) return null;

  // Filter to user's zone, fallback to all
  const zoneChanges = userZone
    ? changes.filter((c) => c.zon === userZone)
    : changes;

  if (zoneChanges.length === 0) return null;

  // Sort by detected_at descending (newest first)
  const sorted = [...zoneChanges].sort(
    (a, b) => new Date(b.detected_at).getTime() - new Date(a.detected_at).getTime()
  );

  const latest = sorted[0];
  const isIncrease = latest.diff_abs > 0;
  const isDecrease = latest.diff_abs < 0;

  const monoClass = "font-[var(--font-mono)]";

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2.5 mb-3">
        <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-foreground/[0.28] whitespace-nowrap">
          Prishistorik
        </span>
        <div className="flex-1 h-px bg-foreground/[0.06]" />
      </div>

      {/* Latest change highlight */}
      <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            {isIncrease ? (
              <div className="w-7 h-7 rounded-full bg-accent/[0.15] flex items-center justify-center">
                <TrendingUp className="w-3.5 h-3.5 text-accent" />
              </div>
            ) : isDecrease ? (
              <div className="w-7 h-7 rounded-full bg-destructive/[0.15] flex items-center justify-center">
                <TrendingDown className="w-3.5 h-3.5 text-destructive" />
              </div>
            ) : (
              <div className="w-7 h-7 rounded-full bg-foreground/[0.08] flex items-center justify-center">
                <Minus className="w-3.5 h-3.5 text-foreground/40" />
              </div>
            )}
            <span className="text-[10px] font-semibold tracking-[0.8px] uppercase text-foreground/[0.28]">
              Senaste avtalsändring
            </span>
          </div>
          <span className={`${monoClass} text-xs font-medium px-2 py-0.5 rounded-full ${
            isIncrease ? "text-accent bg-accent/[0.12]" : isDecrease ? "text-destructive bg-destructive/[0.12]" : "text-foreground/40 bg-foreground/[0.06]"
          }`}>
            {isIncrease ? "+" : ""}{latest.diff_pct.toFixed(1)}%
          </span>
        </div>

        {/* Before → After visualization */}
        <div className="flex items-center gap-3 mb-3">
          {latest.old_timpris && (
            <>
              <div className="flex-1 text-center">
                <p className="text-[9px] text-foreground/[0.25] uppercase tracking-wide mb-1">Tidigare</p>
                <p className={`${monoClass} text-lg text-foreground/[0.4] line-through decoration-foreground/[0.15]`}>
                  {fmt(latest.old_timpris)}
                </p>
                <p className="text-[9px] text-foreground/[0.2]">kr/h</p>
              </div>
              <div className="text-foreground/[0.15] text-lg">→</div>
            </>
          )}
          <div className="flex-1 text-center">
            <p className="text-[9px] text-foreground/[0.25] uppercase tracking-wide mb-1">Nu</p>
            <p className={`${monoClass} text-lg font-medium ${isIncrease ? "text-accent" : "text-foreground/[0.7]"}`}>
              {fmt(latest.new_timpris)}
            </p>
            <p className="text-[9px] text-foreground/[0.2]">kr/h</p>
          </div>
        </div>

        {/* Timeline dots for all changes */}
        {sorted.length > 1 && (
          <div className="pt-2 border-t border-foreground/[0.05]">
            <div className="flex items-center gap-1 overflow-x-auto pb-1">
              {sorted.slice(0, 5).map((c, i) => {
                const date = new Date(c.detected_at);
                const month = date.toLocaleDateString("sv-SE", { month: "short", year: "2-digit" });
                const isUp = c.diff_abs > 0;
                return (
                  <div key={i} className="flex flex-col items-center min-w-[56px]">
                    <div className={`w-2 h-2 rounded-full ${
                      i === 0 ? "bg-primary" : isUp ? "bg-accent/50" : "bg-foreground/[0.15]"
                    }`} />
                    <span className={`${monoClass} text-[9px] mt-1 ${
                      isUp ? "text-accent/60" : "text-foreground/[0.2]"
                    }`}>
                      {isUp ? "+" : ""}{c.diff_abs} kr
                    </span>
                    <span className="text-[8px] text-foreground/[0.15]">{month}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <p className="text-[10px] text-foreground/[0.2] mt-2 leading-relaxed">
          Kundpriset för {occupation.toLowerCase()} i {userZone || "din zon"} har{" "}
          {isIncrease
            ? `ökat med ${fmt(Math.abs(latest.diff_abs))} kr/h sedan föregående avtal.`
            : isDecrease
              ? `minskat med ${fmt(Math.abs(latest.diff_abs))} kr/h sedan föregående avtal.`
              : "inte förändrats sedan föregående avtal."}
        </p>
      </div>
    </div>
  );
}
