import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, FileSearch, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import HeroRateLookup from "@/components/landing/HeroRateLookup";
import MissionSection from "@/components/landing/MissionSection";
import RotatingHeroWord from "@/components/landing/RotatingHeroWord";
import { trackEvent } from "@/lib/trackEvent";

const platformJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CompCare",
  url: "https://compcare.se",
  applicationCategory: "BusinessApplication",
  description: "Verifieringsinfrastruktur för vårdens konsulter — löneanalys, fakturakontroll och förhandlingsstöd baserat på SKR:s ramavtal.",
  operatingSystem: "All",
  offers: {
    "@type": "AggregateOffer",
    priceCurrency: "SEK",
    lowPrice: "0",
    offerCount: "3",
  },
  provider: {
    "@type": "Organization",
    name: "CompCare",
    url: "https://compcare.se",
  },
};

const PILLARS = [
  {
    question: "Tjänar jag rätt?",
    title: "Löneanalys",
    description: "Jämför din ersättning med SKR:s ramavtalspriser och SCB:s lönestatistik i realtid. 290 kommuner, alla specialiseringar.",
    icon: ShieldCheck,
    cta: "Analysera din lön",
    href: "/consultant/salary-check",
    dataService: "salary-analysis",
  },
  {
    question: "Fakturerar jag rätt?",
    title: "Fakturakontroll",
    description: "AI-assistenten granskar dina fakturor retroaktivt för att se om du missat att fakturera för redan arbetad tid. Finns det avvikelser hittar vi det.",
    icon: FileSearch,
    cta: "Granska fakturor",
    href: "/fakturakontroll",
    dataService: "invoice-audit",
  },
  {
    question: "Förhandlar jag rätt?",
    title: "Förhandlingsassistent",
    description: "Ställ frågor om marknadspriser, avtalsvillkor och förhandlingsstrategier. Löneassistenten ger dig bra underlag inför ditt nästa konsultuppdrag.",
    icon: MessageSquare,
    cta: "Starta förhandling",
    href: "/consultant/forhandla",
    dataService: "negotiation-agent",
  },
] as const;

const TRUST_POINTS = [
  "Baserat på SKR:s officiella ramavtal 2026",
  "Lönestatistik från Medlingsinstitutet",
  "290 kommuner, alla specialiseringar",
  
];

export default function Index() {
  useEffect(() => { trackEvent("b2b_landing_viewed"); }, []);

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(platformJsonLd) }} />

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border" role="navigation" aria-label="Huvudnavigation">
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

      {/* ── Hero ───────────────────────────────────────── */}
      <section className="hero-dark relative pt-16 pb-28 px-6" aria-labelledby="hero-heading">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 id="hero-heading" className="font-bold mb-6 tracking-tight" style={{ fontSize: "clamp(2.5rem, 7vw, 5.5rem)" }}>
            För vårdens konsulter
          </h1>

          <p className="text-hero-foreground/60 text-xl md:text-2xl max-w-2xl mx-auto mb-4 leading-relaxed">
            Marknadsinsikter och smarta tjänster för läkare och sjuksköterskor.
          </p>

          <p className="text-hero-foreground/60 text-base md:text-lg max-w-2xl mx-auto mb-2 leading-relaxed">
            Våra AI-assistenter har läst över 20&nbsp;000 avtal och avrop så att du ska slippa.
          </p>
          <div className="flex flex-wrap justify-center gap-x-6 gap-y-2 mb-10">
            {["Personlig rådgivare", "Tillgänglig dygnet runt", "Fråga vad du vill om branschen"].map((point) => (
              <span key={point} className="flex items-center gap-2 text-hero-foreground/60 text-sm md:text-base">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                {point}
              </span>
            ))}
          </div>

          <div className="mb-10">
            <HeroRateLookup />
          </div>

          <div className="flex flex-col items-center gap-4">
            <Link to="/consultant/forhandla">
              <Button size="sm" variant="outline" className="gap-2 bg-transparent border-hero-foreground/20 text-hero-foreground hover:bg-hero-foreground/10">
                <MessageSquare className="w-4 h-4" /> Fråga Löneassistenten
              </Button>
            </Link>
            <p className="max-w-md text-xs text-hero-foreground/60">
              Priset visar vad regionen betalar bemanningsföretaget. Vill du veta din andel? Fråga assistenten.
            </p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-[200px] bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Mission Section (tillfälligt borttagen) ────── */}
      {/* <MissionSection /> */}

      {/* ── Three Pillars ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-8 relative z-20 pb-20" aria-label="Tjänster">
        <div className="grid md:grid-cols-3 gap-6">
          {PILLARS.map((pillar) => (
            <article
              key={pillar.dataService}
              className="bg-card border border-border rounded-2xl p-6 md:p-8 shadow-lg hover:shadow-xl transition-shadow"
              data-service={pillar.dataService}
            >
              <pillar.icon className="w-8 h-8 text-primary mb-4" />
              <p className="text-sm font-semibold text-primary mb-1">{pillar.question}</p>
              <h2 className="text-xl font-bold text-foreground mb-3">{pillar.title}</h2>
              <p className="text-muted-foreground text-sm leading-relaxed mb-6">{pillar.description}</p>
              <Link to={pillar.href}>
                <Button variant="outline" size="sm" className="gap-2">
                  {pillar.cta} <ArrowRight className="w-3 h-3" />
                </Button>
              </Link>
            </article>
          ))}
        </div>
      </section>

      {/* ── Trust indicators ───────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-20" aria-label="Datakällor">
        <div className="bg-card border border-border rounded-2xl p-8 md:p-10">
          <h2 className="text-2xl font-bold text-foreground mb-6 text-center">Verifierad marknadsdata</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            {TRUST_POINTS.map((point) => (
              <div key={point} className="flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="text-sm text-muted-foreground">{point}</p>
              </div>
            ))}
          </div>
        </div>
      </section>


      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="border-t border-border py-10 px-6" role="contentinfo">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <CompcareLogo variant="full" />
          <div className="flex gap-6 text-sm text-muted-foreground">
            <Link to="/vanliga-fragor" className="hover:text-foreground transition-colors">FAQ</Link>
            <Link to="/integritetspolicy" className="hover:text-foreground transition-colors">Integritetspolicy</Link>
            <Link to="/verify-info" className="hover:text-foreground transition-colors">Verify</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CompCare</p>
        </div>
      </footer>
    </div>
  );
}
