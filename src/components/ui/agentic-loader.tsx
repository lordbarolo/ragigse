import * as React from "react";
import { cn } from "@/lib/utils";

interface AgenticLoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  /** Optional status text shown next to the dots */
  label?: string;
  /** Visual size: sm (inline), md (default), lg (full-row hero) */
  size?: "sm" | "md" | "lg";
}

/**
 * AgenticLoader — subtle "the system is thinking" indicator.
 * Three pulsing violet/pink dots + optional label. Use inside cards while
 * compensation/report generation is running.
 */
export const AgenticLoader = React.forwardRef<HTMLDivElement, AgenticLoaderProps>(
  ({ label, size = "md", className, ...props }, ref) => {
    const dotSize = size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2";
    const textSize = size === "sm" ? "text-xs" : size === "lg" ? "text-sm" : "text-xs";

    return (
      <div
        ref={ref}
        role="status"
        aria-live="polite"
        aria-label={label ?? "Bearbetar"}
        className={cn("inline-flex items-center gap-2", className)}
        {...props}
      >
        <span className="inline-flex items-center gap-1">
          <span
            className={cn("agentic-dot rounded-full bg-primary", dotSize)}
            style={{ animationDelay: "0s" }}
          />
          <span
            className={cn("agentic-dot rounded-full bg-accent", dotSize)}
            style={{ animationDelay: "0.16s" }}
          />
          <span
            className={cn("agentic-dot rounded-full bg-[hsl(var(--cyan))]", dotSize)}
            style={{ animationDelay: "0.32s" }}
          />
        </span>
        {label && (
          <span className={cn("font-medium tracking-wide text-muted-foreground", textSize)}>
            {label}
          </span>
        )}
      </div>
    );
  },
);
AgenticLoader.displayName = "AgenticLoader";
