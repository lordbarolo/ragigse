import { forwardRef, ImgHTMLAttributes } from "react";

type LogoVariant = "wordmark" | "full" | "icon";

interface CompcareLogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, "src" | "alt"> {
  variant?: LogoVariant;
  className?: string;
  /** Use light colors (for dark backgrounds) — kept for API compatibility */
  inverted?: boolean;
}

/**
 * Renders the official CompCare logo from /public/compcare-logo.svg.
 * The file is the single source of truth for branding.
 */
const CompcareLogo = forwardRef<HTMLImageElement, CompcareLogoProps>(
  ({ variant = "wordmark", className = "", inverted: _inverted, ...rest }, ref) => {
    // Sizing per variant — kept aligned with previous component heights
    const sizeClass =
      variant === "full" ? "h-8 w-auto" : variant === "icon" ? "h-6 w-auto" : "h-7 w-auto";

    return (
      <img
        ref={ref}
        src="/compcare-logo.svg"
        alt="CompCare"
        className={`${sizeClass} ${className}`}
        {...rest}
      />
    );
  }
);

CompcareLogo.displayName = "CompcareLogo";

export default CompcareLogo;
