import { useEffect } from "react";
import { Link } from "react-router-dom";
import ErrorBoundary from "@/components/ErrorBoundary";
import HomeAssistantChat from "@/components/chat/HomeAssistantChat";
import ConsultantRatesBand from "@/components/landing/ConsultantRatesBand";
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

/** Visas om chatten kraschar — sektionen faller tillbaka, sidan överlever. */
const CHAT_FALLBACK = (
  <div className="mx-auto w-full max-w-[720px] px-6 pb-[26px]">
    <div className="rounded-[18px] border border-white/10 bg-[#151823]/[0.92] p-6 text-center">
      <p className="text-sm leading-[1.55] text-[#d6d8e4]">
        Assistenten kunde inte laddas just nu. Ladda om sidan så försöker vi igen.
      </p>
      <Link
        to="/registrera"
        className="mt-3 inline-block text-[13px] font-medium text-[#9da0f5] underline-offset-4 hover:underline"
      >
        Skapa konto →
      </Link>
    </div>
  </div>
);

export default function Home() {
  useTimeOnPage("landing");

  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

  return (
    <div className="min-h-screen w-full bg-[#0d0f15] font-grotesk text-[#eef0f4]">
      <SEO
        title="CompCare – Lön & ramavtalspriser för vårdkonsulter"
        description="Fråga assistenten vad regionen betalar för din roll och zon, och vad du får efter bemanningsbolagets marginal. Baserat på SKR:s ramavtal."
        path="/"
        jsonLd={LANDING_JSONLD}
      />

      <div className="relative overflow-hidden">
        {/* Glöd bakom chatten */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute left-1/2 top-[120px] -ml-[380px] h-[520px] w-[760px] rounded-full blur-[30px] animate-cc-glow-pulse motion-reduce:animate-none"
          style={{
            background: "radial-gradient(ellipse,rgba(91,91,240,.28),transparent 65%)",
            zIndex: 0,
          }}
        />

        {/* Nav */}
        <nav
          className="relative flex items-center justify-between border-b border-white/[0.07] px-6 py-5 sm:px-12"
          aria-label="Huvudnavigation"
        >
          <Link
            to="/"
            className="font-plex text-[17px] font-semibold leading-none tracking-[-0.5px] text-[#eef0f4]"
            aria-label="CompCare startsida"
          >
            compcare
          </Link>
          <Link
            to="/logga-in"
            className="rounded-full border border-white/[0.18] px-5 py-[9px] text-[13.5px] font-medium text-[#eef0f4] transition-colors hover:border-white/40 hover:bg-white/5"
          >
            Logga in
          </Link>
        </nav>

        {/* Rubrik */}
        <header className="relative mx-auto max-w-[820px] px-6 pb-6 pt-12 text-center sm:pt-16">
          <h1 className="mb-[18px] font-grotesk text-[32px] font-semibold leading-[1.08] tracking-[-0.02em] sm:text-[42px] lg:text-[52px] animate-cc-fade-up motion-reduce:animate-none">
            Ai för konsulter inom sjukvård.
            <br />
            <span
              className="bg-clip-text text-transparent"
              style={{ backgroundImage: "linear-gradient(90deg,#9da0f5,#6ee7b7)" }}
            >
              Sätt din agent i arbete.
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-[600px] text-base leading-[1.6] text-[#a3a7b7] animate-cc-fade-up [animation-delay:0.12s] motion-reduce:animate-none">
            Fråga assistenten vad regionen betalar för din roll och zon, vad du kan fakturera efter
            bemanningsbolagets marginal och hur avropen har sett ut historiskt. Svaren bygger på
            SKR:s ramavtal — inget annat.
          </p>
        </header>

        {/* Chatten */}
        <ErrorBoundary fallback={CHAT_FALLBACK}>
          <HomeAssistantChat />
        </ErrorBoundary>
      </div>

      {/* Foto + prisband */}
      <ConsultantRatesBand />

      {/* Footer */}
      <footer className="flex flex-col gap-2 border-t border-white/[0.07] px-6 py-4 text-xs text-[#565b6e] sm:flex-row sm:items-center sm:justify-between sm:px-12">
        <p>© 2026 CompCare · Data lagras inom EU · Vi delar aldrig dina uppgifter</p>
        <Link to="/integritetspolicy" className="hover:text-[#8c90a0]">
          Integritetspolicy
        </Link>
      </footer>
    </div>
  );
}
