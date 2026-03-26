import { Link } from "react-router-dom";
import { useEffect } from "react";
import { ShieldCheck, Fingerprint, FileCheck, ArrowRight, CheckCircle } from "lucide-react";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { trackEvent } from "@/lib/trackEvent";

export default function VerifyInfo() {
  useEffect(() => {
    trackEvent("verify_info_viewed");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <LandingNav />

      {/* Hero */}
      <section className="pt-28 pb-16 px-6">
        <div className="max-w-3xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary text-xs font-semibold mb-6 uppercase tracking-wider">
            <Fingerprint className="w-3 h-3" />
            BankID-säkrad auktorisering
          </div>
          <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6">
            Verify — Eliminera<br />dubbelpresentationer
          </h1>
          <p className="text-lg text-muted-foreground max-w-xl mx-auto leading-relaxed mb-10">
            Verify är en digital källa till sanning. Du auktoriserar bemanningsföretag att representera dig — regionen ser beviset, inte duplicerade CV:n.
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 px-6 bg-card border-y border-border">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-8">
            Så fungerar Verify
          </h2>

          <div className="space-y-6">
            {[
              { step: "1", title: "Förfrågan skickas", desc: "Bemanningsföretaget initierar en verifieringsförfrågan för ett specifikt uppdrag." },
              { step: "2", title: "BankID-signering", desc: "Du får en länk via SMS, öppnar den och signerar med BankID. Hela processen tar under 30 sekunder." },
              { step: "3", title: "Bevis genereras", desc: "Ett kryptografiskt bevis skapas som kan delas med uppdragsgivaren. Beviset visar exakt vilken aktör du auktoriserat." },
            ].map((s) => (
              <div key={s.step} className="flex gap-4">
                <span className="w-8 h-8 rounded-full bg-primary/10 text-primary text-sm font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {s.step}
                </span>
                <div>
                  <h3 className="font-semibold text-foreground mb-1">{s.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-8">
            Fördelar
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {[
              { icon: ShieldCheck, title: "Skydd mot dubbelpresentationer", desc: "Regioner ser omedelbart vilka bemanningsföretag som är auktoriserade." },
              { icon: Fingerprint, title: "BankID-nivå", desc: "Signeringen är juridiskt bindande och kan inte förfalskas." },
              { icon: FileCheck, title: "Audit Trail", desc: "Varje steg loggas transparent — du har full insyn i vem som sett beviset." },
              { icon: CheckCircle, title: "Source of Truth", desc: "En enda källa till sanning istället för e-postkedjor och telefonsamtal." },
            ].map((b, i) => (
              <div key={i} className="bg-card border border-border rounded-2xl p-6">
                <b.icon className="w-5 h-5 text-primary mb-3" />
                <h3 className="font-semibold text-foreground mb-1 text-sm">{b.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 text-center">
        <div className="max-w-lg mx-auto">
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-4">
            Redo att ta kontroll?
          </h2>
          <p className="text-muted-foreground mb-8">
            Skapa ett konto för att börja samla referenser och aktivera Verify.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              to="/registrera"
              className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base no-underline"
            >
              Skapa konto
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              to="/referenser-info"
              className="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-secondary/80 text-foreground border border-border px-8 py-4 rounded-2xl font-semibold transition-all text-base no-underline"
            >
              Om Referenser
            </Link>
          </div>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
