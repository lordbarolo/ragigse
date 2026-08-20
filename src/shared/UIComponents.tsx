import { useState, useEffect, useRef } from "react";
import { Lock } from "lucide-react";
import { formatPartialValue } from "./formatters";

/* ── SectionHeading ──────────────────────────────────── */

export function SectionHeading({ icon: Icon, title }: { icon: React.ElementType; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="font-display text-lg text-foreground">{title}</h2>
    </div>
  );
}

/* ── StatBlock ───────────────────────────────────────── */

export function StatBlock({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${accent ? "bg-accent/10" : "bg-muted/50"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-semibold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

/* ── CalcRow ─────────────────────────────────────────── */

export function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-medium text-foreground whitespace-nowrap">{value}</span>
    </div>
  );
}

/* ── ScriptBlock ─────────────────────────────────────── */

export function ScriptBlock({ step, title, text }: { step: number; title: string; text: string }) {
  return (
    <div className="flex gap-3">
      <div className="flex-shrink-0 w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center">
        <span className="text-xs font-bold text-primary">{step}</span>
      </div>
      <div>
        <p className="font-semibold text-foreground text-sm">{title}</p>
        <p className="mt-1 text-muted-foreground italic">{text}</p>
      </div>
    </div>
  );
}

/* ── BarRow ───────────────────────────────────────────── */

export function BarRow({
  label,
  value,
  max,
  color,
  blurred = false,
  partialReveal = false,
  unit = "kr/timme",
  animateAndBlurAt,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  blurred?: boolean;
  partialReveal?: boolean;
  unit?: string;
  /** If set, bar animates from 0 and blurs once it passes this value's width */
  animateAndBlurAt?: number;
}) {
  const targetWidth = Math.min((value / max) * 100, 100);
  const blurThreshold = animateAndBlurAt != null ? Math.min((animateAndBlurAt / max) * 100, 100) : null;

  const [currentWidth, setCurrentWidth] = useState(animateAndBlurAt != null ? 0 : targetWidth);
  const [isBlurred, setIsBlurred] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const rafRef = useRef<number | undefined>(undefined);
  const rowRef = useRef<HTMLDivElement>(null);

  // Start animation only when element is in upper 2/3 of viewport
  useEffect(() => {
    if (animateAndBlurAt == null || hasStarted) return;
    const el = rowRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setHasStarted(true);
          observer.disconnect();
        }
      },
      { rootMargin: "0px 0px -33% 0px", threshold: 0 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [animateAndBlurAt, hasStarted]);

  useEffect(() => {
    if (animateAndBlurAt == null || !hasStarted) return;

    const timeout = setTimeout(() => {
      const startTime = performance.now();
      const duration = 15000;

      const tick = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const w = eased * targetWidth;
        setCurrentWidth(w);

        if (blurThreshold != null && w >= blurThreshold && !isBlurred) {
          setIsBlurred(true);
        }

        if (progress < 1) {
          rafRef.current = requestAnimationFrame(tick);
        }
      };

      rafRef.current = requestAnimationFrame(tick);
    }, 300);

    return () => {
      clearTimeout(timeout);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [hasStarted, animateAndBlurAt, targetWidth, blurThreshold]);

  const shouldBlur = animateAndBlurAt != null ? isBlurred : blurred;

  const hideValue = animateAndBlurAt != null;
  let displayValue: string;
  if (hideValue) {
    displayValue = "";
  } else if (partialReveal) {
    displayValue = formatPartialValue(value) + ` ${unit}`;
  } else {
    displayValue = value + ` ${unit}`;
  }

  return (
    <div ref={rowRef}>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="flex items-center gap-1">
          <span
            className={`font-semibold transition-all duration-300 ${
              shouldBlur ? "blur-[8px] select-none pointer-events-none" : "text-foreground"
            }`}
          >
            {displayValue}
          </span>
          {shouldBlur && <Lock className="w-3 h-3 text-muted-foreground shrink-0" />}
        </span>
      </div>
      <div className="h-6 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full ${color} ${animateAndBlurAt == null ? "transition-all duration-700" : ""}`}
          style={{ width: `${currentWidth}%` }}
        />
      </div>
    </div>
  );
}
