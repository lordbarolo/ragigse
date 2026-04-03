import { useEffect } from "react";
import { Link } from "react-router-dom";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import MarketSearchBox from "@/components/demo/MarketSearchBox";

export default function DemoLanding() {
  useEffect(() => { document.title = "CompCare — Marknadsmässig ersättning"; }, []);

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" aria-label="CompCare startsida"><CompcareLogo variant="full" /></Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* Hero */}
      <section className="px-4 pt-10 pb-16">
        <MarketSearchBox />
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CompCare</p>
      </footer>
    </div>
  );
}
