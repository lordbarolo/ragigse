import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Menu, X } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";
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

const NAV_LINKS = [
  { label: "FAQ", href: "/vanliga-fragor" },
];

export default function Home() {
  useTimeOnPage("landing");
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

  return (
    <AnthropicScope>
      <div className="w-full text-foreground font-sans bg-black min-h-screen">
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
            <Link to="/registrera">
              <button
                className="text-sm text-white hover:opacity-90 transition-opacity"
                style={{ backgroundColor: "#3D3491", color: "#FFFFFF", borderRadius: "6px", padding: "8px 16px" }}
              >
                Kom igång gratis
              </button>
            </Link>
            <Link to="/logga-in">
              <button
                className="text-sm text-black hover:bg-black/5 transition-colors"
                style={{ backgroundColor: "transparent", border: "1px solid rgba(0,0,0,0.3)", borderRadius: "6px", padding: "8px 16px" }}
              >
                Logga in
              </button>
            </Link>
            <button
              type="button"
              aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((v) => !v)}
              className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-black/15 text-black hover:bg-black/5 transition-colors"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>

          {menuOpen && (
            <>
              <div className="fixed inset-0 bg-black/30 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
              <div className="absolute top-full right-4 lg:right-10 mt-2 w-72 border border-black/10 rounded-xl shadow-2xl z-50 overflow-hidden bg-white">
                <div className="flex flex-col py-2">
                  {NAV_LINKS.map((l) => (
                    <Link
                      key={l.label}
                      to={l.href}
                      onClick={() => setMenuOpen(false)}
                      className="px-4 py-3 text-sm text-black/85 hover:bg-black/5 hover:text-black transition-colors"
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </div>
            </>
          )}
        </nav>

        {/* ── HERO med inline-form ── */}
        <section
          id="analys"
          data-no-roomy
          className="relative z-20 overflow-visible px-5 sm:px-6 lg:px-10 bg-black pt-14 md:pt-20 pb-20 md:pb-28 scroll-mt-20"
        >
          <div className="relative z-10 max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-12 items-center md:items-start">
            {/* Vänster: rubrik och pitch */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left md:w-full">
              <div
                className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium rounded-full px-3 py-1 mb-5 uppercase tracking-wider"
                style={{ backgroundColor: "#E8E4F0", color: "#3D3491", border: "1px solid #3D3491" }}
              >
                <svg width="10" height="10" viewBox="0 0 10 10">
                  <circle cx="5" cy="5" r="4" fill="currentColor" />
                </svg>
                För läkare &amp; sjuksköterskor
              </div>
              <h1 className="font-bold leading-[1.05] text-white mb-5 tracking-tight text-[34px] sm:text-5xl md:text-[64px]">
                Vet du vad du<br />
                <span className="text-gradient-violet text-white">är värd?</span>
              </h1>
              <p className="text-lg sm:text-xl text-white/75 leading-relaxed mb-2 max-w-[560px]">
                Se regionens pris,<br />
                bolagets marginal.<br />
                Din ersättning
              </p>
              <p className="mt-4 text-[12px] text-white/45">
                Anonymt · Kostnadsfritt · Klart på 60 sekunder
              </p>
            </div>

            {/* Höger: formulär */}
            <div className="w-full md:max-w-[480px] md:justify-self-end">
              <InlineTerminalSurvey />
            </div>
          </div>
        </section>
      </div>
    </AnthropicScope>
  );
}
