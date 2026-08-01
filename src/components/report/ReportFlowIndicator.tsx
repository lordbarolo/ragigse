import { useEffect, useState } from "react";

interface FlowStep {
  id: string;
  label: string;
}

interface Props {
  steps: FlowStep[];
}

/**
 * Vertical flow indicator ("röd tråd") tucked against the left edge.
 * Collapsed by default (only dots visible) — expands on hover/focus
 * to reveal labels. Tracks active section via IntersectionObserver.
 */
export default function ReportFlowIndicator({ steps }: Props) {
  const [activeId, setActiveId] = useState<string>(steps[0]?.id || "");
  const [expanded, setExpanded] = useState(false);

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

  const handleClick = (id: string) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <aside
      aria-label="Innehåll i rapporten"
      onMouseEnter={() => setExpanded(true)}
      onMouseLeave={() => setExpanded(false)}
      onFocus={() => setExpanded(true)}
      onBlur={() => setExpanded(false)}
      className="hidden lg:block fixed left-0 top-1/2 -translate-y-1/2 z-30 group"
    >
      <div
        className={`transition-all duration-300 ease-out pl-3 pr-4 py-5 rounded-r-2xl ${
          expanded
            ? "bg-background/80 backdrop-blur-md border-y border-r border-foreground/[0.06] shadow-xs"
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
                  className="flex items-center gap-3 group/item focus:outline-hidden"
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
