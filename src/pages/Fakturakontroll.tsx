import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ShieldCheck, Moon, Clock, Calendar, CheckCircle, AlertTriangle, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import LandingNav from "@/components/landing/LandingNav";
import LandingFooter from "@/components/landing/LandingFooter";
import { trackEvent } from "@/lib/trackEvent";

const MISSED_ITEMS = [
  { icon: Moon, label: "OB-tillägg", desc: "Kväll, natt och helg — många saknar rätt OB i sina fakturor." },
  { icon: Clock, label: "Jour & beredskap", desc: "Beredskapsersättning och jourpass som inte fakturerats korrekt." },
  { icon: Calendar, label: "Helg & storhelg", desc: "Storhelgstillägg som jul, nyår och midsommar missas ofta." },
  { icon: ShieldCheck, label: "Avtalsenliga tillägg", desc: "Tillägg som regleras i ramavtalet men glöms bort vid fakturering." },
];

const STEPS = [
  { num: "1", title: "Skicka in dina fakturor", desc: "Ladda upp eller maila dina senaste fakturor till oss. Vi behöver inga personuppgifter om dina patienter." },
  { num: "2", title: "Vi granskar mot ramavtalet", desc: "Vårt team jämför varje rad mot gällande ramavtalspriser, OB-regler och tilläggsstrukturer." },
  { num: "3", title: "Du får en rapport", desc: "Inom 48 timmar får du en sammanställning med eventuella avvikelser och hur mycket du kan ha missat." },
];

export default function Fakturakontroll() {
  const navigate = useNavigate();

  useEffect(() => {
    trackEvent("fakturakontroll_page_viewed");
  }, []);

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <LandingNav />

      {/* Hero */}
      <section className="relative px-6 pt-16 pb-20 md:pt-24 md:pb-28 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: [
              "radial-gradient(ellipse 70% 55% at 15% 25%, hsl(245 58% 60% / 0.12) 0%, transparent 55%)",
              "radial-gradient(ellipse 55% 50% at 85% 20%, hsl(196 100% 50% / 0.08) 0%, transparent 50%)",
            ].join(", "),
          }}
        />
        <div className="relative z-10 max-w-3xl mx-auto text-center space-y-6">
          <div className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/20 rounded-full px-3.5 py-1.5 text-xs font-semibold text-primary tracking-wide">
            <ShieldCheck className="w-3.5 h-3.5" />
            Kostnadsfritt om inga fel hittas
          </div>
          <h1 className="font-display text-4xl md:text-5xl font-extrabold tracking-tight leading-[1.1]">
            Konsulter missar att fakturera i snitt{" "}
            <span className="text-primary">30 000 kr</span> per år
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
            OB-tillägg, jour, beredskap, helg och storhelg — det är lätt att missa.
            Vi granskar dina fakturor kostnadsfritt och ser till att du inte går miste om ersättning du har rätt till.
          </p>
          <Button
            size="lg"
            className="text-base px-8 py-6 font-bold"
            onClick={() => navigate("/")}
          >
            Granska min ersättning →
          </Button>
          <p className="text-xs text-muted-foreground">
            3 av 10 konsulter fakturerar fel varje månad
          </p>
        </div>
      </section>

      {/* What we find */}
      <section className="px-6 py-16 md:py-24 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center gap-2.5 mb-2">
            <AlertTriangle className="w-5 h-5 text-accent-foreground" />
            <span className="text-sm font-bold text-accent-foreground uppercase tracking-wider">Vanliga missar</span>
          </div>
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-10">
            Det här hittar vi oftast
          </h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {MISSED_ITEMS.map(({ icon: Icon, label, desc }) => (
              <div key={label} className="rounded-2xl border border-border bg-background p-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-display font-bold text-lg">{label}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight mb-10">
            Så fungerar det
          </h2>
          <div className="space-y-6">
            {STEPS.map((step) => (
              <div key={step.num} className="flex gap-5 items-start">
                <div className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-display font-bold text-lg shrink-0">
                  {step.num}
                </div>
                <div className="space-y-1 pt-1">
                  <h3 className="font-display font-bold text-lg">{step.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Stats / social proof */}
      <section className="px-6 py-16 md:py-20 bg-card border-y border-border">
        <div className="max-w-4xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 text-center">
            {[
              { value: "30 000 kr", label: "Genomsnittligt missad ersättning per år" },
              { value: "3/10", label: "Konsulter fakturerar fel varje månad" },
              { value: "48 h", label: "Tid till färdig granskning" },
            ].map((stat) => (
              <div key={stat.label} className="space-y-2">
                <div className="font-display text-3xl md:text-4xl font-extrabold text-primary">{stat.value}</div>
                <p className="text-xs md:text-sm text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing / trust */}
      <section className="px-6 py-16 md:py-24">
        <div className="max-w-3xl mx-auto text-center space-y-6">
          <TrendingUp className="w-8 h-8 text-primary mx-auto" />
          <h2 className="font-display text-3xl md:text-4xl font-bold tracking-tight">
            Kostnadsfritt om vi inte hittar fel
          </h2>
          <p className="text-muted-foreground text-lg leading-relaxed max-w-xl mx-auto">
            Du betalar ingenting om vi inte hittar avvikelser i dina fakturor.
            Hittar vi fel som leder till att du får mer betalt delar vi på mellanskillnaden — du tjänar alltid på det.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {["Ingen startkostnad", "Ingen bindningstid", "Du tjänar alltid på resultatet"].map((item) => (
              <div key={item} className="flex items-center gap-2 text-sm font-medium">
                <CheckCircle className="w-4 h-4 text-primary shrink-0" />
                <span>{item}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="px-6 py-16 md:py-20">
        <div className="max-w-2xl mx-auto rounded-3xl border border-primary/20 bg-primary/[0.04] p-8 md:p-12 text-center space-y-5">
          <ShieldCheck className="w-8 h-8 text-primary mx-auto" />
          <h2 className="font-display text-2xl md:text-3xl font-bold tracking-tight">
            Redo att se om du fakturerar rätt?
          </h2>
          <p className="text-muted-foreground text-sm leading-relaxed max-w-md mx-auto">
            Starta din kostnadsfria granskning idag. Vi kontaktar dig inom 48 timmar med resultatet.
          </p>
          <Button
            size="lg"
            className="text-base px-8 py-6 font-bold"
            onClick={() => navigate("/")}
          >
            Granska min ersättning →
          </Button>
        </div>
      </section>

      <LandingFooter />
    </div>
  );
}
