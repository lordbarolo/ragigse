import { Link } from "react-router-dom";
import { ShieldCheck, CheckCircle2, ArrowRight, FileCheck, Users, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";

const BENEFITS = [
  {
    icon: FileCheck,
    title: "Eliminera dubbelpresentationer",
    description:
      "Digitalt representationsbevis signerat med BankID. Uppdragsgivaren verifierar direkt — ingen tvekan om vem som företräder konsulten.",
  },
  {
    icon: Users,
    title: "Smidig konsulthantering",
    description:
      "Skicka representationsförfrågningar, följ signeringsstatus i realtid och hämta bevis med ett klick.",
  },
  {
    icon: Lock,
    title: "Säker & revisionsspårbar",
    description:
      "Varje steg loggas i en audit trail. BankID-signering säkerställer juridisk giltighet. Data isoleras per organisation.",
  },
];

const STEPS = [
  { step: "1", text: "Skapa ett företagskonto och bjud in kollegor" },
  { step: "2", text: "Skicka representationsförfrågan till konsulten" },
  { step: "3", text: "Konsulten signerar med BankID via SMS-länk" },
  { step: "4", text: "Ladda ner digitalt bevis — klart att presentera" },
];

export default function AgencyLanding() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* ── Nav ─────────────────────────────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-16">
          <Link to="/">
            <CompcareLogo variant="full" />
          </Link>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link to="/logga-in">
              <Button variant="ghost" size="sm">Logga in</Button>
            </Link>
            <Link to="/registrera/bemanning">
              <Button size="sm">Skapa företagskonto</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* ── Hero ────────────────────────────────── */}
      <section className="bg-[hsl(var(--hero-bg))] text-[hsl(var(--hero-fg))]">
        <div className="max-w-5xl mx-auto px-6 py-20 md:py-28 text-center space-y-6">
          <div className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            För bemanningsföretag
          </div>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight font-[family-name:var(--font-display)]">
            Slipp dubbelpresentationer.
            <br />
            <span className="text-primary-foreground/80">Få digitalt representationsbevis.</span>
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-2xl mx-auto">
            CompCare ger ert bemanningsföretag ett BankID-signerat bevis som eliminerar tveksamheter
            hos uppdragsgivare. Hela flödet tar under två minuter.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
            <Link to="/registrera/bemanning">
              <Button size="lg" className="gap-2 text-base">
                Kom igång gratis <ArrowRight className="w-4 h-4" />
              </Button>
            </Link>
            <Link to="/verify-info">
              <Button size="lg" variant="outline" className="text-base border-white/30 text-white hover:bg-white/10">
                Så fungerar det
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* ── Benefits ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <h2 className="text-2xl md:text-3xl font-bold text-center mb-12 font-[family-name:var(--font-display)]">
          Varför bemanningsföretag väljer CompCare
        </h2>
        <div className="grid md:grid-cols-3 gap-8">
          {BENEFITS.map((b) => (
            <div key={b.title} className="bg-card border border-border rounded-xl p-6 space-y-4">
              <div className="w-11 h-11 rounded-lg bg-primary/10 flex items-center justify-center">
                <b.icon className="w-5 h-5 text-primary" />
              </div>
              <h3 className="text-lg font-semibold">{b.title}</h3>
              <p className="text-muted-foreground text-sm leading-relaxed">{b.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Steps ───────────────────────────────── */}
      <section className="bg-card border-y border-border">
        <div className="max-w-3xl mx-auto px-6 py-20 space-y-10">
          <h2 className="text-2xl md:text-3xl font-bold text-center font-[family-name:var(--font-display)]">
            Så enkelt är det
          </h2>
          <ol className="space-y-6">
            {STEPS.map((s) => (
              <li key={s.step} className="flex items-start gap-4">
                <span className="w-9 h-9 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm shrink-0">
                  {s.step}
                </span>
                <p className="text-foreground pt-1.5">{s.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ── CTA ─────────────────────────────────── */}
      <section className="max-w-3xl mx-auto px-6 py-20 text-center space-y-6">
        <h2 className="text-2xl md:text-3xl font-bold font-[family-name:var(--font-display)]">
          Redo att eliminera dubbelpresentationer?
        </h2>
        <p className="text-muted-foreground max-w-lg mx-auto">
          Skapa ett företagskonto kostnadsfritt och skicka er första representationsförfrågan idag.
        </p>
        <Link to="/registrera/bemanning">
          <Button size="lg" className="gap-2 text-base">
            Skapa företagskonto <ArrowRight className="w-4 h-4" />
          </Button>
        </Link>
      </section>

      {/* ── Footer ──────────────────────────────── */}
      <footer className="border-t border-border bg-card/60 py-10">
        <div className="max-w-5xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CompcareLogo variant="icon" />
            <span>© {new Date().getFullYear()} CompCare</span>
          </div>
          <div className="flex gap-6">
            <Link to="/integritetspolicy" className="hover:text-foreground transition-colors">Integritetspolicy</Link>
            <Link to="/vanliga-fragor" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/" className="hover:text-foreground transition-colors">För konsulter</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
