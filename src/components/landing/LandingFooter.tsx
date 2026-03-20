import { Link } from "react-router-dom";

export default function LandingFooter() {
  return (
    <footer className="border-t border-foreground/[0.07] py-8 px-6 md:px-10 flex items-center justify-between flex-wrap gap-4 bg-[hsl(var(--dark-2))]">
      <span className="font-display text-[17px] font-extrabold tracking-tight">
        comp<em className="text-primary not-italic">care</em>
      </span>
      <div className="flex gap-5 flex-wrap">
        <Link to="/vanliga-fragor" className="text-[13px] text-foreground/35 no-underline hover:text-foreground transition-colors">Om CompCare</Link>
        <a href="#data" className="text-[13px] text-foreground/35 no-underline hover:text-foreground transition-colors">Datakällor</a>
        <Link to="/integritetspolicy" className="text-[13px] text-foreground/35 no-underline hover:text-foreground transition-colors">Integritetspolicy</Link>
      </div>
      <span className="text-[11px] text-foreground/15">© 2026 CompCare · Piemonte Invest AB</span>
    </footer>
  );
}
