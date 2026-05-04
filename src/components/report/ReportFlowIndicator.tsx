import { useEffect, useRef, useState } from "react";

interface FlowStep {
  id: string;
  label: string;
}

interface Props {
  steps: FlowStep[];
  /** Section id whose top edge the indicator should align with initially. */
  anchorId?: string;
}

/**
 * Vertical flow indicator ("röd tråd") tucked against the left edge.
 * Starts aligned with `anchorId`'s top edge and follows scroll upward
 * until it reaches its centered resting position, where it sticks.
 */
export default function ReportFlowIndicator({ steps, anchorId }: Props) {
  const [activeId, setActiveId] = useState<string>(steps[0]?.id || "");
  const [expanded, setExpanded] = useState(false);
  const [topPx, setTopPx] = useState<number | null>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);

  // Track active section
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) {
          setActiveId((visible[0].target as HTMLElement).id);
        }
      },
      { rootMargin: "-20% 0px -60% 0px", threshold: 0 }
    );

    steps.forEach((s) => {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, [steps]);

  // Track sticky top position relative to anchor
  useEffect(() => {
    if (!anchorId) return;
    let raf = 0;

    const update = () => {
      raf = 0;
      const anchor = document.getElementById(anchorId);
      const indicatorH = wrapperRef.current?.offsetHeight ?? 0;
      const minTop = Math.max(16, (window.innerHeight - indicatorH) / 2);
      if (!anchor) {
        setTopPx(minTop);
        return;
      }
      const anchorTop = anchor.getBoundingClientRect().top;
      setTopPx(Math.max(minTop, anchorTop));
    };

    const onScroll = () => {
      if (raf) return;
      raf = requestAnimationFrame(update);
    };

    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [anchorId]);

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const positionStyle =
    topPx !== null
      ? { top: `${topPx}px` }
      : undefined;
  const positionClass =
    topPx !== null ? "" : "top-1/2 -translate-y-1/2";

  return (
    <aside
      aria-label="Innehåll i rapporten"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      className={`hidden lg:block fixed left-0 z-30 group ${positionClass}`}
      style={positionStyle}
    >
      <div
        ref={wrapperRef}
        className={`transition-all duration-300 ease-out pl-3 pr-4 py-5 rounded-r-2xl ${
          expanded
            ? "bg-background/80 backdrop-blur-md border-y border-r border-foreground/[0.06] shadow-sm"
            : "bg-transparent"
        }`}
      >
        <ol className="relative space-y-4">
          {steps.map((step) => {
            const isActive = activeId === step.id;
            return (
              <li key={step.id} className="relative flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => handleClick(step.id)}
                  aria-label={step.label}
                  className="flex items-center gap-3 group/item focus:outline-none"
                >
                  <span
                    className={`shrink-0 rounded-full transition-all duration-300 ${
                      isActive
                        ? "bg-primary w-1.5 h-6"
                        : "bg-foreground/20 group-hover:bg-foreground/40 w-1.5 h-1.5"
                    }`}
                  />
                  <span
                    className={`whitespace-nowrap text-[12px] leading-snug transition-all duration-300 ${
                      expanded
                        ? "opacity-100 translate-x-0"
                        : "opacity-0 -translate-x-2 pointer-events-none"
                    } ${
                      isActive
                        ? "text-foreground font-semibold"
                        : "text-muted-foreground/80 group-hover/item:text-foreground"
                    }`}
                  >
                    {step.label}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
