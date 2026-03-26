import { forwardRef } from "react";

type LogoVariant = "wordmark" | "full" | "icon";

interface CompcareLogoProps {
  variant?: LogoVariant;
  className?: string;
  /** Use light colors (for dark backgrounds) */
  inverted?: boolean;
}

const CompcareLogo = forwardRef<SVGSVGElement, CompcareLogoProps>(
  ({ variant = "wordmark", className = "", inverted = false }, ref) => {
    const textFill = inverted ? "white" : "hsl(var(--foreground))";
    const accentFill = "hsl(var(--primary))";
    const barMuted = "#94A3B8";

    if (variant === "wordmark") {
      return (
        <svg ref={ref} viewBox="0 0 160 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={`h-7 w-auto ${className}`} aria-label="Compcare" role="img">
          <text x="0" y="22" fontFamily="'Inter', sans-serif" fontSize="24" fontWeight="700" letterSpacing="-0.02em">
            <tspan fill={textFill}>comp</tspan>
            <tspan fill={accentFill}>care</tspan>
          </text>
        </svg>
      );
    }

    if (variant === "full") {
      return (
        <svg ref={ref} viewBox="0 0 204 32" fill="none" xmlns="http://www.w3.org/2000/svg" className={`h-8 w-auto ${className}`} aria-label="Compcare" role="img">
          <rect x="0" y="5" width="20" height="7" rx="2" fill={barMuted} />
          <rect x="0" y="17" width="33" height="7" rx="2" fill={accentFill} />
          <text x="43" y="24" fontFamily="'Inter', sans-serif" fontSize="24" fontWeight="700" letterSpacing="-0.02em">
            <tspan fill={textFill}>comp</tspan>
            <tspan fill={accentFill}>care</tspan>
          </text>
        </svg>
      );
    }

    return (
      <svg ref={ref} viewBox="0 0 33 24" fill="none" xmlns="http://www.w3.org/2000/svg" className={`h-6 w-auto ${className}`} aria-label="Compcare" role="img">
        <rect x="0" y="0" width="20" height="7" rx="2" fill={barMuted} />
        <rect x="0" y="12" width="33" height="7" rx="2" fill={accentFill} />
      </svg>
    );
  }
);

CompcareLogo.displayName = "CompcareLogo";

export default CompcareLogo;
