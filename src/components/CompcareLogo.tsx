import { forwardRef, HTMLAttributes } from "react";

type LogoVariant = "wordmark" | "full" | "icon";

interface CompcareLogoProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: LogoVariant;
  className?: string;
  /** Force light/dark variant. If omitted, uses CSS class-based theme switching. */
  inverted?: boolean;
}

/**
 * Renders the official vårdbemanning.ai logo using the brand SVG assets.
 *
 * Variants:
 *  - "wordmark" → ren typografi (vardbemanning.ai) utan ikonstaplar
 *  - "full"     → ikonstaplar + text horisontellt
 *  - "icon"     → endast ikonstaplar (kvadratisk)
 *
 * Light/dark växling sker automatiskt via Tailwinds `dark:`-klass
 * (eller via `inverted`-propet om man vill tvinga ett läge).
 */
const CompcareLogo = forwardRef<HTMLSpanElement, CompcareLogoProps>(
  ({ variant = "wordmark", className = "", inverted, ...rest }, ref) => {
    const sizeClass =
      variant === "icon" ? "h-8 w-8" : variant === "full" ? "h-5 md:h-6" : "h-5 md:h-6";

    const fileFor = (mode: "light" | "dark") => {
      if (variant === "icon") return "/vardbemanning-symbol.svg";
      // Symbolen används endast i footern och som favicon – övriga ytor
      // (inkl. "full") renderar därför wordmarken.
      return mode === "dark"
        ? "/vardbemanning-wordmark-dark.svg"
        : "/vardbemanning-wordmark-light.svg";
    };

    const altText = "vardbemanning.ai – lönekoll för vårdkonsulter";

    if (typeof inverted === "boolean") {
      const src = fileFor(inverted ? "dark" : "light");
      return (
        <span
          ref={ref}
          className={`inline-flex items-center ${sizeClass} ${className}`}
          aria-label={altText}
          role="img"
          {...rest}
        >
          <img src={src} alt={altText} className="h-full w-auto select-none" draggable={false} />
        </span>
      );
    }

    // Icon-varianten är färgneutral och behöver ingen växling
    if (variant === "icon") {
      return (
        <span
          ref={ref}
          className={`inline-flex items-center ${sizeClass} ${className}`}
          aria-label={altText}
          role="img"
          {...rest}
        >
          <img src="/vardbemanning-icon-v2.png" alt={altText} className="h-full w-auto select-none" draggable={false} />
        </span>
      );
    }

    return (
      <span
        ref={ref}
        className={`inline-flex items-center ${sizeClass} ${className}`}
        aria-label={altText}
        role="img"
        {...rest}
      >
        <img
          src={fileFor("light")}
          alt={altText}
          className="h-full w-auto select-none block dark:hidden"
          draggable={false}
        />
        <img
          src={fileFor("dark")}
          alt={altText}
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
