import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import Survey from "@/components/Survey";
import ServiceCards from "@/components/landing/ServiceCards";
import RefSection from "@/components/landing/RefSection";
import InvoiceSection from "@/components/landing/InvoiceSection";
import handPhoneImage from "@/assets/hand-phone.png";
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
            <div className="flex items-center gap-3">
              <Link to="/logga-in" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Logga in
              </Link>
              <ThemeToggle />
            </div>
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
    <div className="bg-background overflow-x-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

      {/* ── Header ─────────────────────────────────── */}
      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/">
            <CompcareLogo variant="full" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/logga-in" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              Logga in
            </Link>
            <ThemeToggle />
          </div>
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

          <h1 className="font-bold mb-8 tracking-tight leading-[1.05] md:leading-tight" style={{ fontSize: "clamp(2.75rem, 7.5vw, 5.5rem)" }}>
            För vårdens konsulter
          </h1>

          <p className="text-hero-foreground/60 text-xl md:text-2xl max-w-3xl mx-auto mb-10 leading-relaxed whitespace-pre-line">
            Ny rapport för 2026 är här nu. Vår tredje rapport visar faktiska marknadsvillkor för din specifika kompetens i 290 kommuner och 21 regioner.{"\n\n"}
            Bättre beslutsunderlag och smarta verktyg som förenklar livet som konsult. Allt baserat på offentliga avtal från SKR.
          </p>

          {/* Role selection CTA */}
          
          <div className="max-w-md mx-auto">
            <button
              onClick={handleStartSurvey}
              className="w-full bg-primary hover:bg-primary/90 text-primary-foreground px-6 py-4 rounded-2xl font-semibold transition-all shadow-lg shadow-primary/20 text-base"
            >
              Läs rapporten nu
            </button>
          </div>
        </div>

        {/* Gradient fade to light */}
        <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Section 2: Löneförhandling ── */}
      <section className="relative overflow-hidden bg-secondary/50">

        <div className="relative mx-auto max-w-6xl px-6 py-14 md:px-10 lg:px-12 lg:py-20">
          <div className="grid items-center gap-8 md:grid-cols-[1fr_0.9fr] lg:gap-10">

            {/* ── Text column ── */}
            <div className="flex flex-col">
              {/* Badge */}
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[13px] font-medium text-primary backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.5)]" />
                För sjuksköterskor och läkare i bemanning
              </div>

              {/* Heading */}
              <h2 className="text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[3.5rem]">
                Din nästa löneförhandling börjar här.
              </h2>

              {/* Body */}
              <p className="mt-4 max-w-lg text-[15px] leading-[1.7] text-muted-foreground sm:text-base lg:text-[17px]">
                Gå inte in i nästa samtal med en magkänsla – gå in med data. Vi har kartlagt de faktiska avtalspriserna för 21 regioner och 290 kommuner. Genom att jämföra din nuvarande ersättning mot marknadens realitet ser du direkt om du ligger rätt eller om du har förhandlingsutrymme.
              </p>

              {/* Bullet cards */}
              <div className="mt-6 space-y-2">
                {[
                  { title: "Transparens:", text: "Se rätt avtalsinnehåll och lönenivå fön din roll" },
                  { title: "Regional jämförelse:", text: "Se hur ersättningen skiljer sig mellan orter" },
                  { title: "Smart assistent:", text: "Få konkreta råd baserat på 100% verifierad marknadsdata." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-lg border border-border bg-card/60 px-3.5 py-2.5">
                    <div className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-primary/20 bg-primary/5 text-[10px] text-primary">
                      ✦
                    </div>
                    <p className="text-[13px] leading-[1.6] text-muted-foreground sm:text-sm">
                      <span className="font-medium text-foreground">{item.title}</span> {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Trust line + CTA */}
              <div className="mt-5">
                <p className="text-sm text-muted-foreground lg:text-[15px]">Informationen hämtas från offentliga avtal och branschens genomsnittsmarginaler.</p>
                <div className="mt-3">
                  <button
                    onClick={handleStartSurvey}
                    className="inline-flex min-h-[50px] items-center justify-center rounded-xl bg-primary hover:bg-primary/90 px-7 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition duration-200 hover:-translate-y-0.5"
                  >
                    Se uppdaterade villkor för hundratals orter och roller
                  </button>
                </div>
              </div>
            </div>

            {/* ── Image column ── */}
            <div className="relative hidden md:flex items-center justify-center self-stretch -ml-4 lg:-ml-8">
              <div className="absolute inset-[-5%] rounded-full bg-[radial-gradient(ellipse_60%_55%_at_48%_50%,hsl(var(--primary)/0.08),transparent_80%)] blur-lg" />
              <img
                src={handPhoneImage}
                alt="Person som håller mobil med CompCare-gränssnitt"
                className="relative z-10 w-full max-w-[560px] h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.15)]"
                style={{
                  transform: "translateX(-15%)",
                  maskImage: "radial-gradient(ellipse 90% 92% at 50% 48%, black 60%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 90% 92% at 50% 48%, black 60%, transparent 100%)",
                }}
              />
            </div>

          </div>

          {/* Mobile image */}
          <div className="relative mt-10 flex justify-center md:hidden">
            <div className="absolute inset-[-12%] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.06),transparent_65%)] blur-lg" />
            <img
              src={handPhoneImage}
              alt="Person som håller mobil med CompCare-gränssnitt"
              className="relative z-10 w-3/4 max-w-[320px] h-auto object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.12)]"
              style={{
                maskImage: "radial-gradient(ellipse 85% 88% at 50% 48%, black 55%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 85% 88% at 50% 48%, black 55%, transparent 100%)",
              }}
            />
          </div>
        </div>
      </section>

      {/* Sections below temporarily hidden */}
    </div>
  );
}
