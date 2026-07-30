import { useState } from "react";

const FEATURES = [
  { bold: "Regionens kundpris", text: " — vad regionen faktiskt betalar per timme för din roll och zon" },
  { bold: "Realistiskt förhandlingsspann", text: " — vad konsulter i din situation normalt ersätts med" },
  { bold: "Din position i spannet", text: " — under, i, eller över möjlig ersättning med exakt differens" },
  { bold: "OB-tariffer", text: " — vad som gäller för kväll, natt, helg och storhelg enligt ramavtalet" },
  { bold: "Förhandlingstips", text: " — konkreta formuleringar anpassade till din specifika situation" },
];

export default function ReportPreview() {
  const [scenario, setScenario] = useState<"a" | "b">("a");
  const isUnder = scenario === "a";

  return (
    <section className="py-20 md:py-[100px] px-6 md:px-10 max-w-[1080px] mx-auto">
      <p className="font-display text-sm md:text-[11px] font-semibold tracking-[0.14em] uppercase text-primary mb-3.5">
        Rapporten
      </p>
      <h2 className="font-display font-extrabold tracking-[-0.03em] leading-[1.1] mb-3.5" style={{ fontSize: "clamp(26px, 4vw, 40px)" }}>
        Faktabaserad. Opartisk. Konkret.
      </h2>
      <p className="text-base text-foreground/65 font-light leading-relaxed max-w-[480px]">
        Du ser exakt vad regionen betalar, var du befinner dig i spannet, och vad som är rimligt att förhandla om.
      </p>

      <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.05fr] gap-12 lg:gap-[60px] items-center mt-14">
        {/* Left: feature list */}
        <div>
          <div className="flex flex-col gap-[18px] mt-8">
            {FEATURES.map((f, i) => (
              <div key={i} className="flex items-start gap-3.5">
                <div className="w-[22px] h-[22px] flex-shrink-0 rounded-full bg-primary/10 border border-primary/25 flex items-center justify-center mt-0.5">
                  <span className="text-[11px] text-primary font-bold">✓</span>
                </div>
                <span className="text-base md:text-[15px] text-foreground/65 leading-snug">
                  <strong className="text-foreground font-semibold">{f.bold}</strong>{f.text}
                </span>
              </div>
            ))}
          </div>

          {/* Scenario toggle */}
          <div className="flex gap-2 mt-8">
            <button
              onClick={() => setScenario("a")}
              className={`font-display text-xs font-semibold px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                isUnder
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-transparent border-foreground/[0.12] text-muted-foreground"
              }`}
            >
              Under marknad
            </button>
            <button
              onClick={() => setScenario("b")}
              className={`font-display text-xs font-semibold px-4 py-1.5 rounded-full border transition-all cursor-pointer ${
                !isUnder
                  ? "bg-primary/10 border-primary/30 text-primary"
                  : "bg-transparent border-foreground/[0.12] text-muted-foreground"
              }`}
            >
              Över marknad
            </button>
          </div>
        </div>

        {/* Right: report card */}
        <div className="bg-[hsl(var(--dark-2))] border border-foreground/[0.12] rounded-[20px] overflow-hidden shadow-[0_32px_80px_rgba(0,0,0,0.45),0_0_0_1px_rgba(255,255,255,0.04)] lg:[transform:perspective(1200px)_rotateY(-3deg)_rotateX(1.5deg)] lg:hover:[transform:perspective(1200px)_rotateY(0deg)_rotateX(0deg)] transition-transform duration-500">
          {/* Header */}
          <div className="bg-[hsl(var(--dark-3))] border-b border-foreground/[0.07] px-5 py-3.5 flex items-center justify-between gap-3">
            <span className="text-xs text-muted-foreground font-display font-medium">Anestesisjuksköterska · Zon 1 · Egenföretagare</span>
            {isUnder ? (
              <span className="font-display text-[11px] font-bold px-3 py-1 rounded-full tracking-wide bg-[hsl(var(--amber))]/[0.12] text-[hsl(var(--amber))] border border-[hsl(var(--amber))]/20">
                Under marknad
              </span>
            ) : (
              <span className="font-display text-[11px] font-bold px-3 py-1 rounded-full tracking-wide bg-[hsl(var(--green))]/[0.12] text-[hsl(var(--green))] border border-[hsl(var(--green))]/20">
                Över marknad
              </span>
            )}
          </div>

          {/* Metrics */}
          <div className="px-5 pt-5">
            {[
              { dot: "hsl(var(--primary))", label: "Regionens kundpris", sub: "SKR Ramavtal, zon 1", val: "770 kr/h" },
              { dot: "hsl(var(--primary) / 0.5)", label: "Vanlig konsultersättning", sub: "Realistiskt–Rekommenderat spann", val: "595–690 kr/h" },
              { dot: isUnder ? "hsl(var(--amber))" : "hsl(var(--green))", label: "Din ersättning ★", sub: "Angiven timersättning", val: isUnder ? "558 kr/h" : "720 kr/h", highlight: true },
            ].map((m, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b border-foreground/[0.04] last:border-b-0">
                <div className="flex items-center gap-2.5">
                  <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: m.dot }} />
                  <div className="text-[13px] text-foreground/65">
                    {m.label}
                    <small className="block text-[11px] text-muted-foreground mt-px">{m.sub}</small>
                  </div>
                </div>
                <span className={`font-display text-base font-bold tracking-[-0.02em] ${m.highlight && !isUnder ? "text-[hsl(var(--green))]" : ""}`}>
                  {m.val}
                </span>
              </div>
            ))}
          </div>

          {/* Bar */}
          <div className="px-5 pt-5">
            <div className="text-[11px] text-muted-foreground font-display font-medium tracking-wider uppercase mb-2.5">Förhandlingsspann</div>
            <div className="h-2.5 bg-foreground/[0.06] rounded-full relative">
              <div className="absolute h-full bg-gradient-to-r from-primary/30 to-primary/70 rounded-full" style={{ left: "18%", right: "14%" }} />
              <div
                className="absolute top-1/2 -translate-y-1/2 w-[18px] h-[18px] rounded-full border-[3px] border-[hsl(var(--dark-2))]"
                style={{
                  left: isUnder ? "38%" : "78%",
                  background: isUnder ? "hsl(var(--amber))" : "hsl(var(--green))",
                  boxShadow: isUnder
                    ? "0 0 14px rgba(245,158,11,0.55)"
                    : "0 0 14px rgba(16,185,129,0.55)",
                  transform: "translate(-50%, -50%)",
                }}
              />
            </div>
            <div className="flex justify-between mt-2 text-[10px] text-muted-foreground font-display">
              <span>Lägre</span>
              <span>Realistiskt</span>
              <span>Rekommenderat</span>
              <span>Ambitiöst</span>
            </div>
          </div>

          {/* Gap strip */}
          <div
            className="mx-5 mt-4 rounded-lg px-3.5 py-3 font-display text-xs font-medium leading-snug"
            style={{
              background: isUnder ? "rgba(245,158,11,0.07)" : "rgba(16,185,129,0.07)",
              border: `1px solid ${isUnder ? "rgba(245,158,11,0.18)" : "rgba(16,185,129,0.18)"}`,
              color: isUnder ? "hsl(var(--amber))" : "hsl(var(--green))",
            }}
          >
            {isUnder
              ? "Din ersättning är 37 kr/h under realistiskt spann · motsvarar −6 364 kr/månad vid 172 h"
              : "Din ersättning är 30 kr/h över rekommenderat spann · bra förhandlingsläge"}
          </div>

          {/* Tip */}
          <div className="mx-5 mt-4 mb-5 bg-foreground/[0.03] border border-foreground/[0.07] rounded-lg p-3.5">
            <div className="text-[10px] font-display font-semibold tracking-[0.1em] uppercase text-muted-foreground mb-1.5">
              Förhandlingstips
            </div>
            <p className="text-[13px] text-foreground/65 leading-snug">
              {isUnder ? (
                <>Nämn att du känner till att regionens kundpris är <strong className="text-foreground">770 kr/h</strong>. Be om en grundersättning på minst <strong className="text-foreground">595 kr/h</strong> och säkerställ att OB specificeras separat i avtalet.</>
              ) : (
                <>Du ligger redan över möjlig ersättning. Fokusera på att <strong className="text-foreground">behålla din position</strong> och se till att OB-tilläggen specificeras korrekt i avtalet.</>
              )}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
