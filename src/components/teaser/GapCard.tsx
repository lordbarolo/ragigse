import { useEffect, useRef, useState } from "react";
import { fmt } from "@/shared/formatters";

interface Props {
  diffPercent: number;
  userHourly: number;
  marketHigh: number;
  marketMax?: number;
  yrke: string;
  isPermanent: boolean;
  userMonthly?: number;
  benchmarkP50?: number;
  employmentType?: string;
  noisedMarketHigh?: number;
}

function useCountUp(target: number, duration = 1200) {
  const [value, setValue] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ref.current) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        const start = performance.now();
        const step = (now: number) => {
          const t = Math.min((now - start) / duration, 1);
          const eased = 1 - Math.pow(1 - t, 3);
          setValue(Math.round(eased * target));
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      },
      { threshold: 0.3 },
    );
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [target, duration]);

  return { value, ref };
}

export default function GapCard({
  diffPercent,
  userHourly,
  marketHigh,
  marketMax,
  yrke,
  isPermanent,
  userMonthly,
  benchmarkP50,
  employmentType,
  noisedMarketHigh,
}: Props) {
  const userVal = isPermanent ? (userMonthly ?? 0) : userHourly;
  const realMarketVal = isPermanent ? (benchmarkP50 ?? 0) : marketHigh;
  const displayMarketVal = isPermanent ? realMarketVal : (noisedMarketHigh ?? realMarketVal);

  const displayDiffPercent = displayMarketVal > 0
    ? Math.round(((displayMarketVal - userVal) / displayMarketVal) * 100)
    : diffPercent;

  const counter = useCountUp(Math.abs(displayDiffPercent));
  const isUnderpaid = displayDiffPercent > 0;

  if (!isUnderpaid || displayDiffPercent < 1) return null;

  const maxVal = marketMax ?? Math.round(realMarketVal * 1.12);
  const monthlyGain = isPermanent
    ? displayMarketVal - userVal
    : (displayMarketVal - userHourly) * 167;

  const barMax = maxVal || realMarketVal;
  const userWidth = Math.min((userVal / barMax) * 100, 100);
  const marketWidth = Math.min((displayMarketVal / barMax) * 100, 100);

  return (
    <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden">
      <div className="p-6 sm:p-8 space-y-6">
        {/* Big number */}
        <div>
          <div className="flex items-baseline gap-1 animate-gap-count-up">
            <span
              ref={counter.ref}
              className="text-6xl sm:text-7xl font-extrabold leading-none tracking-tighter text-foreground"
            >
              {counter.value}
            </span>
            <span className="text-3xl font-bold text-muted-foreground">%</span>
          </div>
          <p className="text-sm text-muted-foreground mt-2 animate-gap-fade-in" style={{ animationDelay: "0.3s" }}>
            under marknadsnivå för {yrke}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px bg-border" />

        {/* Stat blocks */}
        <div className="grid grid-cols-2 gap-4 animate-gap-fade-in" style={{ animationDelay: "0.5s" }}>
          <div className="rounded-lg border border-border p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              {employmentType === "foretagare" ? "Din ersättning" : "Din lön"}
            </p>
            <p className="text-xl font-bold text-foreground tracking-tight">
              {fmt(userVal)} kr
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPermanent ? "per månad" : "per timme"}
            </p>
          </div>

          <div className="rounded-lg border border-primary/20 bg-primary/5 p-4">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wider mb-1.5">
              Marknadsvärde
            </p>
            <p className="text-xl font-bold text-primary tracking-tight">
              {fmt(displayMarketVal)} kr
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isPermanent ? "per månad" : "per timme"}
            </p>
          </div>
        </div>

        {/* Monthly gain */}
        {monthlyGain > 0 && (
          <div
            className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex justify-between items-center animate-gap-fade-in"
            style={{ animationDelay: "0.7s" }}
          >
            <div>
              <p className="text-sm font-semibold text-foreground">Möjlig ökning</p>
              <p className="text-xs text-muted-foreground">per månad om du förhandlar</p>
            </div>
            <span className="text-2xl font-extrabold text-primary tracking-tight whitespace-nowrap">
              +{fmt(monthlyGain)} kr
            </span>
          </div>
        )}

        {/* Bars */}
        <div className="space-y-3 animate-gap-fade-in" style={{ animationDelay: "0.9s" }}>
          {[
            { label: "Du idag", width: userWidth, color: "bg-muted-foreground/40" },
            { label: "Marknad", width: marketWidth, color: "bg-primary" },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-3">
              <span className="text-xs font-medium text-muted-foreground w-16 shrink-0">
                {bar.label}
              </span>
              <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-[1500ms] ${bar.color}`}
                  style={{
                    width: `${bar.width}%`,
                    transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p
          className="text-center text-[11px] text-muted-foreground animate-gap-fade-in"
          style={{ animationDelay: "1.2s" }}
        >
          Baserat på SKR:s ramavtalsdata 2024–2026
        </p>
      </div>
    </div>
  );
}
