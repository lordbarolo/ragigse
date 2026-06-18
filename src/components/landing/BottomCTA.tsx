export default function BottomCTA() {
  return (
    <section className="relative py-[100px] px-6 text-center overflow-hidden">
      {/* Glow */}
      <div className="absolute inset-0 pointer-events-none" style={{ background: "radial-gradient(ellipse 65% 70% at 50% 50%, hsl(196 100% 50% / 0.09) 0%, transparent 65%)" }} />
      {/* Grid */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)",
          backgroundSize: "56px 56px",
          maskImage: "radial-gradient(ellipse 70% 80% at 50% 50%, black 0%, transparent 75%)",
          WebkitMaskImage: "radial-gradient(ellipse 70% 80% at 50% 50%, black 0%, transparent 75%)",
        }}
      />

      <div className="relative z-10 max-w-[600px] mx-auto">
        <h2 className="font-display font-extrabold tracking-[-0.04em] leading-[1.08] mb-[18px]" style={{ fontSize: "clamp(30px, 5vw, 52px)" }}>
          Se marknadsdata<br />för <em className="not-italic text-primary">din roll.</em>
        </h2>
        <p className="text-lg md:text-[17px] text-foreground/65 mb-9 font-light">
          Anonymt. Kostnadsfritt. Klart på 60 sekunder.
        </p>
        <div className="flex gap-2.5 justify-center flex-wrap">
          <a
            href="#roles"
            className="inline-flex items-center gap-1.5 bg-primary text-primary-foreground font-display font-bold text-[15px] px-6 py-3.5 rounded-xl no-underline shadow-[0_0_28px_hsl(196_100%_50%/0.28)] hover:-translate-y-0.5 hover:shadow-[0_0_44px_hsl(196_100%_50%/0.42)] transition-all"
          >
            Välj din roll
          </a>
          <a
            href="#steps"
            className="inline-flex items-center gap-1.5 bg-foreground/5 border border-foreground/[0.12] text-foreground font-display font-semibold text-[15px] px-6 py-3.5 rounded-xl no-underline hover:bg-foreground/[0.09] transition-all"
          >
            Hur fungerar det?
          </a>
        </div>
        <p className="mt-5 text-sm md:text-xs text-muted-foreground">Ingen registrering krävs · Dina uppgifter lagras inte</p>
      </div>
    </section>
  );
}
