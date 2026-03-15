import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";

import Ticker from "@/components/landing/Ticker";
import LandingNav from "@/components/landing/LandingNav";
import Hero from "@/components/landing/Hero";
import StatBar from "@/components/landing/StatBar";
import RoleSelector from "@/components/landing/RoleSelector";
import Steps from "@/components/landing/Steps";
import ReportPreview from "@/components/landing/ReportPreview";
import OBSection from "@/components/landing/OBSection";
import DataSection from "@/components/landing/DataSection";
import BottomCTA from "@/components/landing/BottomCTA";
import LandingFooter from "@/components/landing/LandingFooter";
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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const surveyRef = useRef<HTMLDivElement>(null);
  const [showSurvey, setShowSurvey] = useState(false);
  const [prefillCategory, setPrefillCategory] = useState<string>("");
  const [prefillRole, setPrefillRole] = useState<string>("");

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

  return (
    <div className="min-h-screen bg-background">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(webAppJsonLd) }} />

      <Ticker />
      <LandingNav />
      <Hero />
      <RoleSelector onRoleSelect={handleRoleSelect} />
      <StatBar />

      {/* Survey — slides in when a role is selected */}
      {showSurvey && (
        <div ref={surveyRef} className="px-4 pt-24 pb-16 bg-background border-t border-foreground/[0.07]">
          <Survey initialCategory={prefillCategory as "lakare" | "ssk" | ""} initialRole={prefillRole} onBack={() => setShowSurvey(false)} />
        </div>
      )}

      <Steps />
      <ReportPreview />
      <OBSection />
      <DataSection />
      <BottomCTA />
      <LandingFooter />
    </div>
  );
}
