import { forwardRef, HTMLAttributes } from "react";

type LogoVariant = "wordmark" | "full" | "icon";

interface CompcareLogoProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: LogoVariant;
  className?: string;
  /** Use light colors (for dark backgrounds) — kept for API compatibility */
  inverted?: boolean;
}

/**
 * Renders the CompCare wordmark inline as SVG so it inherits currentColor
 * (theme-aware: dark text in light mode, light text in dark mode).
 */
const CompcareLogo = forwardRef<HTMLSpanElement, CompcareLogoProps>(
  ({ variant = "wordmark", className = "", inverted: _inverted, ...rest }, ref) => {
    const sizeClass =
      variant === "full" ? "h-8" : variant === "icon" ? "h-6" : "h-7";

    return (
      <span
        ref={ref}
        className={`inline-flex items-center text-foreground ${sizeClass} ${className}`}
        aria-label="CompCare"
        role="img"
        {...rest}
      >
        <svg
          viewBox="0 0 1200 300"
          xmlns="http://www.w3.org/2000/svg"
          className="h-full w-auto"
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="compcareGradPrimary" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#5B5FEF" />
              <stop offset="100%" stopColor="#6C63FF" />
            </linearGradient>
          </defs>
          <rect x="80" y="70" rx="20" ry="20" width="120" height="40" fill="currentColor" opacity="0.45" />
          <rect x="80" y="140" rx="20" ry="20" width="180" height="50" fill="url(#compcareGradPrimary)" />
          <text x="300" y="180" fontFamily="Inter, Arial, sans-serif" fontSize="120" fontWeight={600}>
            <tspan fill="currentColor">comp</tspan>
            <tspan fill="url(#compcareGradPrimary)">care</tspan>
          </text>
        </svg>
      </span>
    );
  }
);

CompcareLogo.displayName = "CompcareLogo";

export default CompcareLogo;
