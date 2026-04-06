import { Link } from "react-router-dom";

export default function RefSection() {
  return (
    <section className="py-16 md:py-20 px-6">
      <div className="max-w-6xl mx-auto">
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-8 md:p-12 flex flex-col md:flex-row gap-8 md:gap-12 items-start">
          {/* Icon */}
          <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-amber-500/10 text-amber-500 shrink-0">
            <svg width="28" height="28" viewBox="0 0 20 20" fill="none">
              <circle cx="10" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.5" fill="none" />
              <path d="M4 17c0-3.314 2.686-5 6-5s6 1.686 6 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              <path d="M15 5l1.5-1.5M16.5 7H18" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </div>

          <div className="flex-1 space-y-4">
            <div className="flex items-center gap-3 flex-wrap">
              <h2 className="text-2xl md:text-[26px] font-semibold text-foreground">
                Referenser &amp; Verifikationer
              </h2>
              <span className="inline-flex items-center rounded-full bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-500">
                Kommer snart
              </span>
            </div>

            <p className="text-base md:text-lg text-muted-foreground leading-relaxed max-w-2xl">
              Ta kontroll över dina referenser och intyg. Dela handlingarna och ge
              tidsbegränsad tillgång till relevanta personer. Spårbart, säkert och
              på dina villkor.
            </p>

            <ul className="space-y-2 text-sm text-muted-foreground">
              {[
                "Samla alla intyg och betyg på ett ställe",
                "Verifiera dokument digitalt med utfärdaren",
                "Dela med tidsbegränsad åtkomst — du bestämmer vem som ser vad",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="mt-1.5 block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
