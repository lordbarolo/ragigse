import { useEffect } from "react";
import { Link } from "@/lib/router-compat";
import Hero from "@/components/startsida5c/Hero";
import RolltabellDark from "@/components/startsida5c/RolltabellDark";
import OvergangChatt from "@/components/startsida5c/OvergangChatt";
import FotoBand from "@/components/startsida5c/FotoBand";
import Footer5c from "@/components/startsida5c/Footer5c";
import { trackEvent } from "@/lib/trackEvent";

const FONT_HREF =
  "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap";

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
    <div style={{ background: "#0e1016", fontFamily: "'Space Grotesk',system-ui,sans-serif", color: "#eef0f4" }}>
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
        style={{ borderBottom: "1px solid #22242e" }}
      >
        <Link
          to="/"
          className="text-[17px] font-semibold"
          style={{ fontFamily: "'IBM Plex Mono',monospace", letterSpacing: "-0.5px", color: "#eef0f4" }}
        >
          compcare
        </Link>
        <Link
          to="/logga-in"
          className="rounded-full px-5 py-2.5 text-[13.5px] font-medium"
          style={{ border: "1px solid rgba(255,255,255,.18)", color: "#eef0f4" }}
        >
          Logga in
        </Link>
      </header>

      <Hero />
      <RolltabellDark />
      <OvergangChatt />
      <FotoBand />
      <Footer5c />
    </div>
  );
}
