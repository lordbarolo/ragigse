import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import HeroRateLookup from "@/components/landing/HeroRateLookup";

/* ───────────────────── data ───────────────────── */
const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Verktyg", href: "#verktyg" },
  { label: "Löneanalys", href: "/", external: true },
  { label: "Fakturagranskning", href: "/consultant/fakturakontroll", external: true },
  { label: "Priser", href: "#priser" },
  { label: "FAQ", href: "/vanliga-fragor", external: true },
];
const TRUST_LOGOS = ["Capio", "Region Stockholm", "Aleris", "Praktikertjänst", "Sahlgrenska"];

const STATS = [
  { num: "616 kr/tim", label: "Leg. sjuksköterska i storstad", subtitle: "RAMAVTALSPRIS · ZON 1" },
  { num: "15–20%", label: "Enligt offentliga avtal", subtitle: "BRANSCHENS MARGINAL" },
  { num: "508 kr/tim", label: "Se din roll och zon →", subtitle: "ESTIMERAD KONSULTLÖN" },
];

const MODULES_ROW1 = [
  {
    title: "Verify — dokumentvalvet",
    desc: "Spara legitimationer, intyg och utbildningsbevis på ett säkert ställe. Dela tillgång med länk — aldrig mer bifogade filer som du aldrig vet vart de tar vägen.",
    tag: "Ingår gratis",
    tagColor: "purple" as const,
    iconBg: "#E0E7FF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <rect x="4" y="3" width="12" height="14" rx="2" stroke="#3730A3" strokeWidth="1.2" />
        <line x1="7" y1="7" x2="13" y2="7" stroke="#3730A3" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7" y1="10" x2="13" y2="10" stroke="#3730A3" strokeWidth="1.2" strokeLinecap="round" />
        <line x1="7" y1="13" x2="11" y2="13" stroke="#3730A3" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Referensplattformen",
    desc: "Du bestämmer vem som får tillgång och när. Referensgivare kan verifiera digitalt istället för att lämna samma uppgifter till flera bolag.",
    tag: "Kommer snart",
    tagColor: "muted" as const,
    iconBg: "#E0E7FF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="6" stroke="#3730A3" strokeWidth="1.2" />
        <path d="M10 7v3l2 2" stroke="#3730A3" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Löneanalys & löneassistent",
    desc: "Se vad regionen betalar för din tid och vad bemanningsföretagen kan betala utifrån marknadens genomsnittliga marginaler. Med full transparens kring villkor vågar fler testa konsultlivet.",
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
    iconBg: "#E0E7FF",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="8" cy="8" r="4" stroke="#3730A3" strokeWidth="1.2" />
        <circle cx="14" cy="13" r="3" stroke="#3730A3" strokeWidth="1.2" />
        <line x1="11" y1="9" x2="12" y2="10" stroke="#3730A3" strokeWidth="1.2" strokeLinecap="round" />
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
    tag: "GR",
    name: "Gratis",
    tagline: "Alltid kostnadsfri",
    price: "0 kr",
    unit: " /mån",
    headline: "Grunden — för alltid",
    headlineColor: "text-[#4F46E5]",
    subheadline: "Inga kreditkort",
    desc: "Dokumentvalvet, referensplattformen och en kostnadsfri löneanalys. Få full koll utan kostnad — alltid.",
    features: ["Dokumentvalvet", "Referensplattformen", "En kostnadsfri löneanalys", "Bemanningsbolagens pris mot region", "Ingen tidsbegränsning"],
    cta: "Kom igång",
    href: "/registrera",
    bg: "bg-[#EFEDFA]",
    border: "border-[#4F46E5]/20",
    iconBg: "bg-[#4F46E5]/10 text-[#3730A3]",
    btnClass: "bg-transparent border border-[#4F46E5]/40 text-[#3730A3] hover:bg-[#4F46E5]/5",
    badge: null,
    featured: false,
  },
  {
    tag: "IN",
    name: "Insight",
    tagline: "Sätt din egen kurs",
    price: "149 kr",
    unit: " /mån",
    headline: "Hela analysen",
    headlineColor: "text-[#0EA5A4]",
    subheadline: "Aligned med ditt nästa uppdrag",
    desc: "Detaljerad löneanalys, AI-driven förhandlingsstöd och uppdragsprognos. Förstå exakt var du står — och var du borde stå.",
    features: ["Allt i Gratis", "Detaljerad löneanalys", "Löneassistent med AI", "Uppdragsprognos", "Regional & specialitetsjämförelse"],
    cta: "Välj Insight",
    href: "/registrera?plan=insight",
    bg: "bg-[#E6F7F6]",
    border: "border-[#0EA5A4]/30",
    iconBg: "bg-[#0EA5A4]/10 text-[#0EA5A4]",
    btnClass: "bg-[#0EA5A4] text-white hover:bg-[#0E9090]",
    badge: "Mest populär",
    featured: true,
  },
  {
    tag: "FK",
    name: "Fakturagranskning",
    tagline: "Växande affärsmodell",
    price: "0 kr",
    unit: " förhandsavgift",
    headline: "Provisionsbaserad",
    headlineColor: "text-[#EA6A1F]",
    subheadline: "Framgångsbaserat partnerskap",
    desc: "Vi granskar dina fakturor och driver in det du missat. Hittar vi inget kostar det dig ingenting.",
    features: ["AI-granskning av fakturor", "Tidrapportanalys", "Automatisk ny faktura", "Uppföljning mot uppdragsgivare", "25% av återvunnet belopp"],
    cta: "Skicka in fakturor",
    href: "/consultant/fakturakontroll",
    bg: "bg-[#FCEFE2]",
    border: "border-[#EA6A1F]/30",
    iconBg: "bg-[#EA6A1F]/10 text-[#EA6A1F]",
    btnClass: "bg-transparent border border-[#EA6A1F]/40 text-[#EA6A1F] hover:bg-[#EA6A1F]/5",
    badge: null,
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
  purple: "bg-[#E0E7FF] text-[#3730A3] border-[rgba(83,74,183,0.2)]",
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
  return (
    <div className="w-full bg-[#F2F1F8] text-foreground font-sans">
      {/* ── Nav ─────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 lg:px-10 h-[60px] bg-white border-b border-border/40">
        <div className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
          CompCare
        </div>
        <div className="hidden md:flex gap-6">
          {NAV_LINKS.map((l) =>
            l.external ? (
              <Link key={l.label} to={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </Link>
            ) : (
              <a key={l.label} href={l.href} className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                {l.label}
              </a>
            )
          )}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/logga-in">
            <button className="text-sm px-4 py-2 border border-border rounded-lg bg-transparent text-foreground">Logga in</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="relative min-h-[480px] flex flex-col md:flex-row items-start overflow-hidden px-4 sm:px-6">
        {/* bg layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-40% to-[#2a2070]" />
        
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
        <div className="relative z-10 px-1 sm:px-2 md:px-10 xl:px-16 pt-16 pb-8 md:py-24 max-w-[680px] flex-1">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#AFA9EC] bg-[rgba(83,74,183,0.2)] border border-[rgba(127,119,221,0.35)] rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#AFA9EC" /></svg>
            För läkare &amp; sjuksköterskor
          </div>
          <h1 className="text-[clamp(2.5rem,6vw,64px)] font-bold leading-[1.1] text-white mb-6 tracking-tight">
            Din <span className="text-[#AFA9EC]">tid.</span><br />Din karriär.<br />Dina villkor.
          </h1>
          <p className="text-lg text-white/[0.78] leading-relaxed mb-6 max-w-[520px]">
            Rätt ersättning, rätt kontrakt och rätt fakturering— Ai optimerad för vårdbemanning
          </p>
        </div>

        {/* Right column — rate lookup box from main landing */}
        <div className="relative z-10 w-full md:w-auto md:flex-1 md:max-w-[560px] px-1 sm:px-2 md:px-10 xl:px-16 pt-4 pb-16 md:py-24">
          <HeroRateLookup />
          <div className="mt-4 flex justify-center">
            <Link to="/registrera">
              <button className="px-6 py-3 bg-[#4F46E5] hover:bg-[#5e54c8] rounded-lg text-white text-[15px] font-medium whitespace-nowrap min-h-[44px]">
                Har du rätt lön? →
              </button>
            </Link>
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
          <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#4F46E5] bg-[#E0E7FF] border border-[rgba(83,74,183,0.2)] rounded-full px-3.5 py-1 mb-4">
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
        <p className="text-xs font-medium text-[#4F46E5] uppercase tracking-widest mb-2.5">Så funkar det</p>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight mb-10">Fyra steg till full kontroll</h2>
        <div className="flex flex-col md:flex-row gap-0 relative">
          <div className="hidden md:block absolute top-7 left-7 right-7 h-px bg-border/40" />
          {STEPS.map((s) => (
            <div key={s.num} className="flex-1 text-center relative z-10 px-4 mb-8 md:mb-0">
              <div className="w-14 h-14 rounded-full bg-white border border-border/60 flex items-center justify-center text-[15px] font-medium text-[#4F46E5] mx-auto mb-4">
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
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#4F46E5] bg-[#4F46E5] text-white whitespace-nowrap">Alla</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#f5a623] inline-block" />Ej granskade</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#e74c3c] inline-block" />Avvikelser</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#27ae60] inline-block" />Godkända</button>
                  <button className="text-xs px-2.5 py-1 rounded-[5px] border border-[#ddd] bg-white text-[#444] whitespace-nowrap flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#4F46E5] inline-block" />Fakturerade</button>
                </div>

                {/* Table */}
                <table className="w-full border-collapse text-[13px]">
                  <thead>
                    <tr className="bg-[#f5f5f5] border-b border-[#e0e0e0]">
                      <th className="py-2.5 px-3.5 text-left w-8"><input type="checkbox" className="accent-[#4F46E5] w-[13px] h-[13px]" readOnly /></th>
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
                        <td className="py-[11px] px-3.5"><input type="checkbox" className="accent-[#4F46E5] w-[13px] h-[13px]" checked={row.checked} readOnly /></td>
                        <td className="py-[11px] px-3.5 font-semibold text-[#4F46E5] whitespace-nowrap">{row.nr}</td>
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
          <Link to="/registrera" className="block w-full py-3.5 bg-[#4F46E5] hover:bg-[#5e54c8] text-white rounded-[10px] text-[15px] font-medium text-center mb-8 transition-colors">Skapa konto</Link>

          {/* Copy */}
          <p className="text-[11px] font-semibold text-[#4F46E5] uppercase tracking-[0.1em] mb-3.5">Fakturagranskning</p>
          <h2 className="text-[26px] font-bold leading-[1.2] tracking-[-0.5px] mb-3 font-serif">Du har troligen pengar du inte fått</h2>
          <p className="text-[14px] text-[#444] leading-[1.7] mb-2">
            Konsulter missar i snitt 3–8% av fakturerbara timmar. Vi går igenom dina historiska fakturor och tidrapporter och identifierar utestående belopp — utan risk för dig.
          </p>
          <p className="text-xs leading-[1.6] text-inherit">Vi tar 25% av det vi hittar. Hittar vi ingenting kostar det dig ingenting.</p>
        </div>
      </section>

      {/* ── Pricing ─────────────────────────── */}
      <section id="priser" className="px-6 lg:px-10 py-[88px] bg-white">
        <div className="text-center max-w-[680px] mx-auto mb-4">
          <span className="inline-flex items-center gap-1.5 text-[12px] font-medium text-[#4F46E5] bg-[#E0E7FF] px-3 py-1 rounded-full mb-5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#4F46E5]" />
            Outcome as a Service
          </span>
          <h2 className="text-[32px] md:text-[40px] font-bold leading-[1.15] tracking-tight mb-4 font-serif">
            Inga plattformsavgifter. <span className="text-[#4F46E5]">Betala för värde.</span>
          </h2>
          <p className="text-[15px] text-[#555] leading-relaxed max-w-[560px] mx-auto">
            Till skillnad från traditionella lösningar med dyra licenser och dolda avgifter binder vi vår framgång vid din. Inga månadsabonnemang du inte använder. Ingen avgift per användare.
          </p>
          <div className="inline-flex items-center gap-3 mt-6 px-4 py-2 rounded-full bg-[#F5F4FA] text-[13px]">
            <span className="line-through text-muted-foreground">Traditionellt: 1 200 kr/mån</span>
            <span className="font-semibold text-[#4F46E5]">CompCare: 0 kr i grundavgift</span>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-4 mt-12 max-w-6xl mx-auto">
          {PLANS.map((p) => (
            <div
              key={p.name}
              className={`relative ${p.bg} border ${p.border} rounded-[20px] p-7 flex flex-col ${p.featured ? "ring-2 ring-[#0EA5A4]/40 shadow-[0_8px_30px_rgba(14,165,164,0.12)]" : ""}`}
            >
              {p.badge && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-[#0EA5A4] text-white text-[11px] font-semibold px-3 py-1 rounded-full">
                  {p.badge}
                </div>
              )}

              <div className="flex items-center gap-2.5 mb-3">
                <div className={`w-10 h-10 rounded-xl ${p.iconBg} flex items-center justify-center text-[11px] font-bold tracking-wide`}>
                  {p.tag}
                </div>
                <div>
                  <h3 className="text-[20px] font-bold leading-tight">{p.name}</h3>
                  <p className="text-[12px] text-muted-foreground">{p.tagline}</p>
                </div>
              </div>

              <h4 className={`text-[22px] font-bold mt-3 mb-1 ${p.headlineColor}`}>{p.headline}</h4>
              <p className="text-[13px] text-muted-foreground font-medium mb-4">{p.subheadline}</p>

              <p className="text-[13px] text-[#444] leading-relaxed mb-5">{p.desc}</p>

              <ul className="flex flex-col gap-2.5 mb-7 flex-1">
                {p.features.map((f) => (
                  <li key={f} className="text-[13px] text-[#333] flex items-start gap-2">
                    <span className={`mt-0.5 w-4 h-4 rounded-full ${p.iconBg} flex items-center justify-center shrink-0`}>
                      <svg className="w-2.5 h-2.5" viewBox="0 0 12 12" fill="none">
                        <path d="M2.5 6L5 8.5L9.5 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                      </svg>
                    </span>
                    {f}
                  </li>
                ))}
              </ul>

              <Link
                to={p.href}
                className={`w-full py-3 rounded-xl text-[14px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${p.btnClass}`}
              >
                {p.cta}
                <svg className="w-3.5 h-3.5" viewBox="0 0 14 14" fill="none">
                  <path d="M2 7H12M12 7L7.5 2.5M12 7L7.5 11.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </Link>
            </div>
          ))}
        </div>

        <p className="text-center text-[13px] text-muted-foreground mt-10">
          Osäker på vilken modell som passar?{" "}
          <Link to="/consultant/forhandla" className="text-[#4F46E5] font-medium underline-offset-2 hover:underline">Chatta med vår AI</Link>
        </p>
      </section>

      <div className="h-px bg-border/40 mx-6 lg:mx-10" />

      {/* ── Testimonials ────────────────────── */}
      <section className="px-6 lg:px-10 py-[72px] bg-white">
        <p className="text-xs font-medium text-[#4F46E5] uppercase tracking-widest mb-2.5">Vad konsulter säger</p>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight mb-10">Byggt med, och för, er</h2>
        <div className="grid md:grid-cols-3 gap-4">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="bg-white border border-border/40 rounded-xl p-6">
              <div className="text-[13px] text-[#EF9F27] mb-3">★★★★★</div>
              <p className="text-sm text-muted-foreground leading-relaxed italic mb-4">"{t.quote}"</p>
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-full bg-[#E0E7FF] flex items-center justify-center text-[13px] font-medium text-[#3730A3]">{t.initials}</div>
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
      <div className="mx-4 sm:mx-6 lg:mx-10 mb-[72px] rounded-xl bg-[#1a1545] px-6 lg:px-12 py-14 text-center">
        <h2 className="text-[28px] font-medium text-white mb-3">Redo att ta kontroll?</h2>
        <p className="text-base text-white/60 mb-7">Gratis konto. Inga kreditkort. Kom igång på 30 sekunder.</p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link to="/registrera">
            <button className="w-full sm:w-auto px-8 py-3 bg-[#4F46E5] hover:bg-[#5e54c8] rounded-lg text-white text-[15px] font-medium transition-colors">Skapa konto gratis</button>
          </Link>
          <a href="mailto:hej@compcare.se?subject=Boka%20demo%20av%20CompCare">
            <button className="w-full sm:w-auto px-7 py-3 bg-transparent border border-white/30 hover:bg-white/10 rounded-lg text-white/80 text-[15px] transition-colors">Boka en demo</button>
          </a>
        </div>
      </div>

      {/* ── Footer ──────────────────────────── */}
      <footer className="px-6 lg:px-10 pt-10 pb-24 border-t border-border/40 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-lg font-medium tracking-tight mb-2.5">
              <span className="w-2 h-2 rounded-full bg-[#4F46E5]" />
              CompCare
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
              Transparent marknadsdata och smarta verktyg för Sveriges läkare och sjuksköterskor.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Verktyg</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <Link to="/verify-info" className="hover:text-foreground transition-colors">Verify</Link>
              <Link to="/" className="hover:text-foreground transition-colors">Löneanalys</Link>
              <Link to="/consultant/fakturakontroll" className="hover:text-foreground transition-colors">Fakturagranskning</Link>
              <Link to="/consultant/forhandla" className="hover:text-foreground transition-colors">Löneassistent</Link>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Företag</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <Link to="/vanliga-fragor" className="hover:text-foreground transition-colors">FAQ</Link>
              <Link to="/integritetspolicy" className="hover:text-foreground transition-colors">Integritetspolicy</Link>
              <a href="mailto:hej@compcare.se" className="hover:text-foreground transition-colors">Kontakt</a>
            </div>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">För bemanningsföretag</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <Link to="/for-bemanningsforetag" className="hover:text-foreground transition-colors">Översikt</Link>
              <Link to="/registrera/bemanning" className="hover:text-foreground transition-colors">Skapa byråkonto</Link>
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
