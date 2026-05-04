import { useEffect, useState } from "react";

interface FlowStep {
  id: string;
  label: string;
}

interface Props {
  steps: FlowStep[];
}

/**
 * Vertical flow indicator ("röd tråd") shown on the left side of the report
 * on lg+ viewports. Tracks the currently visible section via IntersectionObserver
 * and lets the user click to jump.
 */
export default function ReportFlowIndicator({ steps }: Props) {
  const [activeId, setActiveId] = useState<string>(steps[0]?.id || "");

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        // Pick the entry closest to the top of viewport that's intersecting
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
      className="hidden lg:block fixed left-6 xl:left-10 top-1/2 -translate-y-1/2 z-30 max-w-[220px]"
    >
      <ol className="relative border-l border-foreground/10 pl-4 space-y-3.5">
        {steps.map((step) => {
          const isActive = activeId === step.id;
          return (
            <li key={step.id} className="relative">
              <span
                className={`absolute -left-[21px] top-[7px] w-2 h-2 rounded-full transition-all ${
                  isActive
                    ? "bg-primary ring-4 ring-primary/15 scale-110"
                    : "bg-foreground/20"
                }`}
              />
              <button
                type="button"
                onClick={() => handleClick(step.id)}
                className={`text-left text-[12px] leading-snug transition-colors ${
                  isActive
                    ? "text-foreground font-semibold"
                    : "text-muted-foreground/70 hover:text-foreground"
                }`}
              >
                {step.label}
              </button>
            </li>
          );
        })}
      </ol>
    </aside>
  );
}
