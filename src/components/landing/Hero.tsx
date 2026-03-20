export default function Hero() {
  return (
    <section className="relative flex flex-col items-center text-center px-6 pt-6 pb-3 overflow-hidden">
      {/* Soft mesh gradient — tuned for light bg */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: [
            "radial-gradient(ellipse 80% 60% at 20% 20%, hsl(250 60% 62% / 0.06) 0%, transparent 60%)",
            "radial-gradient(ellipse 60% 50% at 80% 15%, hsl(220 80% 60% / 0.05) 0%, transparent 55%)",
            "radial-gradient(ellipse 50% 55% at 50% 90%, hsl(160 55% 50% / 0.04) 0%, transparent 50%)",
          ].join(", "),
        }}
      />
      {/* Fine dot grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "radial-gradient(circle, hsl(215 50% 16% / 0.04) 1px, transparent 1px)",
          backgroundSize: "24px 24px",
          maskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 60% at 50% 40%, black 0%, transparent 80%)",
        }}
      />

      <div className="relative z-10 max-w-[720px] w-full">
        {/* Source badge — glass pill */}
        <div className="inline-flex items-center gap-2 bg-card border border-border rounded-full px-4 py-1.5 font-display text-xs font-medium text-foreground/70 tracking-wide mb-4 shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
          <span className="w-5 h-5 rounded-full bg-primary/10 flex items-center justify-center text-[10px]">🛡</span>
          Officiella avtalspriser · SKR Ramavtal 2026
        </div>

        <h1
          className="font-display font-extrabold leading-[1.04] tracking-[-0.04em] text-foreground mb-2"
          style={{ fontSize: "clamp(26px, 6.5vw, 56px)" }}
        >
          Vad betalar <span className="text-primary">regionen</span><br className="sm:hidden" /> för din <span className="bg-gradient-to-r from-primary to-[hsl(220,80%,60%)] bg-clip-text text-transparent">kompetens?</span>
        </h1>

        <p
          className="text-muted-foreground font-light leading-relaxed max-w-[420px] mx-auto"
          style={{ fontSize: "clamp(14px, 2.2vw, 16px)" }}
        >
          Välj din roll och se hur din ersättning matchar marknadens ramavtalspriser.
        </p>
      </div>
    </section>
  );
}
