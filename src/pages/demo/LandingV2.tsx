import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/* ───────────────────── data ───────────────────── */
const NAV_LINKS = ["Verktyg", "Löneanalys", "Fakturagranskning", "Uppdragsprognos", "Priser", "Om oss"];
const TRUST_LOGOS = ["Capio", "Region Stockholm", "Aleris", "Praktikertjänst", "Sahlgrenska"];

const STATS = [
  { num: "616 kr/tim", label: "Leg. sjuksköterska i storstad", subtitle: "RAMAVTALSPRIS · ZON 1" },
  { num: "15–20%", label: "Enligt offentliga avtal", subtitle: "BRANSCHENS MARGINAL" },
  { num: "508 kr/tim", label: "Se din roll och zon →", subtitle: "ESTIMERAD KONSULTLÖN" },
];

const MODULES_ROW1 = [
  {
    title: "Verify — dokumentvalvet",
    desc: "Spara legitimationer, intyg och utbildningsbevis på ett säkert ställe. Dela tillgång med länk — aldrig mer bifogade filer till fem bolag.",
    tag: "Ingår gratis",
    tagColor: "purple" as const,
    iconBg: "#EEEDFE",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="3" width="12" height="14" rx="2" stroke="#3C3489" strokeWidth="1.2" />
        <line x1="7" y1="7" x2="13" y2="7" stroke="#3C3489" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7" y1="10" x2="13" y2="10" stroke="#3C3489" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7" y1="13" x2="11" y2="13" stroke="#3C3489" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Referensplattformen",
    desc: "Du bestämmer vem som ser dem och när. Referensgivare kan verifiera digitalt istället för att lämna samma uppgifter till flera bolag.",
    tag: "Ingår gratis",
    tagColor: "purple" as const,
    iconBg: "#EEEDFE",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="6" stroke="#3C3489" strokeWidth="1.2" />
        <path d="M10 7v3l2 2" stroke="#3C3489" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Löneanalys & löneassistent",
    desc: "Vet direkt om du är rätt betald. Löneassistenten ger konkreta förhandlingstips baserat på din specialitet, region och erfarenhet.",
    tag: "Insight — 149 kr/mån",
    tagColor: "amber" as const,
    iconBg: "#FAEEDA",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <path d="M4 14l4-4 3 3 5-6" stroke="#854F0B" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
];

const MODULES_ROW2 = [
  {
    title: "Fakturagranskning",
    desc: "AI granskar dina fakturor och tidrapporter. Vi hittar vad du missat och hjälper dig fakturera det. Vi får 25% av det vi hittar i provision. Hittar vi inget, betalar du inget.",
    tag: "Prestationsbaserat",
    tagColor: "green" as const,
    iconBg: "#EAF3DE",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="3" y="5" width="14" height="10" rx="2" stroke="#3B6D11" strokeWidth="1.2" />
        <line x1="7" y1="9" x2="13" y2="9" stroke="#3B6D11" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7" y1="12" x2="10" y2="12" stroke="#3B6D11" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Uppdragsprognos",
    desc: "Öka chanserna att få uppdragen du verkligen vill ha. Se prognoser utifrån uppdrag som publicerats historiskt i din region och specialitet. Vi har analyserat 5 års historik och över 30 000 bemanningsuppdrag. ",
    tag: "Beta",
    tagColor: "purple" as const,
    iconBg: "#EEEDFE",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="8" cy="8" r="4" stroke="#3C3489" strokeWidth="1.2" />
        <circle cx="14" cy="13" r="3" stroke="#3C3489" strokeWidth="1.2" />
        <line x1="11" y1="9" x2="12" y2="10" stroke="#3C3489" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
];

const STEPS = [
  { num: "1", title: "Skapa ditt konto", desc: "Logga in och ange din roll.\nFå tillgång till verktyg och insikter." },
  { num: "2", title: "Ladda upp dina dokument", desc: "Fakturor, tidrapporter, intyg och cv. Allt struktureras automatiskt." },
  { num: "3", title: "Få insikt och agera", desc: "Löneanalys, missad fakturering, förhandlingsstöd — direkt." },
  { num: "4", title: "Dela på dina villkor", desc: "Skicka en länk när du är redo. Aldrig mer bifogade dokument." },
];

const INVOICES = [
  { label: "Faktura #3", val: "42 h — OK", status: "ok" },
  { label: "Faktura #4", val: "6 h saknas", status: "miss" },
  { label: "Faktura #5", val: "38 h — OK", status: "ok" },
  { label: "Faktura #6", val: "3.5 h saknas", status: "miss" },
  { label: "Faktura #7", val: "44 h — OK", status: "ok" },
];

const PLANS = [
  {
    name: "Gratis",
    price: "0 kr",
    unit: " /mån",
    desc: "Grundverktygen utan kostnad — för alltid.",
    features: ["Dokumentvalvet", "Referensplattformen", "En kostnadsfri löneanalys", "Bemanningsbolagens pris mot region"],
    cta: "Kom igång",
    featured: false,
  },
  {
    name: "Insight",
    price: "149 kr",
    unit: " /mån",
    desc: "Full löneanalys, förhandlingsstöd och uppdragsprognos.",
    features: ["Allt i Gratis", "Detaljerad löneanalys", "Löneassistent med AI", "Uppdragsprognos", "Regional och specialitetsjämförelse"],
    cta: "Välj Insight",
    featured: true,
    badge: "Mest populär",
  },
  {
    name: "Fakturagranskning",
    price: "0 kr",
    unit: " förhandsavgift",
    desc: "Vi tar 25% av vad vi hittar. Inget fynd — ingen kostnad.",
    features: ["AI-granskning av fakturor", "Tidrapportanalys", "Automatisk ny faktura", "Uppföljning mot uppdragsgivare"],
    cta: "Skicka in fakturor",
    featured: false,
  },
];

const TESTIMONIALS = [
  { quote: "Jag hittade 11 400 kr jag aldrig fakturerat. Pengarna var på kontot inom en vecka.", initials: "MH", name: "Maria H.", role: "Specialistsjuksköterska, Stockholm" },
  { quote: "Äntligen slipper jag skicka samma intyg till varje nytt bemanningsbolag. Det tar fem sekunder nu.", initials: "JA", name: "Jonas A.", role: "Distriktsläkare, Göteborg" },
  { quote: "Löneassistenten visade mig att jag var 18% under marknadssnitt. Jag förhandlade upp det på en vecka.", initials: "CL", name: "Cecilia L.", role: "Intensivvårdssjuksköterska, Malmö" },
];

/* ───────────────────── helpers ─────────────────── */
const TAG_COLORS: Record<string, string> = {
  purple: "bg-[#EEEDFE] text-[#3C3489] border-[rgba(83,74,183,0.2)]",
  amber: "bg-[#FAEEDA] text-[#854F0B] border-[rgba(186,117,23,0.2)]",
  blue: "bg-[#E6F1FB] text-[#185FA5] border-[rgba(24,95,165,0.2)]",
  green: "bg-[#EAF3DE] text-[#3B6D11] border-[rgba(59,109,17,0.2)]",
  muted: "bg-[#F2F1F8] text-muted-foreground border-border/40",
};
/* ───────────────────── Flow arrow divider ────── */
function FlowArrow() {
  return (
    <div className="h-7 flex items-center justify-center relative">
      <div className="absolute left-1/2 top-0 bottom-0 w-px bg-white/15" />
      <div className="w-[22px] h-[22px] rounded-full bg-white/[0.07] border border-white/15 flex items-center justify-center text-[10px] text-white/40 z-10 relative">
        ↓
      </div>
    </div>
  );
}

/* ───────────────────── component ──────────────── */
export default function LandingV2() {
  const [heroEmail, setHeroEmail] = useState("");

  return (
    <div className="w-full bg-[#F2F1F8] text-foreground font-sans">
      {/* ── Nav ─────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 lg:px-10 h-[60px] bg-white border-b border-border/40">
        <div className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <span className="w-2 h-2 rounded-full bg-[#534AB7]" />
          CompCare
        </div>
        <div className="hidden md:flex gap-6">
          {NAV_LINKS.map((l) => (
            <span key={l} className="text-sm text-muted-foreground cursor-default">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/logga-in">
            <button className="text-sm px-4 py-2 border border-border rounded-lg bg-transparent text-foreground">Logga in</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="relative min-h-[480px] flex flex-col lg:flex-row items-center overflow-hidden">
        {/* bg layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070]" />
        <div className="absolute inset-0 bg-[rgba(5,4,20,0.15)]" />
        <div
          className="absolute pointer-events-none"
          style={{
            top: '-100px', right: '-100px',
            width: '1000px', height: '900px',
            zIndex: 1,
            background: 'radial-gradient(ellipse at 75% 10%, rgba(110,95,230,0.55) 0%, rgba(90,78,210,0.25) 25%, rgba(70,60,190,0.08) 50%, transparent 70%)',
          }}
        />
        <div
          className="absolute top-0 right-0 pointer-events-none"
          style={{
            width: '520px', height: '600px',
            zIndex: 1,
            background: 'radial-gradient(ellipse at 90% 15%, rgba(140,125,245,0.3) 0%, rgba(110,95,220,0.12) 40%, transparent 65%)',
          }}
        />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)",
          }}
        />

        {/* content — left */}
        <div className="relative z-10 px-6 lg:px-10 pt-16 pb-8 lg:py-20 max-w-[620px]">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#AFA9EC] bg-[rgba(83,74,183,0.2)] border border-[rgba(127,119,221,0.35)] rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#AFA9EC" /></svg>
            Byggt för läkare &amp; sjuksköterskor
          </div>
          <h1 className="text-[clamp(2rem,5vw,42px)] font-medium leading-[1.18] text-white mb-4 tracking-tight">
            Dina <span className="text-[#AFA9EC]">data.</span><br />Din karriär.<br />Dina villkor.
          </h1>
          <p className="text-base text-white/[0.68] leading-relaxed mb-6 max-w-[460px]">
            CompCare samlar alla verktyg du behöver som konsult inom vården — löneanalys, verifiering, fakturagranskning och referenshantering i en plattform du äger.
          </p>

          {/* Email CTA */}
          <div className="space-y-3">
            <p className="text-[13px] text-white/50 italic">Se vad din roll ger i din zon — gratis</p>
            <div className="flex gap-2">
              <input
                type="email"
                value={heroEmail}
                onChange={(e) => setHeroEmail(e.target.value)}
                placeholder="din@email.se"
                className="flex-1 px-4 py-3 bg-white/[0.08] border border-white/20 rounded-lg text-white text-sm placeholder:text-white/35 outline-none focus:border-white/40 transition-colors"
              />
              <Link to="/registrera">
                <button className="px-6 py-3 bg-[#534AB7] rounded-lg text-white text-[15px] font-medium whitespace-nowrap">
                  Visa mig →
                </button>
              </Link>
            </div>
            <p className="text-[11px] text-white/30">Inga kreditkort. Kom igång på 30 sekunder.</p>
          </div>
        </div>

        {/* Flow cards — shared layout for mobile & desktop */}
        <div className="relative z-10 flex flex-col gap-0 w-full max-w-[260px] flex-shrink-0 mx-auto py-4 lg:py-20 px-6 lg:px-0">
          {/* Card 1 */}
          <div className="bg-white/[0.07] border border-white/[0.13] rounded-[14px] px-5 py-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">RAMAVTALSPRIS · ZON 1 · SKR 2026</div>
            <div className="text-[26px] font-medium text-white mb-0.5">616 <span className="text-[16px] text-white/50">kr/tim</span></div>
            <div className="text-[12px] text-white/50 leading-snug">Leg. sjuksköterska i storstad</div>
          </div>
          <FlowArrow />
          {/* Card 2 */}
          <div className="bg-white/[0.07] border border-white/[0.13] rounded-[14px] px-5 py-4">
            <div className="text-[10px] text-white/40 uppercase tracking-wider mb-1">BRANSCHENS GENOMSNITTSMARGINAL</div>
            <div className="text-[26px] font-medium text-white mb-0.5">15–20%</div>
            <span className="text-red-400/70 text-[11px] font-semibold">−92–123 kr/tim</span>
            <div className="text-[12px] text-white/50 leading-snug mt-1">Enligt offentliga avtal och branschdata</div>
          </div>
          <FlowArrow />
          {/* Card 3 — highlighted */}
          <div className="bg-[rgba(83,74,183,0.25)] border-2 border-[rgba(175,169,236,0.4)] rounded-[14px] px-5 py-4">
            <div className="text-[10px] text-[rgba(175,169,236,0.8)] uppercase tracking-wider mb-1">ESTIMERAD KONSULTLÖN</div>
            <div className="text-[30px] font-medium text-white mb-0.5">508 <span className="text-[16px] text-white/50">kr/tim</span></div>
            <div className="text-[12px] text-[rgba(175,169,236,0.7)] leading-snug">Se exakt vad du kan förvänta dig →</div>
          </div>
        </div>
      </section>

      {/* ── Trust bar ───────────────────────── */}
      {/* Desktop */}
      <div className="hidden md:flex items-center gap-8 px-6 lg:px-10 py-5 bg-white border-b border-border/40">
        <span className="text-xs text-muted-foreground uppercase tracking-widest whitespace-nowrap">Används av konsulter från</span>
        <div className="flex gap-4 flex-wrap">
          {TRUST_LOGOS.map((t) => (
            <span key={t} className="text-[13px] font-medium text-muted-foreground px-3.5 py-1.5 border border-border/40 rounded-lg bg-white">{t}</span>
          ))}
        </div>
      </div>
      {/* Mobile ticker */}
      <div className="md:hidden bg-white border-b border-border/40 py-4 overflow-hidden">
        <span className="block text-[10px] text-muted-foreground uppercase tracking-widest text-center mb-2.5 px-4">Används av konsulter från</span>
        <div className="relative overflow-hidden">
          <div className="flex gap-3 animate-marquee w-max">
            {[...TRUST_LOGOS, ...TRUST_LOGOS].map((t, i) => (
              <span key={`${t}-${i}`} className="text-[12px] font-medium text-muted-foreground px-3 py-1 border border-border/40 rounded-lg bg-white whitespace-nowrap">{t}</span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Modules ─────────────────────────── */}
      <section className="px-6 lg:px-14 py-20 bg-[#F2F1F8]">
        <div className="mb-[52px]">
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#534AB7] bg-[#EEEDFE] border border-[rgba(83,74,183,0.2)] rounded-full px-3.5 py-1 mb-4">
            Plattformen
          </span>
          <h2 className="font-serif text-[34px] font-bold leading-[1.15] tracking-tight text-foreground mb-2.5">
            Fem verktyg som förenklar din karriär
          </h2>
          <p className="text-[15px] text-muted-foreground leading-[1.65]">
            Allt du behöver som konsult inom vården — samlat på ett ställe som du kontrollerar.
          </p>
        </div>

        {/* Row 1 — 3 cards */}
        <div className="grid md:grid-cols-3 gap-4 mb-4">
          {MODULES_ROW1.map((m) => (
            <div key={m.title} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[18px] p-7 flex flex-col hover:border-[rgba(83,74,183,0.25)] hover:shadow-[0_4px_24px_rgba(83,74,183,0.08)] transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 shrink-0" style={{ background: m.iconBg }}>
                {m.icon}
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2 leading-snug">{m.title}</h3>
              <p className="text-[13px] text-foreground leading-[1.7] flex-1 mb-[22px]">{m.desc}</p>
              <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full border w-fit ${TAG_COLORS[m.tagColor]}`}>{m.tag}</span>
            </div>
          ))}
        </div>

        {/* Row 2 — 2 cards, 2/3 width */}
        <div className="grid md:grid-cols-2 gap-4 md:max-w-[calc(66.66%-8px)]">
          {MODULES_ROW2.map((m) => (
            <div key={m.title} className="bg-white border border-[rgba(0,0,0,0.08)] rounded-[18px] p-7 flex flex-col hover:border-[rgba(83,74,183,0.25)] hover:shadow-[0_4px_24px_rgba(83,74,183,0.08)] transition-all">
              <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-5 shrink-0" style={{ background: m.iconBg }}>
                {m.icon}
              </div>
              <h3 className="text-base font-semibold text-foreground mb-2 leading-snug">{m.title}</h3>
              <p className="text-[13px] text-foreground leading-[1.7] flex-1 mb-[22px]">{m.desc}</p>
              <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full border w-fit ${TAG_COLORS[m.tagColor]}`}>{m.tag}</span>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-border/40 mx-6 lg:mx-10" />

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
      <section className="px-6 lg:px-10 py-[72px] bg-[#F2F1F8]">
        <div className="max-w-[600px] mx-auto">
          {/* Scaled table */}
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
                {/* Filter bar */}
                <div className="flex items-center gap-1.5 px-3.5 py-2.5 border-b border-[#e8e8e8] bg-[#fafafa]">
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#534AB7] bg-[#534AB7] text-white whitespace-nowrap">Alla</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f5a623] inline-block" />Ej granskade</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e74c3c] inline-block" />Avvikelser</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#27ae60] inline-block" />Godkända</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#534AB7] inline-block" />Fakturerade</button>
                </div>

                {/* Table */}
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

                {/* Summary bar */}
                <div className="flex items-center justify-between px-4 py-3.5 bg-[#f7f6fe] border-t border-[#e0dff5]">
                  <div className="text-[13px] text-[#444]">Hittade <strong className="text-[#0f0f0f]">9,5 h</strong> som ger</div>
                  <div className="text-lg font-bold text-[#2d7a2d]">+10 925 kr</div>
                </div>
              </div>
            </div>
          </div>

          {/* CTA */}
          <a href="#" className="block w-full py-3.5 bg-[#534AB7] text-white rounded-[10px] text-[15px] font-medium text-center mb-8">Skicka in dina fakturor</a>

          {/* Copy */}
          <p className="text-[11px] font-semibold text-[#534AB7] uppercase tracking-[0.1em] mb-3.5">Fakturagranskning</p>
          <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.5px] mb-3 font-serif">Du har troligen pengar du inte fått</h2>
          <p className="text-[14px] text-[#444] leading-[1.7] mb-2">
            Konsulter missar i snitt 3–8% av fakturerbara timmar. Vi går igenom dina historiska fakturor och tidrapporter och identifierar utestående belopp — utan risk för dig.
          </p>
          <p className="text-xs leading-[1.6] text-inherit">Vi tar 25% av det vi hittar. Hittar vi ingenting kostar det dig ingenting.</p>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────── */}
      <section className="px-6 lg:px-10 py-[72px] bg-[#ECEAF5]">
        <p className="text-xs font-medium text-[#534AB7] uppercase tracking-widest mb-2.5">Priser</p>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight mb-3">Transparent och enkelt</h2>
        <p className="text-base text-muted-foreground leading-relaxed max-w-[520px] mb-10">Börja gratis. Uppgradera när det ger värde.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div key={p.name} className={`bg-white border rounded-xl p-7 ${p.featured ? "border-2 border-[#534AB7]" : "border-border/40"}`}>
              {p.badge && <span className="inline-block text-[11px] font-medium bg-[#EEEDFE] text-[#3C3489] px-2.5 py-0.5 rounded-full mb-3">{p.badge}</span>}
              <h3 className="text-base font-medium mb-1">{p.name}</h3>
              <div className="text-[28px] font-medium my-3">{p.price}<span className="text-sm font-normal text-muted-foreground">{p.unit}</span></div>
              <p className="text-[13px] text-muted-foreground leading-snug mb-5">{p.desc}</p>
              <ul className="flex flex-col gap-2 mb-6">
                {p.features.map((f) => (
                  <li key={f} className="text-[13px] text-muted-foreground flex items-center gap-2">
                    <span className="w-3.5 h-3.5 rounded-full bg-[#EEEDFE] shrink-0" />
                    {f}
                  </li>
                ))}
              </ul>
              <button className={`w-full py-2.5 rounded-lg text-sm font-medium ${p.featured ? "bg-[#534AB7] text-white" : "bg-transparent border border-border text-foreground"}`}>
                {p.cta}
              </button>
            </div>
          ))}
        </div>
      </section>

      <div className="h-px bg-border/40 mx-6 lg:mx-10" />

      {/* ── Testimonials ────────────────────── */}
      <section className="px-6 lg:px-10 py-[72px] bg-white">
        <p className="text-xs font-medium text-[#534AB7] uppercase tracking-widest mb-2.5">Vad konsulter säger</p>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight mb-10">Byggt med, och för, er</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white border border-border/40 rounded-xl p-6">
              <div className="text-[13px] text-[#EF9F27] mb-3">★★★★★</div>
              <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#EEEDFE] flex items-center justify-center text-[13px] font-medium text-[#3C3489]">{t.initials}</div>
                <div>
                  <div className="text-[13px] font-medium">{t.name}</div>
                  <div className="text-xs text-muted-foreground">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA Banner ──────────────────────── */}
      <div className="mx-6 lg:mx-10 mb-[72px] rounded-xl bg-[#1a1545] px-6 lg:px-12 py-14 text-center">
        <h2 className="text-[28px] font-medium text-white mb-3">Redo att ta kontroll?</h2>
        <p className="text-base text-white/60 mb-7">Gratis konto. Inga kreditkort. Kom igång på 30 sekunder.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/registrera">
            <button className="px-8 py-3 bg-[#534AB7] rounded-lg text-white text-[15px] font-medium">Skapa konto gratis</button>
          </Link>
          <button className="px-7 py-3 bg-transparent border border-white/30 rounded-lg text-white/80 text-[15px]">Boka en demo</button>
        </div>
      </div>

      {/* ── Footer ──────────────────────────── */}
      <footer className="px-6 lg:px-10 pt-10 pb-24 border-t border-border/40 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-lg font-medium tracking-tight mb-2.5">
              <span className="w-2 h-2 rounded-full bg-[#534AB7]" />
              CompCare
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
              Transparent marknadsdata och smarta verktyg för Sveriges läkare och sjuksköterskor.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Verktyg</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <span>Verify</span><span>Löneanalys</span><span>Fakturagranskning</span><span>Uppdragsprognos</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Företag</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <span>Om CompCare</span>
              <Link to="/integritetspolicy" className="hover:text-foreground">Integritetspolicy</Link>
              <span>Villkor</span><span>Kontakt</span>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Gemenskap</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <span>Facebook-grupp</span><span>Nyhetsbrev</span><span>API för bolag</span>
            </div>
          </div>
        </div>
        <div className="border-t border-border/40 pt-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
          <p>© 2026 CompCare — Piemonte Invest AB</p>
          <p>GDPR-kompatibel · Datan tillhör dig</p>
        </div>
      </footer>
    </div>
  );
}
