import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import Survey from "@/components/Survey";
import ServiceCards from "@/components/landing/ServiceCards";
import reportPreview from "@/assets/report-preview.jpeg";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";

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

export default function SalaryCheck() {
  const [showSurvey, setShowSurvey] = useState(false);
  const surveyRef = useRef<HTMLDivElement>(null);

  useTimeOnPage("landing");
  useEffect(() => { trackEvent("landing_viewed"); }, []);

  const handleStartSurvey = () => {
    setShowSurvey(true);
    setTimeout(() => {
      surveyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  };

  if (showSurvey) {
    return (
      <div className="bg-background">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />
        <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
          <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
            <Link to="/">
              <CompcareLogo variant="full" />
            </Link>
            <ThemeToggle />
          </div>
        </header>
        <div ref={surveyRef} className="px-4 pt-8 pb-16 min-h-[calc(100vh-3.5rem)] flex flex-col">
          <Survey
            onBack={() => setShowSurvey(false)}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

      {/* ── Header ─────────────────────────────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/">
            <CompcareLogo variant="full" />
          </Link>
          <ThemeToggle />
        </div>
      </header>

      {/* ── Dark Hero ──────────────────────────────────── */}
      <section className="hero-dark relative pt-12 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center relative z-10">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-primary/10 border border-primary/20 px-3 py-1 rounded-full text-primary text-xs font-semibold mb-6 uppercase tracking-wider">
            <ShieldCheck className="w-3 h-3" />
            100% Verifierad Marknadsdata
          </div>

          <h1 className="font-bold mb-8 tracking-tight" style={{ fontSize: "clamp(2.75rem, 7.5vw, 5.5rem)" }}>
            För vårdens konsulter
          </h1>

          <p className="text-hero-foreground/60 text-xl md:text-2xl max-w-2xl mx-auto mb-2 leading-relaxed">
            Marknadsinsikter och smarta tjänster för läkare och sjuksköterskor
          </p>
          <p className="text-hero-foreground/60 text-sm md:text-base max-w-2xl mx-auto leading-relaxed">
            {"\n"}
          </p>
          <div className="h-4 md:h-6" />

          {/* Role selection CTA */}
          <p className="text-hero-foreground/50 text-xs mb-3 tracking-wide">{"\n\n"}Kostnadsfritt och klart på 30 sekunder</p>
          <div className="max-w-md mx-auto">
            <button
              onClick={handleStartSurvey}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
            >
              Se din optimala ersättning
            </button>
          </div>
        </div>

        {/* Gradient fade to light */}
        <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Negotiation Hero ────────────────────────────── */}
      <section className="bg-[#0B0E14] text-white py-16 px-6 md:px-12 lg:px-24 -mt-16 relative z-20">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="flex flex-col space-y-8">
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              Din nästa löneförhandling <br className="hidden md:block" /> börjar här.
            </h2>
            <p className="text-[#A0AEC0] text-lg md:text-xl leading-relaxed max-w-xl">
              Gå inte in i nästa samtal med en magkänsla – gå in med data. Vi har kartlagt de faktiska ramavtalspriserna för alla Sveriges regioner och zoner. Genom att matcha din nuvarande lön mot marknadens realitet ser du direkt om du ligger rätt eller om du lämnar pengar på bordet.
            </p>
            <ul className="space-y-5">
              <li className="flex items-start gap-4">
                <div className="mt-1 bg-indigo-500/20 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /></svg>
                </div>
                <p className="text-base md:text-lg"><span className="font-bold">Regional jämförelse:</span> Se hur ersättningen skiljer sig mellan Zon 1, 2 och 3.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-1 bg-indigo-500/20 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                </div>
                <p className="text-base md:text-lg"><span className="font-bold">Avslöja marginalerna:</span> Se vad regionen faktiskt betalar bemanningsbolaget.</p>
              </li>
              <li className="flex items-start gap-4">
                <div className="mt-1 bg-indigo-500/20 p-2 rounded-lg">
                  <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </div>
                <p className="text-base md:text-lg"><span className="font-bold">Smart assistent:</span> Få konkreta råd baserat på 100% verifierad marknadsdata.</p>
              </li>
            </ul>
            <div className="pt-4">
              <p className="text-sm text-[#A0AEC0] mb-4">Helt anonymt. Klart på 30 sekunder.</p>
              <button
                onClick={handleStartSurvey}
                className="bg-[#4F46E5] hover:bg-[#4338CA] text-white px-8 py-4 rounded-xl text-lg font-bold transition-all transform hover:scale-105 shadow-[0_0_20px_rgba(79,70,229,0.4)]"
              >
                Se din optimala ersättning
              </button>
            </div>
          </div>
          <div className="relative flex justify-center items-center">
            <div className="absolute w-[80%] h-[80%] bg-indigo-600/20 blur-[100px] rounded-full" />
            <img
              src={handPhoneImg}
              alt="Rapport i mobilen"
              className="relative z-10 w-full max-w-[500px] h-auto drop-shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* ── Service Cards (horizontal scroll) ──────── */}
      <ServiceCards onStartAnalysis={handleStartSurvey} />

      {/* ── Features section ───────────────────────────── */}
      <section className="max-w-6xl mx-auto px-6 pt-16 pb-12">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-bold mb-6 tracking-tight text-foreground">
              AI-assistent som optimerar din förhandling
            </h2>
            <p className="text-muted-foreground mb-4 leading-relaxed text-lg">
              21 regioners ramavtalspriser. SCB:s lönestatistik. Bemanningsbranschens marginaler. Vi sammanställer — du ser exakt var du ligger i spannet.
            </p>
            <p className="text-muted-foreground mb-4 leading-relaxed text-base italic">
              "Vad betalar Region Skåne för en infektionssjuksköterska? Hur skiljer sig Zon 1 mot Zon 3? Hur mycket har priserna ändrats sedan förra avtalsperioden?"
            </p>
            <p className="text-foreground font-medium text-base">
              Ställ frågan till Löneassistenten — din AI-agent med tillgång till all avtalsdatan.
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
            OB-tillägg, jour, beredskap, helg och storhelg — det är lätt att räkna fel. Låt Ai-assistenten granska dina fakturor kostnadsfritt. Provision utgår endast om vi hittar timmar som du kan ta betalt för.
          </p>
          <Link
            to="/consultant/fakturakontroll"
            className="inline-block bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base no-underline"
          >
            Säkerställ mina fakturor
          </Link>
        </div>
      </section>

      {/* ── Bottom CTA ─────────────────────────────────── */}
      <section className="max-w-4xl mx-auto px-6 pb-24 text-center">
        <h2 className="text-3xl font-bold tracking-tight text-foreground mb-4">
          Ta kontroll över din marknadsposition
        </h2>
        <p className="text-muted-foreground mb-8 text-lg">Se din ersättning i förhållande till marknadspris · 30 sekunder</p>
        <div className="flex justify-center">
          <button
            onClick={handleStartSurvey}
            className="bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
          >
            Se din optimala ersättning
          </button>
        </div>
      </section>
    </div>
  );
}
