import { useEffect } from "react";
import { Link } from "@/lib/router-compat";
import { JsonLd } from "@/components/JsonLd";
import Hero from "@/components/startsida5c/Hero";
import RolltabellDark from "@/components/startsida5c/RolltabellDark";
import FilmFakturakontroll from "@/components/startsida5c/FilmFakturakontroll";
import FotoBand from "@/components/startsida5c/FotoBand";
import Footer5c from "@/components/startsida5c/Footer5c";

import { trackEvent } from "@/lib/trackEvent";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

const SITE_URL = "https://vardbemanning.ai";

const LANDING_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "vårdbemanning.ai",
    url: `${SITE_URL}/`,
    inLanguage: "sv-SE",
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "vårdbemanning.ai",
    url: `${SITE_URL}/`,
    logo: `${SITE_URL}/vardbemanning-logo-light-v2.png`,
  },
];

export default function Startsida5c() {
  useEffect(() => {
    trackEvent("landing_viewed", { variant: "5c", surface: "startsida" });
  }, []);

  useEffect(() => {
    const id = "startsida5c-fonts";
    if (document.getElementById(id)) return;
    const link = document.createElement("link");
    link.id = id;
    link.rel = "stylesheet";
    link.href = FONT_HREF;
    document.head.appendChild(link);
  }, []);

  return (
    <div style={{ background: "#0b0c10", fontFamily: "'Space Grotesk',system-ui,sans-serif", color: "#ffffff" }}>
      <JsonLd data={LANDING_JSONLD} />
      <style>{`
        @keyframes fadeUp5c { from { opacity: 0; transform: translateY(12px); } to { opacity: 1; transform: none; } }
        @keyframes cursorBlink5c { 0%,100% { opacity: 1; } 50% { opacity: 0; } }
        .caret5c { animation: cursorBlink5c 1.1s step-end infinite; }
        @media (prefers-reduced-motion: reduce) {
          .caret5c { animation: none; }
        }
      `}</style>

      <header
        className="flex items-center justify-between px-5 py-4 md:px-12 md:py-5"
        style={{ borderBottom: "1px solid #22232b" }}
      >
        <Link to="/" className="inline-flex items-center">
          <img
            src="/vardbemanning-wordmark-dark.png"
            alt="vårdbemanning.ai – till startsidan"
            className="h-6 w-auto select-none md:h-7"
            draggable={false}
          />
        </Link>
        <Link
          to="/logga-in"
          aria-label="Logga in"
          className="text-[14px] font-medium text-white/70 transition-colors hover:text-white"
        >
          Logga in
        </Link>


      </header>

      <Hero />
      <RolltabellDark />
      <FotoBand />
      <FilmFakturakontroll />

      <Footer5c />
    </div>
  );
}
