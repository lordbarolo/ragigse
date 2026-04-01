export default function Hero() {
  return (
    <section className="relative flex flex-col items-center text-center px-6 pt-6 pb-3 overflow-hidden">
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
        <div className="inline-flex items-center gap-2 bg-primary/[0.08] border border-primary/20 rounded-full px-3.5 pr-3 py-1 font-display text-sm md:text-xs font-medium text-primary tracking-wide mb-3">
          <span className="w-1.5 h-1.5 rounded-full bg-primary" />
          Officiella avtalspriser · SKR Ramavtal 2026
        </div>

        <h1
          className="font-display font-extrabold leading-[1.04] tracking-[-0.04em] text-foreground mb-2"
          style={{ fontSize: "clamp(26px, 6.5vw, 56px)" }}
        >
          Tjänar du rätt? Fakturerar du rätt? Förhandlar du rätt?
        </h1>

        <p
          className="text-foreground/55 font-light leading-relaxed max-w-[460px] mx-auto"
          style={{ fontSize: "clamp(14px, 2.2vw, 16px)" }}
        >
          Verifieringsinfrastruktur för vården — ramavtalspriser, lönestatistik och marginalberäkningar samlat från 21 regioner och SCB.
        </p>
      </div>
    </section>
  );
}
