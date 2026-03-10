import { useState } from "react";
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
    <div className={`p-3 rounded-lg ${accent ? "bg-primary/[0.08] border border-primary/20" : "bg-muted/30"}`}>
      <p className={`text-xs mb-1 ${accent ? "text-primary/70" : "text-muted-foreground"}`}>{label}</p>
      <p className={`text-base font-semibold ${accent ? "text-primary" : "text-foreground"}`}>
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

/* ── ScriptBlock (with copy button) ──────────────────── */

export function ScriptBlock({ step, title, text }: { step: number; title: string; text: string }) {
  const [copied, setCopied] = useState(false);
  const isQuote = text.startsWith('"') || text.startsWith('"') || text.startsWith('«');

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text.replace(/^["«"]+|["»"]+$/g, ''));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch { /* fallback: ignore */ }
  };

  return (
    <div className="flex gap-4 relative">
      <div className="w-8 h-8 rounded-full bg-primary/20 border border-primary/40 flex items-center justify-center flex-shrink-0 z-10">
        <span className="text-primary text-xs font-bold">{step}</span>
      </div>
      <div className="flex-1">
        <p className="font-semibold text-foreground text-sm">{title}</p>
        {isQuote ? (
          <div className="bg-muted/30 rounded-lg p-3 mt-2 relative group">
            <p className="text-muted-foreground text-sm italic pr-8">{text}</p>
            <button
              onClick={handleCopy}
              className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-primary"
              title="Kopiera"
            >
              {copied ? (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              ) : (
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg>
              )}
            </button>
          </div>
        ) : (
          <p className="mt-1 text-muted-foreground text-sm italic">{text}</p>
        )}
      </div>
    </div>
  );
}

/* ── BarRow ───────────────────────────────────────────── */

import { useEffect, useRef } from "react";

export function BarRow({
  label,
  value,
  max,
  color,
  blurred = false,
  partialReveal = false,
  unit = "kr/h",
  animateAndBlurAt,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  blurred?: boolean;
  partialReveal?: boolean;
  unit?: string;
  animateAndBlurAt?: number;
}) {
  const targetWidth = Math.min((value / max) * 100, 100);
  const blurThreshold = animateAndBlurAt != null ? Math.min((animateAndBlurAt / max) * 100, 100) : null;

  const [currentWidth, setCurrentWidth] = useState(animateAndBlurAt != null ? 0 : targetWidth);
  const [isBlurred, setIsBlurred] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const rafRef = useRef<number>();
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (animateAndBlurAt == null || hasStarted) return;
    const el = rowRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
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
