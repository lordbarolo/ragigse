import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";
import CompcareLogo from "@/components/CompcareLogo";
import { trackCta } from "@/lib/trackCta";

export default function LandingNav() {
  return (
    <nav className="sticky top-0 z-[200] flex items-center justify-between px-6 lg:px-[60px] h-[60px] bg-background/90 backdrop-blur-[24px] border-b border-foreground/[0.07]">
      <Link to="/" aria-label="CompCare startsida" onClick={() => trackCta("landing_nav", "Logo", "/")}>
        <CompcareLogo variant="wordmark" />
      </Link>
      <div className="flex items-center gap-2">
        <ThemeToggle />
        <a
          href="#steps"
          onClick={() => trackCta("landing_nav", "Hur det fungerar", "#steps")}
          className="hidden md:block text-foreground/65 text-sm no-underline px-3 py-1.5 rounded-lg hover:text-foreground transition-colors"
        >
          Hur det fungerar
        </a>
        <a
          href="#data"
          onClick={() => trackCta("landing_nav", "Om datan", "#data")}
          className="hidden md:block text-foreground/65 text-sm no-underline px-3 py-1.5 rounded-lg hover:text-foreground transition-colors"
        >
          Om datan
        </a>
        <Link
          to="/#roles"
          onClick={() => trackCta("landing_nav", "Se din rapport", "/#roles")}
          className="bg-primary text-primary-foreground font-display font-bold text-sm px-[18px] py-2 rounded-lg no-underline hover:opacity-90 hover:-translate-y-px transition-all whitespace-nowrap"
        >
          Se din rapport →
        </Link>
      </div>
    </nav>
  );
}
