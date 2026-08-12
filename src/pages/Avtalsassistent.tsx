import { useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { Link } from "@/lib/router-compat";
import AvtalsassistentChat from "@/components/assistant/AvtalsassistentChat";
import { trackEvent } from "@/lib/trackEvent";

/**
 * /consultant/avtal
 * Dedikerad vy för Avtalsassistenten — svar om ramavtalet för hyrpersonal.
 */
export default function Avtalsassistent() {
  useEffect(() => {
    trackEvent("avtalsassistent_page_viewed");
  }, []);
  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:py-12">
        <Link
          to="/consultant/profil"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till profilen
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              Avtalsassistent
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Fråga om ramavtalet
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
              Svar om priser, krav, OB, vite, uppsägning och anställningsform —
              baserat på SKR:s ramavtal för hyrpersonal och dina sparade uppgifter.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            <AvtalsassistentChat />
          </div>
        </div>
      </div>
    </div>
  );
}
