import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";

/* ───────────────────── data ───────────────────── */
const TRUST_LOGOS = ["Capio", "Region Stockholm", "Aleris", "Praktikertjänst", "Sahlgrenska"];

const STATS = [
  { num: "616kr/timme", label: "Vad regionen betalar i storstad", subtitle: "Leg sjuksköterska i zon 1" },
  { num: "15-20%", label: "Branschens vanliga marginaler", subtitle: "Andel till bemanningsföretag" },
  { num: "508kr/timme", label: "Se uträkningen för din roll och ort", subtitle: "KVAR TILL KONSULT MED FÖRETAG" },
];

const MODULES_ROW1 = [
  {
    title: "Verify — dokumentvalvet",
    desc: "Spara legitimationer, intyg och utbildningsbevis på ett säkert ställe. Dela med BankID-länk — aldrig mer bifogade filer till fem bolag.",
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
    desc: "Full kontroll över dina referenser. Du bestämmer vem som ser dem och när — aldrig automatiskt synliga för uppdragsgivare.",
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
    desc: "AI granskar fakturor och tidrapporter mot utfört arbete. Vi hittar vad du missat och hjälper dig fakturera det. Vi tar 25% av det vi hittar.",
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
    title: "Uppdragsradar",
    desc: "Se kommande uppdrag i din region och specialitet — baserat på 29 000+ analyserade bemanningsuppdrag. Planera din nästa affär i god tid.",
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
  { num: "1", title: "Skapa ditt konto", desc: "Logga in och ange din roll.\nFå tillgång alla verktyg och insikter." },
  { num: "2", title: "Ladda upp dina dokument", desc: "Fakturor, tidrapporter, bevis. Allt struktureras automatiskt." },
  { num: "3", title: "Få insikt och agera", desc: "Löneanalys, missade fakturor, förhandlingsstöd — direkt." },
  { num: "4", title: "Dela på dina villkor", desc: "Skicka en länk när du är redo. Aldrig mer bifogade filer." },
];

const INVOICES = [
  { label: "Faktura #2024-031", val: "42 h — OK", status: "ok" },
  { label: "Faktura #2024-038", val: "6 h saknas", status: "miss" },
  { label: "Faktura #2024-044", val: "38 h — OK", status: "ok" },
  { label: "Faktura #2024-051", val: "3.5 h saknas", status: "miss" },
  { label: "Faktura #2024-059", val: "44 h — OK", status: "ok" },
];

const PLANS = [
  {
    name: "Gratis",
    price: "0 kr",
    unit: " /mån",
    desc: "Grundverktygen utan kostnad — för alltid.",
    features: ["Dokumentvalvet (Verify)", "Referensplattformen", "BankID-delning", "Grundläggande löneindikator"],
    cta: "Kom igång",
    featured: false,
  },
  {
    name: "Insight",
    price: "149 kr",
    unit: " /mån",
    desc: "Full löneanalys, förhandlingsstöd och uppdragsradar.",
    features: ["Allt i Gratis", "Detaljerad löneanalys", "Löneassistent med AI", "Uppdragsradar", "Regional och specialitetsjämförelse"],
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

/* ───────────────────── component ──────────────── */
export default function LandingV2() {
  return (
    <div className="w-full bg-[#F2F1F8] text-foreground font-sans">
      {/* ── Nav ─────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 lg:px-10 h-[60px] bg-white border-b border-border/40">
        <div className="flex items-center gap-2 text-lg font-medium tracking-tight">
          <span className="w-2 h-2 rounded-full bg-[#534AB7]" />
          CompCare
        </div>
        <div className="hidden md:flex gap-6">
          {["Verktyg", "Löneanalys", "Fakturagranskning", "Priser", "Om oss"].map((l) => (
            <span key={l} className="text-sm text-muted-foreground cursor-default">{l}</span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Link to="/logga-in">
            <button className="text-sm px-4 py-2 border border-border rounded-lg bg-transparent text-foreground">Logga in</button>
          </Link>
          <Link to="/registrera">
            <button className="text-sm px-5 py-2 rounded-lg bg-[#534AB7] text-white font-medium">Skapa konto</button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ────────────────────────────── */}
      <section className="relative min-h-[480px] flex flex-col lg:flex-row items-center overflow-hidden">
        {/* bg layers */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#0d0b2a] via-[#1a1545] via-[70%] to-[#0e0c30]" />
        <div className="absolute inset-0 bg-[rgba(5,4,20,0.45)]" />
        <div
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)",
          }}
        />

        {/* content */}
        <div className="relative z-10 px-6 lg:px-10 pt-16 pb-8 lg:py-20 max-w-[620px]">
          <div className="inline-flex items-center gap-1.5 text-xs font-medium text-[#AFA9EC] bg-[rgba(83,74,183,0.2)] border border-[rgba(127,119,221,0.35)] rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#AFA9EC" /></svg>
            Byggt för läkare &amp; sjuksköterskor
          </div>
          <h1 className="text-[clamp(2rem,5vw,42px)] font-medium leading-[1.18] text-white mb-4 tracking-tight">
            Dina <span className="text-[#AFA9EC]">data.</span><br />Din karriär.<br />Dina villkor.
          </h1>
          <p className="text-base text-white/[0.68] leading-relaxed mb-0 lg:mb-8 max-w-[460px]">
            CompCare samlar alla verktyg du behöver som konsult inom vården — löneanalys, verifiering, fakturagranskning och referenshantering i en plattform du äger.
          </p>
          {/* Desktop buttons */}
          <div className="hidden lg:flex gap-3">
            <Link to="/registrera">
              <button className="px-7 py-3 bg-[#534AB7] rounded-lg text-white text-[15px] font-medium">Kom igång gratis</button>
            </Link>
            <button className="px-7 py-3 bg-transparent border border-white/30 rounded-lg text-white/80 text-[15px]">Se hur det fungerar</button>
          </div>
        </div>

        {/* stat cards — mobile: 2-col grid, desktop: vertical column */}
        <div className="relative z-10 mx-auto py-4 lg:py-20 grid grid-cols-2 lg:flex lg:flex-col gap-3 lg:gap-5 px-6 lg:px-0 w-full lg:w-auto">
          {STATS.map((s) => (
            <div key={s.label} className="bg-white/[0.07] border border-white/[0.13] rounded-xl px-4 lg:px-6 py-3.5 lg:py-[18px]">
              {s.subtitle && <div className="text-[10px] lg:text-[11px] text-white/40 uppercase tracking-wider mb-1">{s.subtitle}</div>}
              <div className="text-[20px] lg:text-[28px] font-medium text-white mb-0.5">{s.num}</div>
              <div className="text-[11px] lg:text-[13px] text-white/50 leading-snug">{s.label}</div>
            </div>
          ))}
          <Link to="/registrera" className="bg-white/[0.07] border border-white/[0.13] rounded-xl px-4 lg:px-6 py-3.5 lg:py-[18px] hover:bg-white/[0.12] transition-colors group">
            <div className="text-[10px] lg:text-[11px] text-white/40 uppercase tracking-wider mb-1">JÄMFÖR DIN EGEN ERSÄTTNING</div>
            <div className="text-[20px] lg:text-[28px] font-medium text-white mb-0.5 text-center flex items-center justify-center gap-2">START <ArrowRight className="w-5 h-5 lg:w-6 lg:h-6" /></div>
            <div className="text-[11px] lg:text-[13px] text-white/50 leading-snug">Gratis och tar 30 sek</div>
          </Link>
        </div>

        {/* Mobile buttons — after stat cards */}
        <div className="relative z-10 grid grid-cols-2 lg:hidden gap-3 px-6 pb-10">
          <Link to="/registrera" className="block">
            <button className="w-full px-4 py-3 bg-[#534AB7] rounded-lg text-white text-[15px] font-medium">Kom igång gratis</button>
          </Link>
          <button className="w-full px-4 py-3 bg-transparent border border-white/30 rounded-lg text-white/80 text-[15px]">Se hur det fungerar</button>
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
            Allt du behöver som konsult inom vården — samlat på ett ställe som du äger.
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
      <section className="px-6 lg:px-10 py-[72px] bg-white">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-medium text-[#534AB7] uppercase tracking-widest mb-2.5">Fakturagranskning</p>
            <h2 className="text-[30px] font-medium leading-tight tracking-tight mb-3">Du har troligen pengar du inte fått</h2>
            <p className="text-[15px] text-muted-foreground leading-relaxed mb-5">
              Konsulter missar i snitt 3–8% av fakturerbara timmar. Vi går igenom dina historiska fakturor och tidrapporter och identifierar utestående belopp — utan risk för dig.
            </p>
            <p className="text-[13px] text-muted-foreground/70">Vi tar 25% av det vi hittar. Hittar vi ingenting kostar det dig ingenting.</p>
          </div>
          <div className="bg-[#ECEAF5] border border-border/40 rounded-xl p-6">
            <div className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-4">Exempelgranskning</div>
            {INVOICES.map((inv) => (
              <div key={inv.label} className="flex justify-between items-center py-2.5 border-b border-border/40 last:border-b-0 text-[13px]">
                <span className="text-muted-foreground">{inv.label}</span>
                <span className={`font-medium ${inv.status === "miss" ? "text-[#E24B4A]" : ""}`}>{inv.val}</span>
              </div>
            ))}
            <div className="border-t border-border/60 mt-4 pt-3.5 flex justify-between items-center">
              <span className="text-[13px] text-muted-foreground">Hittade 9.5 h utestående</span>
              <span className="text-[15px] font-medium text-[#1D9E75]">+6 840 kr</span>
            </div>
            <span className="inline-block text-[11px] font-medium bg-[#EEEDFE] text-[#3C3489] px-2.5 py-0.5 rounded-full mt-4">Faktura skickad</span>
          </div>
        </div>
      </section>

      <div className="h-px bg-border/40 mx-6 lg:mx-10" />

      {/* ── Pricing ─────────────────────────── */}
      <section className="px-6 lg:px-10 py-[72px] bg-[#ECEAF5]">
        <p className="text-xs font-medium text-[#534AB7] uppercase tracking-widest mb-2.5">Priser</p>
        <h2 className="text-[30px] font-medium leading-tight tracking-tight mb-3">Transparent och enkelt</h2>
        <p className="text-base text-muted-foreground leading-relaxed max-w-[520px] mb-10">Börja gratis. Uppgradera när det ger värde.</p>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map((p) => (
            <div key={p.name} className={`bg-white border rounded-xl p-7 ${p.featured ? "border-2 border-[#534AB7]" : "border-border/40"}`}>
              {p.featured && <span className="inline-block text-[11px] font-medium bg-[#EEEDFE] text-[#3C3489] px-2.5 py-0.5 rounded-full mb-3">{"badge" in p ? p.badge : ""}</span>}
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
        <p className="text-base text-white/60 mb-7">Gratis konto. Inga kreditkort. BankID-verifiering på 30 sekunder.</p>
        <div className="flex gap-3 justify-center">
          <Link to="/registrera">
            <button className="px-8 py-3 bg-[#534AB7] rounded-lg text-white text-[15px] font-medium">Skapa konto gratis</button>
          </Link>
          <button className="px-7 py-3 bg-transparent border border-white/30 rounded-lg text-white/80 text-[15px]">Boka en demo</button>
        </div>
      </div>

      {/* ── Footer ──────────────────────────── */}
      <footer className="px-6 lg:px-10 pt-10 pb-7 border-t border-border/40 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center gap-2 text-lg font-medium tracking-tight mb-2.5">
              <span className="w-2 h-2 rounded-full bg-[#534AB7]" />
              CompCare
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
              Data och verktyg för Sveriges läkare och sjuksköterskor. Helt oberoende från bemanningsbranschen.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Verktyg</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <span>Verify</span><span>Löneanalys</span><span>Fakturagranskning</span><span>Uppdragsradar</span>
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
          <p>BankID · GDPR-kompatibel · Datan tillhör dig</p>
        </div>
      </footer>
    </div>
  );
}
