import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Check, ShieldCheck } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";
import RoleCarousel from "@/components/landing/RoleCarousel";
import AnthropicScope from "@/components/demo/AnthropicScope";
import { SEO } from "@/components/SEO";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";

const LANDING_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CompCare",
    url: "https://www.compcare.se/",
    inLanguage: "sv-SE",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CompCare",
    url: "https://www.compcare.se/",
    logo: "https://www.compcare.se/compcare-logo.svg",
  },
];

export default function Home() {
  useTimeOnPage("landing");
  const [surveyStep, setSurveyStep] = useState(1);
  const heroCollapsed = surveyStep > 1;



  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

  return (
    <AnthropicScope>
      <div className="w-full text-foreground font-sans min-h-screen">
        <SEO
          title="CompCare – Lön & ramavtalspriser för vårdkonsulter"
          description="Jämför ditt erbjudande mot SKR:s ramavtalspriser i 290 kommuner. Gratis löneanalys för sjuksköterskor, barnmorskor och läkare."
          path="/"
          jsonLd={LANDING_JSONLD}
        />

        {/* ── Nav ─────────────────────────────── */}
        <nav className="relative flex items-center justify-between px-5 sm:px-6 lg:px-10 h-[60px] border-b border-black/10 bg-transparent">
          <Link to="/" aria-label="CompCare startsida" className="inline-flex items-center text-black">
            <CompcareLogo variant="full" inverted={false} />
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/logga-in">
              <button
                className="text-sm text-black hover:bg-black/5 transition-colors"
                style={{ backgroundColor: "transparent", border: "1px solid rgba(0,0,0,0.3)", borderRadius: "6px", padding: "8px 16px" }}
              >
                Logga in
              </button>
            </Link>
          </div>
        </nav>

        {/* ── HERO med inline-form ── */}
        <section
          id="analys"
          data-no-roomy
          className={`relative z-20 overflow-visible px-5 sm:px-6 lg:px-10 scroll-mt-20 transition-all duration-300 ${
            heroCollapsed
              ? "pt-4 pb-6 md:pt-14 md:pb-20"
              : "pt-14 pb-20 md:pt-16 md:pb-20"
          }`}
        >
          <div className="relative z-10 max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-16 lg:gap-14 items-center">
            {/* Vänster: rubrik och pitch */}
            <div
              className={`flex flex-col items-center md:items-start text-center md:text-left md:w-full md:!block ${
                heroCollapsed ? "hidden" : "flex"
              }`}
            >
              <h1 className="font-editorial font-bold leading-[1.12] text-black mb-5 text-[34px] sm:text-5xl md:text-[62px]">
                Vet du vad du<br />
                <span className="text-gradient-violet text-black">är värd?</span>
              </h1>
              <p className="font-editorial text-lg sm:text-xl text-black/75 leading-relaxed max-w-[460px]">
                Se vad regionen betalar, vad marknaden kan ge och vad du kan tjäna.
              </p>
              <ul className="mt-6 space-y-2 max-w-[460px] hidden lg:block">
                <li className="flex items-start gap-2 text-base text-[#6B6B6B]">
                  <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(160,80%,50%)" }} />
                  <span>Baserat på SKR:s offentliga ramavtalspriser</span>
                </li>
                <li className="flex items-start gap-2 text-base text-[#6B6B6B]">
                  <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(160,80%,50%)" }} />
                  <span>Branschens standardmarginaler — ca 12 % läkare, 17 % sjuksköterskor</span>
                </li>
              </ul>
            </div>

            {/* Mobil: tunn kollapsad rad när wizarden startat */}
            {heroCollapsed && (
              <div className="md:hidden -mb-2">
                <p className="text-xs uppercase tracking-wider text-black/60 font-medium">
                  Vet du vad du <span className="text-[#3D3491] font-semibold">är värd?</span>
                </p>
              </div>
            )}

            {/* Höger: formulär */}
            <div className="w-full md:max-w-[480px] md:justify-self-end lg:max-w-none lg:justify-self-stretch">
              <InlineTerminalSurvey variant="light" onStepChange={setSurveyStep} />
              <p className="mt-3 text-[11px] text-black/55 leading-relaxed flex items-start gap-1.5">
                <ShieldCheck className="w-3 h-3 mt-0.5 shrink-0 text-[#3D3491]" />
                <span>
                  Data lagras inom EU · Vi delar aldrig dina uppgifter. Se{" "}
                  <Link to="/integritetspolicy" className="underline">integritetspolicyn</Link>.
                </span>
              </p>
              <ul className="mt-6 space-y-2 max-w-[460px] lg:hidden">
                <li className="flex items-start gap-2 text-base text-[#6B6B6B]">
                  <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(160,80%,50%)" }} />
                  <span>Baserat på SKR:s offentliga ramavtalspriser</span>
                </li>
                <li className="flex items-start gap-2 text-base text-[#6B6B6B]">
                  <Check className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "hsl(160,80%,50%)" }} />
                  <span>Branschens standardmarginaler — ca 12 % läkare, 17 % sjuksköterskor</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <RoleCarousel />

        {/* ── Footer ──────────────────────────── */}
        <footer className="mt-16 border-t border-black/10 px-5 py-8 text-xs text-black/55">
          <div className="max-w-6xl mx-auto flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-black/75"></p>
            </div>
            <nav className="flex flex-wrap gap-x-5 gap-y-2">
              <a href="mailto:info@compcare.se" className="hover:text-black underline-offset-4 hover:underline">info@compcare.se</a>
              <Link to="/integritetspolicy" className="hover:text-black underline-offset-4 hover:underline">Integritetspolicy</Link>
              <Link to="/vanliga-fragor" className="hover:text-black underline-offset-4 hover:underline">Vanliga frågor</Link>
            </nav>
          </div>
        </footer>

      </div>
    </AnthropicScope>
  );
}
