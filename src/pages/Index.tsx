import { useEffect, useState, useRef } from "react";
import { ShieldCheck, Search, Check } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import Survey from "@/components/Survey";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Hur fungerar CompCare.se?", acceptedAnswer: { "@type": "Answer", text: "Du fyller i din yrkesroll, arbetsort och erfarenhet. Vi jämför din nuvarande eller erbjudna konsultersättning med faktiska ramavtalspriser som offentliga vårdgivare betalar till bemanningsföretag för inhyrd personal." } },
    { "@type": "Question", name: "Vilka data baseras analysen på?", acceptedAnswer: { "@type": "Answer", text: "Analysen baseras på Regionernas officiella ramavtalspriser för 2026 och bemanningsbranschens standardmarginaler." } },
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
          <div className="flex items-center gap-2 font-bold text-xl tracking-tight">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-primary-foreground italic text-sm font-extrabold">C</div>
            <span className="text-foreground">compcare</span>
          </div>
        </div>
      </nav>

      {/* ── Dark Hero ──────────────────────────────────── */}
      <section className="hero-dark relative pt-24 pb-40 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary text-xs font-semibold mb-6 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            100% Verifierad Marknadsdata
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-8 tracking-tight">
            Ta kontroll över ditt{" "}
            <br className="hidden sm:block" />
            <span className="text-primary">marknadsvärde.</span>
          </h1>

          <p className="text-muted-foreground text-lg md:text-xl max-w-2xl mx-auto mb-12 leading-relaxed" style={{ color: "hsl(215 20% 65%)" }}>
            Vi hjälper sjukvårdspersonal till bättre beslutsunderlag, genom ramavtalspriser och lönestatistik.
          </p>

          {/* Role selection CTA */}
          <div className="max-w-md mx-auto flex flex-col sm:flex-row gap-3">
            <button
              onClick={() => handleRoleSelect("lakare")}
              className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
            >
              🩺 Jag är Läkare
            </button>
            <button
              onClick={() => handleRoleSelect("ssk")}
              className="flex-1 bg-card/10 hover:bg-card/20 border border-border/30 text-white px-6 py-4 rounded-2xl font-semibold transition-all text-base"
            >
              💉 Sjuksköterska / Barnmorska
            </button>
          </div>
        </div>

        {/* Gradient fade to light */}
        <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Stats bar (overlapping) ────────────────────── */}
      <section className="max-w-5xl mx-auto px-6 -mt-16 relative z-20">
        <div className="bg-card border border-border rounded-3xl p-8 shadow-xl grid md:grid-cols-3 gap-8 divide-y md:divide-y-0 md:divide-x divide-border">
          <div className="text-center md:pt-0 pt-4">
            <p className="text-3xl font-bold text-foreground">290+</p>
            <p className="text-sm text-muted-foreground">Svenska kommuner</p>
          </div>
          <div className="text-center pt-8 md:pt-0">
            <p className="text-3xl font-bold text-foreground">SKR 2026</p>
            <p className="text-sm text-muted-foreground">Senaste ramavtalsdatan</p>
          </div>
          <div className="text-center pt-8 md:pt-0">
            <p className="text-3xl font-bold text-foreground">100%</p>
            <p className="text-sm text-muted-foreground">Oberoende analys</p>
          </div>
        </div>
      </section>

      {/* ── Features section ───────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 py-32">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 tracking-tight text-foreground">
              Data som faktiskt gör skillnad vid lönesamtalet.
            </h2>
            <p className="text-muted-foreground mb-8 leading-relaxed text-lg">
              Vi hämtar data direkt från officiella källor och bryter ner dem så att du kan se exakt vad bemanningsbolaget får betalt och vad som borde landa i din plånbok.
            </p>
            <ul className="space-y-4">
              {["Transparens i alla led", "Inga dolda avgifter eller gissningar"].map((item) => (
                <li key={item} className="flex items-center gap-3 text-foreground font-medium">
                  <div className="w-6 h-6 bg-success/10 text-success rounded-full flex items-center justify-center">
                    <Check className="w-3 h-3" />
                  </div>
                  {item}
                </li>
              ))}
            </ul>
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

      {/* ── Bottom CTA ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          Redo att se ditt marknadsvärde?
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">Tar 60 sekunder · Ingen registrering krävs</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <button
            onClick={() => handleRoleSelect("lakare")}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
          >
            Starta analys — Läkare
          </button>
          <button
            onClick={() => handleRoleSelect("ssk")}
            className="bg-card hover:bg-secondary border border-border text-foreground px-8 py-4 rounded-2xl font-semibold transition-all text-base"
          >
            Starta analys — Sjuksköterska
          </button>
        </div>
      </section>
    </div>
  );
}
