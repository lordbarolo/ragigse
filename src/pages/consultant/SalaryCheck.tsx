import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import Survey from "@/components/Survey";
import ServiceCards from "@/components/landing/ServiceCards";
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
              Få samma data som bemanningsföretagen
            </button>
          </div>
        </div>

        {/* Gradient fade to light */}
        <div className="absolute bottom-0 left-0 right-0 h-[300px] bg-gradient-to-t from-background to-transparent" />
      </section>

      {/* ── Section 2: Löneförhandling (dark premium) ── */}
      <section className="relative overflow-hidden bg-[#050816] text-white">
        {/* Ambient gradient orbs */}
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_30%,rgba(116,137,255,0.18),transparent_32%),radial-gradient(circle_at_65%_50%,rgba(177,129,255,0.14),transparent_28%),radial-gradient(circle_at_80%_75%,rgba(92,112,255,0.10),transparent_24%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(135deg,#030712_0%,#081124_45%,#050816_100%)] opacity-95" />
        {/* Subtle grid */}
        <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(rgba(255,255,255,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.08)_1px,transparent_1px)] [background-size:72px_72px]" />

        <div className="relative mx-auto max-w-6xl px-6 py-16 md:px-10 lg:px-12 lg:py-20">
          <div className="grid items-center gap-10 md:grid-cols-[1fr_0.85fr] lg:gap-16">

            {/* ── Text column ── */}
            <div className="flex flex-col">
              {/* Badge */}
              <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-3.5 py-1.5 text-[13px] font-medium text-white/70 backdrop-blur-xl">
                <span className="h-1.5 w-1.5 rounded-full bg-[#8DA2FF] shadow-[0_0_14px_rgba(141,162,255,0.8)]" />
                För sjuksköterskor och läkare i bemanning
              </div>

              {/* Heading */}
              <h2 className="text-[2.25rem] font-semibold leading-[1.05] tracking-[-0.035em] text-white sm:text-5xl lg:text-[3.5rem]">
                Din nästa löneförhandling börjar här.
              </h2>

              {/* Body */}
              <p className="mt-5 max-w-xl text-[15px] leading-[1.75] text-white/60 sm:text-base lg:text-[17px]">
                Gå inte in i nästa samtal med en magkänsla – gå in med data. Vi har kartlagt de faktiska avtalspriserna för 21 regioner och 290 kommuner. Genom att jämföra din nuvarande ersättning mot marknadens realitet ser du direkt om du ligger rätt eller om du lämnar pengar på bordet.
              </p>

              {/* Bullet cards */}
              <div className="mt-7 space-y-2.5">
                {[
                  { title: "Regional jämförelse:", text: "Se hur ersättningen skiljer sig mellan Zon 1, 2 och 3." },
                  { title: "Se marginalerna:", text: "Se vad regionen faktiskt betalar för din kompetens." },
                  { title: "Smart assistent:", text: "Få konkreta råd baserat på 100% verifierad marknadsdata." },
                ].map((item) => (
                  <div key={item.title} className="flex items-start gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3 backdrop-blur-sm">
                    <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[#93A5FF]/15 bg-[#93A5FF]/[0.08] text-xs text-[#B8C5FF]">
                      ✦
                    </div>
                    <p className="text-[13px] leading-[1.65] text-white/55 sm:text-sm">
                      <span className="font-medium text-white/90">{item.title}</span> {item.text}
                    </p>
                  </div>
                ))}
              </div>

              {/* Trust line + CTA */}
              <div className="mt-6">
                <p className="text-sm text-white/50 lg:text-[15px]">Helt anonymt. Klart på 30 sekunder.</p>
                <div className="mt-4">
                  <button
                    onClick={handleStartSurvey}
                    className="inline-flex min-h-[52px] items-center justify-center rounded-xl bg-[linear-gradient(135deg,#5C7CFF_0%,#7FA4FF_100%)] px-7 text-[15px] font-semibold text-white shadow-[0_14px_40px_rgba(92,124,255,0.30)] transition duration-200 hover:-translate-y-0.5"
                  >
                    Jämför din ersättning
                  </button>
                </div>
              </div>
            </div>

            {/* ── Image column ── */}
            <div className="relative hidden md:flex items-center justify-center self-stretch">
              {/* Glow behind image */}
              <div className="absolute inset-[-10%] rounded-full bg-[radial-gradient(ellipse_70%_60%_at_50%_50%,rgba(141,162,255,0.15),rgba(120,100,255,0.06)_50%,transparent_80%)] blur-xl" />
              {/* Subtle inner glow */}
              <div className="absolute inset-[5%] rounded-3xl bg-[radial-gradient(circle_at_50%_45%,rgba(177,140,255,0.12),transparent_65%)] blur-2xl" />
              <img
                src={handPhoneImage}
                alt="Person som håller mobil med CompCare-gränssnitt"
                className="relative z-10 w-full max-w-[480px] h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.45)]"
                style={{
                  maskImage: "radial-gradient(ellipse 88% 90% at 50% 48%, black 58%, transparent 100%)",
                  WebkitMaskImage: "radial-gradient(ellipse 88% 90% at 50% 48%, black 58%, transparent 100%)",
                }}
              />
            </div>

          </div>

          {/* Mobile image */}
          <div className="relative mt-10 flex justify-center md:hidden">
            <div className="absolute inset-[-15%] rounded-full bg-[radial-gradient(circle,rgba(141,162,255,0.12),transparent_70%)] blur-xl" />
            <img
              src={handPhoneImage}
              alt="Person som håller mobil med CompCare-gränssnitt"
              className="relative z-10 w-3/4 max-w-[320px] h-auto object-contain drop-shadow-[0_16px_40px_rgba(0,0,0,0.4)]"
              style={{
                maskImage: "radial-gradient(ellipse 85% 88% at 50% 48%, black 55%, transparent 100%)",
                WebkitMaskImage: "radial-gradient(ellipse 85% 88% at 50% 48%, black 55%, transparent 100%)",
              }}
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
            Få samma data som bemanningsföretagen
          </button>
        </div>
      </section>
    </div>
  );
}
