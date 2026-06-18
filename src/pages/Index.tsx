import { useEffect } from "react";
import { safeJsonLd } from "@/lib/safeJsonLd";
import { Link } from "react-router-dom";
import { ShieldCheck, FileSearch, MessageSquare, ArrowRight, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";
import MissionSection from "@/components/landing/MissionSection";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";

const platformJsonLd = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "CompCare",
  url: "https://compcare.se",
  applicationCategory: "BusinessApplication",
  description: "Verifieringsinfrastruktur för vårdens konsulter — löneanalys, faktureringsstöd och förhandlingsstöd baserat på SKR:s ramavtal.",
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
    title: "Ersättningsanalys",
    description: "Jämför din ersättning med SKR:s ramavtalspriser i realtid. 290 kommuner, alla specialiseringar — för konsulter och de som vill bli det.",
    icon: ShieldCheck,
    cta: "Analysera din lön",
    href: "/consultant/salary-check",
    dataService: "salary-analysis",
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
  "Branschens marginalmodell (85–90 %)",
  "290 kommuner, alla specialiseringar",

];

export default function Index() {
  useTimeOnPage("landing");
  useEffect(() => {
    trackEvent("landing_viewed");
    trackEvent("b2b_landing_viewed");
  }, []);

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: safeJsonLd(platformJsonLd) }} />

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
      <section className="hero-dark relative pt-12 pb-20 px-6" aria-labelledby="hero-heading">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          <h1 id="hero-heading" className="font-bold mb-5 tracking-tight text-5xl leading-[1.1]">
            Förhandla utifrån data,<br />inte magkänsla
          </h1>

          <p className="text-hero-foreground/70 text-lg md:text-xl max-w-2xl mx-auto mb-8 leading-relaxed whitespace-pre-line">
            Vi visar aktuella ersättningsnivåer för läkare och sjuksköterskor på bemanningsuppdrag. Sök efter din roll och region för att se svaret direkt.{"\n"}
            Baserat på SKR:s ramavtal för 2026 och AI-analyser av bemanningsbranschens marginaler.
          </p>

          <InlineTerminalSurvey />
        </div>
        <div className="absolute bottom-0 left-1 right-1 h-[200px] bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Mission Section (tillfälligt borttagen) ────── */}
      {/* <MissionSection /> */}

      {/* ── Three Pillars ──────────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-4 relative z-20 pb-12" aria-label="Tjänster">
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

        <div className="mt-10 flex flex-col items-center text-center gap-3">
          <p className="text-sm text-muted-foreground max-w-md">
            Skapa ett konto för att spara analyser, följa marknadspriser över tid och få tillgång till förhandlingsassistenten.
          </p>
          <Link to="/registrera">
            <Button
              size="sm"
              className="gap-2"
              data-cta="register_section_2"
              onClick={() =>
                trackEvent("product_cta_clicked", {
                  cta: "register_section_2",
                  section: "forhandlingsanalys",
                  location: "landing_pillars",
                })
              }
            >
              Registrera dig kostnadsfritt <ArrowRight className="w-3 h-3" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Trust indicators ───────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-12" aria-label="Datakällor">
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
            <Link to="/din-data" className="hover:text-foreground transition-colors">Din data</Link>
            <Link to="/referenser-info" className="hover:text-foreground transition-colors">Ref ID</Link>
          </div>
          <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CompCare</p>
        </div>
      </footer>
    </div>
  );
}
