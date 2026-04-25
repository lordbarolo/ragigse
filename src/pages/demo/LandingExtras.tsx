import { Link } from "react-router-dom";
import CompcareLogo from "@/components/CompcareLogo";

const STEPS = [
  { num: "1", title: "Skapa ditt konto", desc: "Logga in och ange din roll.\nFå tillgång till verktyg och insikter." },
  { num: "2", title: "Ladda upp dina dokument", desc: "Tidrapporter, intyg och CV. Allt struktureras och säkras i valvet." },
  { num: "3", title: "Få insikt och agera", desc: "Löneanalys, marknadsdata och förhandlingsstöd — direkt." },
  { num: "4", title: "Dela på dina villkor", desc: "Skicka en krypterad länk när du är redo. Full kontroll över din data." },
];

export default function LandingExtras() {
  return (
    <div className="w-full bg-[#F2F1F8] text-foreground font-sans">
      {/* ── Nav ─────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 lg:px-10 h-[60px] bg-white border-b border-border/40">
        <Link to="/"><CompcareLogo variant="wordmark" /></Link>
        <Link to="/" className="text-sm text-muted-foreground hover:text-foreground">← Tillbaka till start</Link>
      </nav>

      {/* ── Steps ───────────────────────────── */}
      <section className="px-6 lg:px-10 py-[72px] bg-[#ECEAF5]">
        <p className="text-xs font-medium text-[#534AB7] uppercase tracking-widest mb-2.5">Så funkar det</p>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight mb-10">Fyra steg till full kontroll</h2>
        <div className="flex flex-col md:flex-row gap-0 relative">
          <div className="hidden md:block absolute top-7 left-7 right-7 h-px bg-border/40" />
          {STEPS.map((s) => (
            <div key={s.num} className="flex-1 text-center relative z-10 px-4 mb-8 md:mb-0">
              <div className="w-14 h-14 rounded-full bg-white border border-border/60 flex items-center justify-center text-[15px] font-medium text-[#534AB7] mx-auto mb-4">
                {s.num}
              </div>
              <h4 className="text-sm font-medium mb-1.5">{s.title}</h4>
              <p className="text-[13px] text-muted-foreground leading-snug whitespace-pre-line">{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-border/40 mx-6 lg:mx-10" />

      {/* ── Invoice feature ─────────────────── */}
      <section id="verktyg" className="px-6 lg:px-10 py-[72px] bg-[#F2F1F8]">
        <div className="max-w-[600px] mx-auto">
          <div className="w-full overflow-hidden mb-8" ref={(el) => {
            if (!el) return;
            const inner = el.querySelector<HTMLDivElement>('[data-scale-inner]');
            if (!inner) return;
            const fit = () => {
              const scale = el.offsetWidth / 860;
              inner.style.transform = `scale(${scale})`;
              inner.style.transformOrigin = 'top left';
              el.style.height = `${inner.offsetHeight * scale}px`;
            };
            fit();
            const ro = new ResizeObserver(fit);
            ro.observe(el);
          }}>
            <div data-scale-inner style={{ width: 860 }}>
              <div className="bg-white border border-[#ddd] rounded-[10px] overflow-hidden shadow-[0_2px_16px_rgba(0,0,0,0.06)]">
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#e8e8e8] bg-[#fafafa]">
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#534AB7] bg-[#534AB7] text-white whitespace-nowrap">Alla</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f5a623] inline-block" />Ej granskade</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e74c3c] inline-block" />Avvikelser</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#27ae60] inline-block" />Godkända</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#534AB7] inline-block" />Fakturerade</button>
                </div>

                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                      <th className="py-2.5 px-3.5 text-left w-8"><input type="checkbox" className="accent-[#534AB7] w-[13px] h-[13px]" readOnly /></th>
                      <th className="py-2.5 px-3.5 text-left font-semibold text-[11px] text-[#666] uppercase tracking-[0.05em] whitespace-nowrap">Faktura</th>
                      <th className="py-2.5 px-3.5 text-left font-semibold text-[11px] text-[#666] uppercase tracking-[0.05em] whitespace-nowrap">Fakturerat</th>
                      <th className="py-2.5 px-3.5 text-left font-semibold text-[11px] text-[#666] uppercase tracking-[0.05em] whitespace-nowrap">Arbetat</th>
                      <th className="py-2.5 px-3.5 text-left font-semibold text-[11px] text-[#666] uppercase tracking-[0.05em] whitespace-nowrap">Diff</th>
                      <th className="py-2.5 px-3.5 text-left font-semibold text-[11px] text-[#666] uppercase tracking-[0.05em] whitespace-nowrap">Belopp</th>
                      <th className="py-2.5 px-3.5 text-left font-semibold text-[11px] text-[#666] uppercase tracking-[0.05em] whitespace-nowrap">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { nr: "#3", fakt: "42 h", arb: "42 h", diff: "—", belopp: "—", ok: true, checked: false },
                      { nr: "#4", fakt: "36 h", arb: "42 h", diff: "−6 h", belopp: "−6 900 kr", ok: false, checked: true },
                      { nr: "#5", fakt: "38 h", arb: "38 h", diff: "—", belopp: "—", ok: true, checked: false },
                      { nr: "#6", fakt: "40 h", arb: "43.5 h", diff: "−3.5 h", belopp: "−4 025 kr", ok: false, checked: true },
                      { nr: "#7", fakt: "44 h", arb: "44 h", diff: "—", belopp: "—", ok: true, checked: false },
                    ].map((row, i) => (
                      <tr key={i} className={`border-b border-[#f0f0f0] last:border-b-0 hover:bg-[#faf9ff] ${row.ok ? "" : "bg-[#fff8f8] hover:bg-[#fff2f2]"}`}>
                        <td className="py-[11px] px-3.5"><input type="checkbox" className="accent-[#534AB7] w-[13px] h-[13px]" checked={row.checked} readOnly /></td>
                        <td className="py-[11px] px-3.5 font-semibold text-[#534AB7] whitespace-nowrap">{row.nr}</td>
                        <td className="py-[11px] px-3.5 text-[#1a1a1a] whitespace-nowrap">{row.fakt}</td>
                        <td className="py-[11px] px-3.5 text-[#1a1a1a] whitespace-nowrap">{row.arb}</td>
                        <td className={`py-[11px] px-3.5 whitespace-nowrap ${row.ok ? "text-[#999]" : "text-[#c0392b] font-semibold"}`}>{row.diff}</td>
                        <td className={`py-[11px] px-3.5 whitespace-nowrap ${row.ok ? "text-[#999]" : "text-[#c0392b] font-semibold"}`}>{row.belopp}</td>
                        <td className="py-[11px] px-3.5 whitespace-nowrap">
                          <span className={`inline-flex items-center text-[11px] font-medium px-2 py-[3px] rounded-full ${row.ok ? "bg-[#eaf5ea] text-[#2d7a2d]" : "bg-[#fdecea] text-[#c0392b]"}`}>
                            {row.ok ? "✓ OK" : "! Avvikelse"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="flex items-center justify-between px-4 py-3.5 bg-[#f7f6fe] border-t border-[#e0dff5]">
                  <div className="text-[13px] text-[#444]">Hittade <strong className="text-[#0f0f0f]">9,5 h</strong> som ger</div>
                  <div className="text-lg font-bold text-[#2d7a2d]">+10 925 kr</div>
                </div>
              </div>
            </div>
          </div>

          <Link to="/registrera" className="block w-full py-3.5 bg-[#534AB7] hover:bg-[#3C3489] text-white rounded-[10px] text-[15px] font-medium text-center mb-8 transition-colors">Skapa konto</Link>

          <p className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-[0.1em] mb-3.5">Fakturagranskning</p>
          <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.5px] mb-3 font-serif">Du har troligen pengar du inte fått</h2>
          <p className="text-[14px] text-[#444] leading-[1.7] mb-2">
            Konsulter missar i snitt 3–8% av fakturerbara timmar. Vi går igenom dina historiska fakturor och tidrapporter och identifierar utestående belopp — utan risk för dig.
          </p>
          <p className="text-xs leading-[1.6] text-inherit">Vi tar 25% av det vi hittar. Hittar vi ingenting kostar det dig ingenting.</p>
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────── */}
      <div className="mx-4 sm:mx-6 lg:mx-10 mb-[72px] rounded-xl bg-[#1a1545] px-6 lg:px-12 py-14 text-center">
        <h2 className="text-[28px] font-medium text-white mb-3">Redo att ta kontroll?</h2>
        <p className="text-base text-white/60 mb-7">Compcare är kostnadsfritt för konsulter. För alltid.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/registrera">
            <button className="w-full sm:w-auto px-8 py-3 bg-[#534AB7] hover:bg-[#3C3489] rounded-lg text-white text-[15px] font-medium transition-colors">Skapa konto</button>
          </Link>
          <Link to="/v1?start=1">
            <button className="w-full sm:w-auto px-7 py-3 bg-transparent border border-white/30 hover:bg-white/10 rounded-lg text-white/80 text-[15px] transition-colors">Gör löneanalysen</button>
          </Link>
        </div>
      </div>
    </div>
  );
}
