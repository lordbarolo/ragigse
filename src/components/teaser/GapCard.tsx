import { useEffect, useRef, useState } from "react";
import { fmt } from "@/shared/formatters";

interface Props {
  diffPercent: number;
  userHourly: number;
  marketHigh: number;
  marketMax?: number;
  yrke: string;
  isPermanent: boolean;
  /** For permanent track — monthly values */
  userMonthly?: number;
  benchmarkP50?: number;
  employmentType?: string;
  /** Noised market value for display (consultant track) */
  noisedMarketHigh?: number;
}

/** Animated count-up hook */
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

  // Display values: noised for consultant track, real for permanent
  const displayMarketVal = isPermanent ? realMarketVal : (noisedMarketHigh ?? realMarketVal);

  // Derive display percentage from noised values (anti reverse-engineering)
  const displayDiffPercent = displayMarketVal > 0
    ? Math.round(((displayMarketVal - userVal) / displayMarketVal) * 100)
    : diffPercent;

  const counter = useCountUp(Math.abs(displayDiffPercent));
  const isUnderpaid = displayDiffPercent > 0;

  if (!isUnderpaid || displayDiffPercent < 1) return null;

  const maxVal = marketMax ?? Math.round(realMarketVal * 1.12);

  // Monthly gain uses noised market values
  const monthlyGain = isPermanent
    ? displayMarketVal - userVal
    : (displayMarketVal - userHourly) * 167;

  const barMax = maxVal || realMarketVal;
  const userWidth = Math.min((userVal / barMax) * 100, 100);
  const marketWidth = Math.min((displayMarketVal / barMax) * 100, 100);

  return (
    <div className="rounded-3xl overflow-hidden relative font-dm"
      style={{
        background: `hsl(var(--gap-card))`,
        border: `1px solid hsl(var(--gap-border))`,
      }}
    >
      {/* Glow effect */}
      <div
        className="absolute -top-20 -right-20 w-[260px] h-[260px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, hsl(var(--gap-accent) / 0.10) 0%, transparent 70%)",
        }}
      />

      <div className="relative p-8 pb-7 space-y-6">
        {/* Label */}
        <p
          className="text-[11px] font-medium tracking-[0.12em] uppercase"
          style={{ color: "hsl(var(--gap-muted))" }}
        >
          Compcare · Din löneanalys
        </p>

        {/* Big number */}
        <div>
          <div className="flex items-start gap-1.5 animate-gap-count-up">
            <span
              ref={counter.ref}
              className="font-syne text-[88px] font-extrabold leading-[0.9] tracking-[-3px]"
              style={{ color: "hsl(var(--gap-danger))" }}
            >
              {counter.value}
            </span>
            <span
              className="font-syne text-4xl font-bold mt-2 opacity-70"
              style={{ color: "hsl(var(--gap-danger))" }}
            >
              %
            </span>
          </div>
          <p
            className="text-[15px] mt-2 leading-relaxed animate-gap-fade-in"
            style={{ color: "hsl(var(--gap-muted))", animationDelay: "0.3s" }}
          >
            under marknadsnivå för {yrke}
          </p>
        </div>

        {/* Divider */}
        <div className="h-px" style={{ background: "hsl(var(--gap-border))" }} />

        {/* Numbers grid */}
        <div
          className="grid grid-cols-2 gap-4 animate-gap-fade-in"
          style={{ animationDelay: "0.5s" }}
        >
          <div
            className="rounded-[14px] p-4"
            style={{
              background: "hsl(0 0% 100% / 0.03)",
              border: "1px solid hsl(var(--gap-border))",
            }}
          >
            <p
              className="text-[11px] tracking-[0.08em] uppercase mb-1.5"
              style={{ color: "hsl(var(--gap-muted))" }}
            >
              {employmentType === "foretagare" ? "Din ersättning" : "Din lön"}
            </p>
            <p className="font-syne text-[22px] font-bold tracking-tight" style={{ color: "hsl(var(--gap-text))" }}>
              {fmt(userVal)} kr
            </p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--gap-muted))" }}>
              {isPermanent ? "per månad" : "per timme"}
            </p>
          </div>

          <div
            className="rounded-[14px] p-4"
            style={{
              background: "hsl(var(--gap-accent-dim))",
              border: "1px solid hsl(var(--gap-accent) / 0.25)",
            }}
          >
            <p
              className="text-[11px] tracking-[0.08em] uppercase mb-1.5"
              style={{ color: "hsl(var(--gap-muted))" }}
            >
              Marknadsvärde
            </p>
            <p className="font-syne text-[22px] font-bold tracking-tight" style={{ color: "hsl(var(--gap-accent))" }}>
              {fmt(displayMarketVal)} kr
            </p>
            <p className="text-xs mt-0.5" style={{ color: "hsl(var(--gap-muted))" }}>
              {isPermanent ? "per månad" : "per timme"}
            </p>
          </div>
        </div>

        {/* Monthly gain */}
        {monthlyGain > 0 && (
          <div
            className="rounded-[14px] p-4 flex justify-between items-center animate-gap-fade-in"
            style={{
              background: "hsl(var(--gap-accent-dim))",
              border: "1px solid hsl(var(--gap-accent) / 0.2)",
              animationDelay: "0.7s",
            }}
          >
            <div>
              <p className="text-[15px] font-medium" style={{ color: "hsl(var(--gap-text))" }}>
                Möjlig ökning
              </p>
              <p className="text-[13px] leading-snug" style={{ color: "hsl(var(--gap-muted))" }}>
                per månad om du förhandlar
              </p>
            </div>
            <span
              className="font-syne text-2xl font-extrabold tracking-tight whitespace-nowrap"
              style={{ color: "hsl(var(--gap-accent))" }}
            >
              +{fmt(monthlyGain)} kr
            </span>
          </div>
        )}

        {/* Bars — relative only, no exact kr/h values */}
        <div className="space-y-2.5 animate-gap-fade-in" style={{ animationDelay: "0.9s" }}>
          {[
            { label: "Du idag", width: userWidth, fill: "hsl(var(--gap-danger))" },
            { label: "Marknad", width: marketWidth, fill: "hsl(var(--gap-accent))" },
          ].map((bar) => (
            <div key={bar.label} className="flex items-center gap-2.5">
              <span
                className="text-xs w-20 shrink-0"
                style={{ color: "hsl(var(--gap-muted))" }}
              >
                {bar.label}
              </span>
              <div
                className="flex-1 h-1.5 rounded-full overflow-hidden"
                style={{ background: "hsl(0 0% 100% / 0.06)" }}
              >
                <div
                  className="h-full rounded-full transition-all duration-[1500ms]"
                  style={{
                    width: `${bar.width}%`,
                    background: bar.fill,
                    transitionTimingFunction: "cubic-bezier(0.16,1,0.3,1)",
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <p
          className="text-center text-[11px] animate-gap-fade-in"
          style={{ color: "hsl(var(--gap-muted))", animationDelay: "1.2s" }}
        >
          Baserat på SKR:s ramavtalsdata 2024–2026
        </p>
      </div>
    </div>
  );
}
