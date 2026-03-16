import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import Survey from "@/components/Survey";
import LandingFooter from "@/components/landing/LandingFooter";

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [showSurvey, setShowSurvey] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState<string>("");
  const [prefillRole, setPrefillRole] = useState<string>("");
  const surveyRef = useRef<HTMLDivElement>(null);

  useTimeOnPage("landing");
  useEffect(() => { trackEvent("landing_viewed"); }, []);

  const handleRoleSelect = (category: "lakare" | "ssk", prefill?: string) => {
    setPrefillCategory(category);
    setPrefillRole(prefill || "");
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
        <div ref={surveyRef} className="px-4 pt-8 pb-16 bg-background min-h-screen flex flex-col">
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
    <div className="h-[100dvh] bg-background flex flex-col overflow-hidden">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

      {/* Nav */}
      <nav className="flex items-center justify-between px-5 h-[52px] flex-shrink-0">
        <span className="font-display text-lg font-extrabold tracking-tight text-foreground">
          comp<em className="text-primary not-italic">care</em>
        </span>
      </nav>

      {/* All content as one block, pushed to lower half */}
      <main className="flex-1 flex flex-col items-center justify-end px-5" style={{ paddingBottom: '10dvh' }}>
        {/* Badge */}
        <div className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/20 rounded-full px-3.5 py-1 font-display text-[11px] font-medium text-primary tracking-wider mb-5">
          <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px]">🛡</span>
          Officiella avtalspriser · 290 kommuner · 21 regioner
        </div>

        {/* Headline */}
        <div className="text-center max-w-[480px] mb-8">
          <h1
            className="font-display font-extrabold leading-[1.06] tracking-[-0.04em] text-foreground"
            style={{ fontSize: "clamp(28px, 7vw, 48px)" }}
          >
            Vad betalar{" "}
            <span className="text-primary">regionen</span> för{" "}
            <span className="bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] bg-clip-text text-transparent">
              din kompetens?
            </span>
          </h1>
          <p className="text-body leading-relaxed mt-3 max-w-[380px] mx-auto">
            Jämför din ersättning mot offentliga ramavtalspriser på 60 sekunder.
          </p>
        </div>

        {/* Role label */}
        <p className="text-caption mb-4">
          Vad jobbar du som?
        </p>

        {/* Role cards */}
        <div className="w-full max-w-[420px] flex flex-col gap-2.5">
          <button
            onClick={() => handleRoleSelect("lakare")}
            className="group relative overflow-hidden flex items-center gap-4 bg-[hsl(var(--dark-2))] border border-foreground/[0.12] !border-l-[3px] !border-l-primary rounded-[16px] p-4 text-left cursor-pointer transition-all hover:border-primary/40 hover:bg-[hsl(var(--dark-3))] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3),0_0_0_1px_hsl(196_100%_50%/0.1)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 w-10 h-10 rounded-[10px] bg-primary/10 border border-primary/15 flex items-center justify-center text-[20px] flex-shrink-0">🩺</div>
            <div className="relative z-10 flex-1">
              <div className="font-display text-[15px] font-bold tracking-[-0.02em] mb-0.5">Läkare</div>
              <div className="text-body-sm leading-snug">ST, specialist eller legitimerad läkare</div>
            </div>
            <span className="relative z-10 text-primary text-xl flex-shrink-0 group-hover:translate-x-1 transition-transform">→</span>
          </button>

          <button
            onClick={() => handleRoleSelect("ssk")}
            className="group relative overflow-hidden flex items-center gap-4 bg-[hsl(var(--dark-2))] border border-foreground/[0.12] !border-l-[3px] !border-l-primary rounded-[16px] p-4 text-left cursor-pointer transition-all hover:border-primary/40 hover:bg-[hsl(var(--dark-3))] hover:-translate-y-0.5 hover:shadow-[0_12px_40px_rgba(0,0,0,0.3),0_0_0_1px_hsl(196_100%_50%/0.1)]"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.04] to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            <div className="relative z-10 w-10 h-10 rounded-[10px] bg-primary/10 border border-primary/15 flex items-center justify-center text-[20px] flex-shrink-0">💉</div>
            <div className="relative z-10 flex-1">
              <div className="font-display text-[15px] font-bold tracking-[-0.02em] mb-0.5">Sjuksköterska / Barnmorska</div>
              <div className="text-body-sm leading-snug">Allmän, specialist eller barnmorska</div>
            </div>
            <span className="relative z-10 text-primary text-xl flex-shrink-0 group-hover:translate-x-1 transition-transform">→</span>
          </button>
        </div>

        {/* Trust bar — 16px below cards */}
        <div className="flex items-center justify-center gap-4 sm:gap-6 mt-4">
          {["Anonymt", "Kostnadsfritt", "60 sekunder", "Ingen registrering"].map((label) => (
            <span key={label} className="text-foreground/30 text-[11px] font-medium tracking-wide font-display flex items-center gap-1.5">
              <span className="w-1 h-1 rounded-full bg-foreground/20" />
              {label}
            </span>
          ))}
        </div>
      </main>
    </div>
  );
}
