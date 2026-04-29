import { useNavigate } from "react-router-dom";

export default function InvoiceSection() {
  const navigate = useNavigate();

  return (
    <section className="pb-8 md:pb-12 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 md:p-12 flex flex-col md:flex-row gap-8 md:gap-12 items-start">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-emerald-500/10 text-emerald-500 shrink-0">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <rect x="3" y="4" width="14" height="13" rx="2" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M7 4V3M13 4V3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M7 10l2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>

          <div className="flex-1 space-y-4">
            <h2 className="text-2xl md:text-[26px] font-semibold text-foreground">
              Fakturerar du rätt?
            </h2>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Pengarna du inte visste att du saknade. Konsulter missar att fakturera
              för i snitt 30&nbsp;000&nbsp;kr per år. Se om du har pengar att hämta.
            </p>

            <button
              onClick={() => navigate("/fakturakontroll")}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-foreground border-b border-border pb-px w-fit hover:border-foreground transition-colors cursor-pointer bg-transparent"
            >
              Läs mer <span aria-hidden>→</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
