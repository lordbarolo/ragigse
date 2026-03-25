import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck, Search, Check } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import Survey from "@/components/Survey";
import ServiceCards from "@/components/landing/ServiceCards";
import reportPreview from "@/assets/report-preview.jpeg";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Hur fungerar CompCare.se?", acceptedAnswer: { "@type": "Answer", text: "Du fyller i din yrkesroll, arbetsort och erfarenhet. Vi jämför din ersättning med ramavtalspriser från SKR och lönestatistik från SCB/Medlingsinstitutet — samma data som regioner och bemanningsföretag använder." } },
    { "@type": "Question", name: "Vilka data baseras analysen på?", acceptedAnswer: { "@type": "Answer", text: "Analysen baseras på SKR:s officiella ramavtalspriser för 2026, lönestatistik från Medlingsinstitutet 2024, och bemanningsbranschens standardmarginaler." } },
    { "@type": "Question", name: "Kostar det något att använda CompCare?", acceptedAnswer: { "@type": "Answer", text: "Den grundläggande jämförelsen av din konsultersättning är helt gratis. För en detaljerad rapport med förhandlingstips kan du välja att uppgradera." } },
    { "@type": "Question", name: "Vilka yrkesgrupper stöds?", acceptedAnswer: { "@type": "Answer", text: "Just nu fokuserar vi på konsulterande sjuksköterskor, barnmorskor och läkare. Samtliga specialiseringar har unik data." } },
  ],
};

const webAppJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "CompCare.se",
  url: "https://compcare.se",
  description: "Jämför din konsultersättning med faktiska ramavtalspriser för vårdkonsulter i 290 kommuner.",
  applicationCategory: "FinanceApplication",
  operatingSystem: "All",
  offers: { "@type": "Offer", price: "0", priceCurrency: "SEK", description: "Gratis jämförelse av konsultersättning" },
};

export default function Index() {
  const [showSurvey, setShowSurvey] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState<string>("");
  const [prefillRole, setPrefillRole] = useState<string>("");
  const surveyRef = useRef<HTMLDivElement>(null);

  useTimeOnPage("landing");
  useEffect(() => { trackEvent("landing_viewed"); }, []);

  const handleRoleSelect = (category: "lakare" | "ssk") => {
    setPrefillCategory(category);
    setPrefillRole("");
    setShowSurvey(true);
    setTimeout(() => {
      surveyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (showSurvey) {
    return (
      <div className="min-h-screen bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
        <div ref={surveyRef} className="px-4 pt-8 pb-16 min-h-screen flex flex-col">
          <Survey
            initialCategory={prefillCategory as "lakare" | "ssk" | ""}
            initialRole={prefillRole}
            onBack={() => setShowSurvey(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

      {/* ── Nav ────────────────────────────────────────── */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/"><CompcareLogo variant="full" /></Link>
          <ThemeToggle />
        </div>
      </nav>

      {/* ── Dark Hero ──────────────────────────────────── */}
      <section className="hero-dark relative pt-24 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary text-xs font-semibold mb-6 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            100% Verifierad Marknadsdata
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            Vad betalar kunden för din kompetens egentligen?
          </h1>

          <p className="text-hero-foreground/60 text-lg md:text-xl max-w-2xl mx-auto mb-2 leading-relaxed">
            CompCare ger dig marknadsdata, prognos och förhandlingsstöd — regionens offentliga data tillgänglig för konsulten
          </p>
          <p className="text-hero-foreground/60 text-sm md:text-base max-w-2xl mx-auto mb-12">
            Kostnadsfritt och klart på 30 sekunder
          </p>

          {/* Role selection CTA */}
          <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleRoleSelect("lakare")}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
            >
              Jag är Läkare
            </button>
            <button
              onClick={() => handleRoleSelect("ssk")}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
            >
              Sjuksköterska / Barnmorska
            </button>
          </div>
        </div>

        {/* Gradient fade to light */}
        <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── iPhone Preview ────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 -mt-16 relative z-20 flex flex-col items-center">
        <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground mb-4">Rapportexempel för infektionssjuksköterska</p>
        {/* iPhone frame */}
        <div className="relative mx-auto" style={{ maxWidth: 320 }}>
          {/* Outer shell */}
          <div className="bg-foreground/10 rounded-[3rem] p-[10px] shadow-2xl">
            {/* Inner bezel */}
            <div className="bg-card rounded-[2.4rem] overflow-hidden relative">
              {/* Notch */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[120px] h-[28px] bg-foreground/10 rounded-b-2xl z-10" />
              {/* Screen */}
              <img
                src={reportPreview}
                alt="Förhandsgranskning av din ersättningsanalys"
                className="w-full h-auto"
              />
            </div>
          </div>
        </div>

        {/* CTA */}
        <button
          onClick={() => handleRoleSelect("ssk")}
          className="mt-8 bg-primary hover:bg-primary/90 text-primary-foreground px-10 py-4 rounded-2xl font-semibold text-base transition-all shadow-lg shadow-primary/20"
        >
          Se ersättning för din roll
        </button>
      </section>

      {/* ── Service Cards (horizontal scroll) ──────── */}
      <ServiceCards onStartAnalysis={() => handleRoleSelect("ssk")} />

      {/* ── Features section ───────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 tracking-tight text-foreground">
              Samma data som regionen har. Nu även din.
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed text-lg">
              21 regioners ramavtalspriser. SCB:s lönestatistik. Bemanningsbranschens marginaler. Vi sammanställer — du ser exakt var du ligger i spannet.
            </p>
            <p className="text-muted-foreground mb-4 leading-relaxed text-base italic">
              "Vad betalar Region Skåne för en infektionssjuksköterska? Hur skiljer sig Zon 1 mot Zon 3? Hur mycket har priserna ändrats sedan förra avtalsperioden?"
            </p>
            <p className="text-foreground font-medium text-base">
              Ställ frågan till Reidar — din AI-agent med tillgång till all avtalsdatan.
            </p>
          </div>

          {/* Preview card */}
          <div className="bg-card p-4 rounded-3xl shadow-2xl border border-border rotate-2">
            <div className="bg-secondary rounded-2xl p-8 border border-border">
              <div className="flex justify-between items-end mb-6">
                <div>
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">Marknadspris</p>
                  <p className="text-4xl font-bold text-primary">616 kr/h</p>
                </div>
                <div className="text-right">
                  <p className="text-xs font-medium text-success bg-success/10 px-2 py-1 rounded-md">+12% vs 2025</p>
                </div>
              </div>
              <div className="space-y-3">
                <div className="h-2 w-full bg-border rounded-full overflow-hidden">
                  <div className="h-full bg-primary w-3/4 rounded-full" />
                </div>
                <p className="text-xs text-muted-foreground italic">Källa: SKR Ramavtal 2026, Zon 1</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Invoice Review ────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-20">
        <div className="bg-card border border-border rounded-3xl p-8 md:p-10 shadow-xl">
          <div className="flex items-start gap-3 mb-5">
            <ShieldCheck className="w-6 h-6 text-primary shrink-0 mt-0.5" />
            <p className="font-bold text-foreground text-lg md:text-xl leading-snug">
              Konsulter missar att fakturera i snitt 30 000 kr per år. 3 av 10 fakturerar dessutom fel varje månad.
            </p>
          </div>
          <p className="text-muted-foreground mb-6 text-base">
            OB-tillägg, jour, beredskap, helg och storhelg — det är lätt att missa. Vi granskar dina fakturor kostnadsfritt och ser till att du inte går miste om ersättning du har rätt till.
          </p>
          <button
            onClick={() => handleRoleSelect("ssk")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
          >
            Granska min ersättning →
          </button>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          Ta kontroll över din marknadsposition
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">Se din ersättning i förhållande till marknadspris · 60 sekunder · Ingen registrering</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => handleRoleSelect("lakare")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
          >
            Starta analys — Läkare
          </button>
          <button
            onClick={() => handleRoleSelect("ssk")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
          >
            Starta analys — Sjuksköterska
          </button>
        </div>
      </section>
    </div>
  );
}
