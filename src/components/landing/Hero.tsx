export default function Hero() {
  return (
    <section className="relative min-h-[calc(100svh-84px)] flex flex-col items-center justify-center text-center px-6 py-16 pb-20 overflow-hidden">
      {/* Mesh gradient */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 70% 55% at 15% 25%, hsl(196 100% 50% / 0.18) 0%, transparent 55%)",
            "radial-gradient(ellipse 55% 50% at 85% 20%, hsl(245 58% 60% / 0.14) 0%, transparent 50%)",
            "radial-gradient(ellipse 50% 60% at 55% 85%, hsl(160 60% 45% / 0.10) 0%, transparent 50%)",
          ].join(", "),
        }}
      />
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 75% 65% at 50% 40%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 75% 65% at 50% 40%, black 0%, transparent 75%)",
        }}
      />

      <div className="relative z-10 max-w-[720px] w-full">
        {/* Source badge */}
        <div className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/20 rounded-full px-3.5 pr-3 py-1 font-display text-xs font-medium text-primary tracking-wide mb-7">
          <span className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center text-[10px]">🛡</span>
          Officiella avtalspriser · SKR Ramavtal RS 202203983
        </div>

        <h1
          className="font-display font-extrabold leading-[1.04] tracking-[-0.04em] text-foreground mb-5"
          style={{ fontSize: "clamp(34px, 8vw, 68px)" }}
        >
          Vad betalar<br />
          <span className="text-primary">regionen</span> för<br />
          din <span className="bg-gradient-to-r from-[#a78bfa] to-[#60a5fa] bg-clip-text text-transparent">kompetens?</span>
        </h1>

        <p
          className="text-foreground/65 font-light leading-relaxed max-w-[480px] mx-auto mb-9"
          style={{ fontSize: "clamp(15px, 2.5vw, 18px)" }}
        >
          Jämför din ersättning mot offentliga ramavtalspriser. Se var du befinner dig i marknadsspannet — och vad du kan förhandla till.
        </p>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2.5 items-center justify-center mb-12">
          <a
            href="#roles"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-display font-bold text-[15px] px-6 py-3.5 rounded-xl no-underline shadow-[0_0_28px_hsl(196_100%_50%/0.28)] hover:-translate-y-0.5 hover:shadow-[0_0_44px_hsl(196_100%_50%/0.42)] transition-all whitespace-nowrap"
          >
            Se din rapport
          </a>
          <a
            href="#steps"
            className="inline-flex items-center gap-1.5 bg-foreground/5 border border-foreground/[0.12] text-foreground font-display font-semibold text-[15px] px-6 py-3.5 rounded-xl no-underline hover:bg-foreground/[0.09] transition-all whitespace-nowrap"
          >
            Hur fungerar det?
          </a>
        </div>

        {/* Trust row */}
        <div className="flex items-center justify-center flex-wrap gap-x-5 gap-y-1.5">
          {["Anonymt", "Kostnadsfritt", "Klart på 60 sekunder", "Ingen registrering"].map((t, i) => (
            <span key={t} className="text-xs font-medium text-foreground/35 font-display tracking-wide flex items-center gap-1.5">
              {i > 0 && <span className="w-1 h-1 rounded-full bg-foreground/35" />}
              {t}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
