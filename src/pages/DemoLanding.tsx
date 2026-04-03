import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, ShieldCheck, FileSearch, MessageSquare, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import Hero from "@/components/landing/Hero";

const SERVICES = [
  {
    icon: ShieldCheck,
    title: "Löneanalys",
    desc: "Jämför din ersättning med SKR:s ramavtalspriser för 290 kommuner och 21 regioner.",
    href: "/",
    cta: "Analysera din lön",
  },
  {
    icon: FileSearch,
    title: "Fakturakontroll",
    desc: "AI-assistenten granskar dina fakturor retroaktivt och hittar avvikelser.",
    href: "/consultant/fakturakontroll",
    cta: "Granska fakturor",
  },
  {
    icon: MessageSquare,
    title: "Förhandlingsassistent",
    desc: "Ställ frågor om marknadspriser, avtalsvillkor och förhandlingsstrategier.",
    href: "/consultant/forhandla",
    cta: "Starta förhandling",
  },
];

const TRUST = [
  "Baserat på SKR:s officiella ramavtal 2026",
  "Lönestatistik från Medlingsinstitutet",
  "290 kommuner, alla specialiseringar",
  "BankID-säkrad verifiering",
];

export default function DemoLanding() {
  useEffect(() => { document.title = "CompCare — Demo startsida"; }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" aria-label="CompCare startsida"><CompcareLogo variant="full" /></Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/logga-in">
              <Button variant="ghost" size="sm" className="text-muted-foreground">Logga in</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <Hero />

      {/* CTA */}
      <div className="flex flex-col items-center gap-3 px-6 pb-10">
        <Link to="/">
          <Button size="lg" className="gap-2 shadow-lg shadow-primary/20">
            Gör löneanalysen <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
        <p className="text-xs text-muted-foreground max-w-md text-center">
          Svara på 6 frågor — få din personliga marknadsrapport direkt.
        </p>
      </div>

      {/* Services */}
      <section className="max-w-6xl mx-auto px-6 pb-20">
        <div className="grid md:grid-cols-3 gap-6">
          {SERVICES.map((s) => (
            <article key={s.title} className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow">
              <s.icon className="w-8 h-8 text-primary mb-4" />
              <h2 className="text-xl font-bold text-foreground mb-3">{s.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{s.desc}</p>
              <Link to={s.href}>
                <Button variant="outline" size="sm" className="gap-2">
                  {s.cta} <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* Trust */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Verifierad marknadsdata</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TRUST.map((t) => (
              <div key={t} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{t}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-10 px-6">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <CompcareLogo variant="full" />
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/vanliga-fragor" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/integritetspolicy" className="hover:text-foreground transition-colors">Integritetspolicy</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CompCare</p>
        </div>
      </footer>
    </div>
  );
}
