import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, Users, FileCheck, Clock, Lock, ArrowRight } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { trackEvent } from "@/lib/trackEvent";
import ComingSoonOverlay from "@/components/ComingSoonOverlay";

const FEATURES = [
  {
    icon: Lock,
    title: "Du äger dina handlingar",
    desc: "Sluta låta bemanningsföretag sitta på dina intyg och referenser permanent. Samla allt på ett ställe — delat på dina villkor.",
  },
  {
    icon: Users,
    title: "Bjud in referensgivare",
    desc: "Skicka en länk till kollegor och chefer. De lämnar omdöme med kompetensbetyg — enkelt och snabbt, utan att behöva skapa konto.",
  },
  {
    icon: FileCheck,
    title: "Verifieringsstege",
    desc: "Varje referens genomgår en verifieringsstege: inskickad → e-post → domän → BankID. Ju högre nivå, desto starkare tillit.",
  },
  {
    icon: Clock,
    title: "Tidsbegränsad åtkomst",
    desc: "Dela dina dokument med tidsbegränsad tillgång. Du bestämmer vem som ser vad — och kan återkalla åtkomst när som helst.",
  },
];

const TRUST_LEVELS = [
  { level: "Submitted", label: "Inskickad", color: "bg-muted-foreground/20" },
  { level: "Email", label: "E-postverifierad", color: "bg-amber-500/20 text-amber-700 dark:text-amber-400" },
  { level: "Domain", label: "Domänverifierad", color: "bg-blue-500/20 text-blue-700 dark:text-blue-400" },
  { level: "BankID", label: "BankID-verifierad", color: "bg-primary/20 text-primary" },
];

export default function ReferenserInfo() {
  useEffect(() => {
    trackEvent("referenser_info_viewed");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <LandingNav />

      <ComingSoonOverlay label="Referenser & verifikationer — kommer snart">
      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1 rounded-full text-amber-600 dark:text-amber-400 text-xs font-semibold mb-6 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            Verifierad tillit
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Referenser &<br />Verifikationer
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-4">
            Ta kontroll över dina handlingar och intyg. Samla allt i en miljö du äger — dela på dina villkor, spårbart och säkert.
          </p>
          <p className="text-sm text-muted-foreground/70 mb-10">
            Kräver inloggning · Gratis att använda
          </p>

          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/registrera"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base no-underline"
            >
              Skapa konto & kom igång
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/logga-in"
              className="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border px-8 py-4 rounded-2xl font-semibold transition-all text-base no-underline"
            >
              Logga in
            </Link>
          </div>
        </div>
      </section>

      {/* Features grid */}
      <section className="py-16 px-6">
        <div className="max-w-5xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Funktioner</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-10">
            Hur det fungerar
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border rounded-xl overflow-hidden">
            {FEATURES.map((f, i) => (
              <div key={i} className="bg-background p-8 flex flex-col">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-5 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <f.icon className="w-5 h-5" />
                </div>
                <h3 className="text-base font-semibold text-foreground mb-2">{f.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trust Score */}
      <section className="py-16 px-6 bg-card border-y border-border">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-2">Verifieringsnivåer</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
            Trust Score
          </h2>
          <p className="text-muted-foreground mb-8 max-w-lg">
            Din Trust Score beräknas utifrån antal och kvalitet på dina verifierade referenser. Högre verifieringsnivå ger starkare tillit hos uppdragsgivare.
          </p>

          <div className="flex flex-wrap gap-3 mb-10">
            {TRUST_LEVELS.map((t) => (
              <span key={t.level} className={`px-4 py-2 rounded-full text-sm font-medium ${t.color}`}>
                {t.label}
              </span>
            ))}
          </div>

          <div className="bg-background border border-border rounded-2xl p-6">
            <p className="text-sm text-muted-foreground mb-3">
              Endast verifierade referenser (nivå e-post och uppåt) inkluderas i ditt publika bevis. Inskickade men overifierade referenser räknas inte.
            </p>
            <p className="text-sm text-muted-foreground">
              En referens äldre än 6 månader markeras som <span className="font-medium text-foreground">stale</span> och kan inte bifogas nya ansökningar förrän den förnyas.
            </p>
          </div>
        </div>
      </section>

      {/* Verify section */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <p className="text-xs font-semibold uppercase tracking-widest text-primary mb-2">Verify</p>
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground mb-4">
            Eliminera dubbelpresentationer
          </h2>
          <p className="text-muted-foreground mb-6 max-w-lg leading-relaxed">
            Med Verify kan bemanningsföretag verifiera att du auktoriserat deras presentation — digitalt, med BankID. Regioner och uppdragsgivare ser ett kryptografiskt bevis istället för att behöva fråga konsulten direkt.
          </p>

          <div className="bg-card border border-border rounded-2xl p-8 mb-8">
            <h3 className="font-semibold text-foreground mb-4">Så fungerar det</h3>
            <ol className="space-y-3 text-sm text-muted-foreground">
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">1</span>
                Bemanningsföretaget initierar en verifieringsförfrågan
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">2</span>
                Du får en länk via SMS och signerar med BankID
              </li>
              <li className="flex gap-3">
                <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">3</span>
                Ett digitalt bevis genereras — delbart och spårbart
              </li>
            </ol>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              to="/registrera"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base no-underline"
            >
              Kom igång
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      </ComingSoonOverlay>

      <LandingFooter />
    </div>
  );
}
