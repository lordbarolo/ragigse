import { Link } from "react-router-dom";
import ThemeToggle from "@/components/ThemeToggle";

export default function LandingNav() {
  return (
    <nav className="sticky top-0 z-[200] flex items-center justify-between px-6 lg:px-[60px] h-[60px] bg-background/90 backdrop-blur-[24px] border-b border-foreground/[0.07]">
      <Link to="/" className="font-display text-xl font-extrabold tracking-tight text-foreground no-underline">
        comp<em className="text-primary not-italic">care</em>
      </Link>
      <div className="flex items-center gap-2">
        <a href="#steps" className="hidden md:block text-foreground/65 text-sm no-underline px-3 py-1.5 rounded-lg hover:text-foreground transition-colors">
          Hur det fungerar
        </a>
        <a href="#data" className="hidden md:block text-foreground/65 text-sm no-underline px-3 py-1.5 rounded-lg hover:text-foreground transition-colors">
          Om datan
        </a>
        <a
          href="#roles"
          className="bg-primary text-primary-foreground font-display font-bold text-sm px-[18px] py-2 rounded-lg no-underline hover:opacity-90 hover:-translate-y-px transition-all whitespace-nowrap"
        >
          Se din rapport →
        </a>
      </div>
    </nav>
  );
}
