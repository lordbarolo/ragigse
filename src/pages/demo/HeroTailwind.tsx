import { Helmet } from "react-helmet-async";
import { ArrowRight } from "lucide-react";
import { PhoneMockup } from "@/components/demo/PhoneMockup";
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";
import { heroBackgroundStyle } from "@/lib/heroBackground";

/**
 * /demo/hero-tailwind
 * Visuell 1:1-klon av Tailwind UI "With phone mockup"-hjälten,
 * med CompCare-copy och InlineTerminalSurvey inuti telefonen.
 */
export default function HeroTailwind() {
  return (
    <div className="relative min-h-screen overflow-hidden" style={heroBackgroundStyle}>
      <Helmet>
        <title>Hero (Tailwind-mockup) · CompCare demo</title>
        <meta name="robots" content="noindex,nofollow" />
      </Helmet>

      {/* Prickigt rutnät i bakgrunden, fades mot kanterna */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            "radial-gradient(rgba(15,23,42,0.12) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
          WebkitMaskImage:
            "radial-gradient(ellipse at center, black 40%, transparent 80%)",
        }}
      />

      <section className="relative mx-auto max-w-7xl px-6 pb-32 pt-24 lg:px-8 lg:pb-40 lg:pt-32">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          {/* Vänster: text */}
          <div>
            {/* Pill badge */}
            <a
              href="#"
              className="inline-flex items-center gap-x-3 rounded-full border border-slate-200 bg-white px-3 py-1 text-sm shadow-sm"
            >
              <span className="font-semibold text-[#4f46e5]">
                Vi rekryterar inte
              </span>
              <span className="h-4 w-px bg-slate-200" aria-hidden />
              <span className="inline-flex items-center gap-1 text-slate-600">
                Vi visar bara vad ramavtalen säger
                <ArrowRight className="h-4 w-4" />
              </span>
            </a>

            {/* H1 */}
            <h1 className="mt-8 text-5xl font-bold tracking-tight text-slate-900 lg:text-6xl">
              Ett bättre sätt att förhandla din ersättning
            </h1>

            {/* Ingress */}
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Jämför din nuvarande ersättning mot SKR:s ramavtal på under 60
              sekunder. Neutral analys, inga säljsamtal.
            </p>

            {/* CTA */}
            <div className="mt-10 flex items-center gap-6">
              <a
                href="#hero-form"
                className="inline-flex items-center justify-center rounded-md bg-[#4f46e5] px-6 py-3 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#4338ca] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4f46e5]"
              >
                Kom igång
              </a>
              <a
                href="/sa-funkar-det"
                className="inline-flex items-center gap-1 text-sm font-semibold text-slate-900 hover:text-slate-700"
              >
                Så funkar det <span aria-hidden>→</span>
              </a>
            </div>
          </div>

          {/* Höger: telefon-mockup */}
          <div
            id="hero-form"
            className="flex justify-center lg:justify-end"
          >
            <div className="lg:rotate-[2deg]">
              <PhoneMockup>
                <div
                  className="origin-top"
                  style={{
                    transform: "scale(0.78)",
                    width: "calc(100% / 0.78)",
                  }}
                >
                  <div className="px-3 py-2">
                    <InlineTerminalSurvey />
                  </div>
                </div>
              </PhoneMockup>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
