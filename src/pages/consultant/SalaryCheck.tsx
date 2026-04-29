import { useEffect, useState, useRef } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FileText, Globe, Lock, ShieldCheck } from "lucide-react";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import Survey from "@/components/Survey";
import handPhoneImage from "@/assets/hand-phone.png";
import CompcareLogo from "@/components/CompcareLogo";

import MissionSection from "@/components/landing/MissionSection";
import Steps from "@/components/landing/Steps";
import HeroRateLookup from "@/components/landing/HeroRateLookup";
import { SPECIALITY_BY_SLUG } from "@/lib/specialitySlugs";

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "Hur fungerar CompCare.se?", acceptedAnswer: { "@type": "Answer", text: "Du fyller i din yrkesroll, arbetsort och erfarenhet. Vi jämför din ersättning med ramavtalspriser från SKR och bemanningsbranschens standardmarginaler — samma data som regioner och bemanningsföretag använder." } },
    { "@type": "Question", name: "Vilka data baseras analysen på?", acceptedAnswer: { "@type": "Answer", text: "Analysen baseras enbart på SKR:s officiella ramavtalspriser för 2026 och bemanningsbranschens standardmarginaler. Vi använder ingen offentlig lönestatistik eftersom syftet är att visa vad du kan tjäna i ett konsultuppdrag." } },
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

// Legacy alias retained for backwards compat with existing campaign URLs.
const PREFILL_LEGACY: Record<string, { category: "ssk" | "lakare"; role: string }> = {
  anestesi: { category: "ssk", role: "Anestesisjukvård" },
};

const resolvePrefill = (key: string): { category: "ssk" | "lakare"; role: string } | undefined => {
  if (!key) return undefined;
  if (PREFILL_LEGACY[key]) return PREFILL_LEGACY[key];
  const opt = SPECIALITY_BY_SLUG[key];
  if (!opt) return undefined;
  // Survey resolves the role label internally; we hand it the dropdown value
  // by category. For doctor specialties the dropdown value equals the bare
  // specialty (e.g. "Akutsjukvård"); for generic roles we pass the marker.
  if (opt.category === "lakare") {
    if (opt.resolvedRole === "Legitimerad läkare") return { category: "lakare", role: "__leg" };
    if (opt.resolvedRole === "ST-läkare") return { category: "lakare", role: "__st" };
    // Strip "Specialistläkare " prefix to get the dropdown value
    const bare = opt.resolvedRole.replace(/^Specialistläkare\s+/, "");
    // Survey expects the original cased specialty string (matches TOP_DOCTOR_SPECIALTIES)
    return { category: "lakare", role: bare.charAt(0).toUpperCase() + bare.slice(1) };
  }
  // Nurse mapping
  if (opt.resolvedRole === "Sjuksköterska") return { category: "ssk", role: "__allman" };
  if (opt.resolvedRole === "Barnmorska") return { category: "ssk", role: "__barnmorska" };
  if (opt.resolvedRole === "Röntgensjuksköterska") return { category: "ssk", role: "__rontgen" };
  return { category: "ssk", role: opt.label };
};

const TRUST_SIGNALS = [
  { icon: Lock, text: "Ingen registrering krävs för prisförslag" },
  { icon: Globe, text: "Offentlig data från 21 regioner" },
  { icon: FileText, text: "20 000+ analyserade avtal" },
];

export default function SalaryCheck() {
  const [searchParams] = useSearchParams();
  const prefillKey = searchParams.get("yrke") || "";
  const prefill = resolvePrefill(prefillKey);
  const startSurvey = searchParams.get("start") === "1";

  const [showSurvey, setShowSurvey] = useState(!!prefill || startSurvey);
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
              <CompcareLogo variant="full" inverted />
            </Link>
            <div className="flex items-center gap-3">
              <Link to="/logga-in" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
                Logga in
              </Link>
            </div>
          </div>
        </header>
        <div ref={surveyRef} className="px-4 pt-8 pb-16 min-h-[calc(100vh-3.5rem)] flex flex-col">
          <Survey
            initialCategory={prefill?.category}
            initialRole={prefill?.role}
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

      <header className="border-b border-border bg-card/80 backdrop-blur sticky top-0 z-50">
        <div className="max-w-5xl mx-auto flex items-center justify-between px-6 h-14">
          <Link to="/">
            <CompcareLogo variant="full" />
          </Link>
          <div className="flex items-center gap-3">
            <Link to="/logga-in" className="text-sm text-muted-foreground hover:text-primary transition-colors font-medium">
              Logga in
            </Link>
          </div>
        </div>
      </header>

      <section className="relative overflow-hidden bg-background">
        <div className="relative mx-auto max-w-3xl px-6 pt-16 pb-14 md:pt-20 md:pb-16">
          <div className="flex flex-col">
            <div className="mb-5 inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3.5 py-1.5 text-[13px] font-medium text-primary backdrop-blur-xl">
              <span className="h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary)/0.5)]" />
              För sjuksköterskor och läkare i bemanning
            </div>

            <h1 className="text-[2.25rem] font-bold leading-[1.05] tracking-[-0.035em] text-foreground sm:text-5xl lg:text-[3.5rem]">
              Din nästa löneförhandling börjar här.
            </h1>

            <p className="mt-4 max-w-lg text-[15px] leading-[1.7] text-muted-foreground sm:text-base lg:text-[17px]">
              Gå inte in i nästa samtal med en magkänsla – gå in med data. Vi har kartlagt de faktiska avtalspriserna för 21 regioner och 290 kommuner. Genom att jämföra din nuvarande ersättning mot marknadens realitet ser du direkt om du ligger rätt eller om du har förhandlingsutrymme.
            </p>

            <div className="mt-6">
              <button
                onClick={handleStartSurvey}
                className="w-full sm:w-auto inline-flex min-h-[50px] items-center justify-center rounded-xl bg-primary hover:bg-primary/90 px-7 text-[15px] font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition duration-200 hover:-translate-y-0.5"
              >
                Se villkor för din roll och ort
              </button>
            </div>

            <p className="mt-4 text-sm text-muted-foreground lg:text-[15px]">Informationen hämtas från offentliga avtal och branschens genomsnittsmarginaler.</p>

            <div className="mt-8">
              <HeroRateLookup />
            </div>

            <div className="mt-8 space-y-2">
              {[
                { title: "Transparens:", text: "Se rätt avtalsinnehåll och lönenivå för din roll" },
                { title: "Regional jämförelse:", text: "Se hur ersättningen skiljer sig mellan orter" },
                { title: "Smart assistent:", text: "Få konkreta råd baserat på verifierad marknadsdata" },
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
          </div>
        </div>
      </section>

      <MissionSection />
      <Steps />
    </div>
  );
}
