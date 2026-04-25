import { forwardRef, HTMLAttributes } from "react";

type LogoVariant = "wordmark" | "full" | "icon";

interface CompcareLogoProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: LogoVariant;
  className?: string;
  /** Force light/dark variant. If omitted, uses CSS class-based theme switching. */
  inverted?: boolean;
}

/**
 * Renders the CompCare wordmark using the official PNG logo assets.
 * Automatically switches between light and dark variants based on the
 * `dark` class on <html> (set by the theme system).
 *
 * - logo light = mörk text → används på ljus bakgrund
 * - logo dark  = vit text  → används på mörk bakgrund
 */
const CompcareLogo = forwardRef<HTMLSpanElement, CompcareLogoProps>(
  ({ variant = "wordmark", className = "", inverted, ...rest }, ref) => {
    const sizeClass =
      variant === "full" ? "h-9" : variant === "icon" ? "h-7" : "h-8";

    // If `inverted` is explicitly set, force a single variant.
    if (typeof inverted === "boolean") {
      const src = inverted ? "/compcare-logo-dark.png" : "/compcare-logo-light.png";
      return (
        <span
          ref={ref}
          className={`inline-flex items-center ${sizeClass} ${className}`}
          aria-label="CompCare"
          role="img"
          {...rest}
        >
          <img
            src={src}
            alt="CompCare"
            className="h-full w-auto select-none"
            draggable={false}
          />
        </span>
      );
    }

    // Otherwise, render both and let CSS show the right one based on theme.
    return (
      <span
        ref={ref}
        className={`inline-flex items-center ${sizeClass} ${className}`}
        aria-label="CompCare"
        role="img"
        {...rest}
      >
        <img
          src="/compcare-logo-light.png"
          alt="CompCare"
          className="h-full w-auto select-none block dark:hidden"
          draggable={false}
        />
        <img
          src="/compcare-logo-dark.png"
          alt="CompCare"
          className="h-full w-auto select-none hidden dark:block"
          draggable={false}
          aria-hidden="true"
        />
      </span>
    );
  }
);

CompcareLogo.displayName = "CompcareLogo";

export default CompcareLogo;
