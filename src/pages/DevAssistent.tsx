import { useEffect } from "react";
import { Link } from "react-router-dom";
import { Check, ShieldCheck } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import HomeAssistantChat from "@/components/assistant/HomeAssistantChat";
import RoleCarousel from "@/components/landing/RoleCarousel";
import SiteFooter from "@/components/landing/SiteFooter";
import AnthropicScope from "@/components/demo/AnthropicScope";
import { SEO } from "@/components/SEO";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";

/**
 * DevAssistent — kopia av startsidan där hero-formuläret är utbytt mot
 * assistent-chatten. Isolerad testyta på /dev_assistent; startsidan (/) rörs inte.
 */
export default function DevAssistent() {
  useTimeOnPage("dev_assistent");

  useEffect(() => {
    document.documentElement.setAttribute("data-noindex", "true");
    return () => document.documentElement.removeAttribute("data-noindex");
  }, []);

  return (
    <AnthropicScope>
      <div className="w-full text-foreground font-sans min-h-screen">
        <SEO
          title="CompCare assistent (dev)"
          description="Intern testyta för CompCares assistent."
          path="/dev_assistent"
          noindex
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

        {/* ── HERO med assistent-chatt ── */}
        <section
          id="analys"
          data-no-roomy
          className="relative z-20 overflow-visible px-5 sm:px-6 lg:px-10 scroll-mt-20 pt-14 pb-20 md:pt-16 md:pb-20"
        >
          <div className="relative z-10 max-w-[1200px] mx-auto grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.1fr_0.9fr] gap-10 md:gap-16 lg:gap-14 items-center">
            {/* Vänster: rubrik och pitch */}
            <div className="flex flex-col items-center md:items-start text-center md:text-left md:w-full md:!block">
              <h1 className="font-editorial font-bold leading-[1.12] text-black mb-5 text-[34px] sm:text-5xl md:text-[62px]">
                Ai för konsulter inom sjukvård.<br />
                <span className="text-gradient-violet text-black">Sätt din agent i arbete.&nbsp;</span>
              </h1>
              <p className="font-editorial text-lg sm:text-xl text-black/75 leading-relaxed max-w-[460px]">
                Fråga assistenten vad regionen betalar för din roll och zon, vad du kan fakturera efter
                bemanningsbolagets marginal och hur avropen har sett ut historiskt. Svaren bygger på SKR:s
                ramavtal — inget annat.
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

            {/* Höger: chattruta (samma yta som formuläret) */}
            <div className="w-full md:max-w-[480px] md:justify-self-end lg:max-w-none lg:justify-self-stretch">
              <HomeAssistantChat />
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

        <SiteFooter />
      </div>
    </AnthropicScope>
  );
}
