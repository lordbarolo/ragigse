import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import HeroRateLookup from "@/components/landing/HeroRateLookup";
import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";

/* ───────────────────── data ───────────────────── */
const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Verktyg", href: "#verktyg" },
  { label: "Ersättningsanalys", href: "/", external: true },
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

type ModuleCard = {
  title: string;
  desc: string;
  tag: string;
  tagColor: "purple" | "amber" | "blue" | "green" | "muted";
  iconBg: string;
  icon: JSX.Element;
  cta?: { label: string; href: string };
};

const MODULES_ROW1: ModuleCard[] = [
  {
    title: "Dokhus — Där dina dokument bor",
    desc: "Säker lagring av legitimationer, specialistbevis och tjänstgöringsintyg. Hantera åtkomst via krypterade länkar i stället för osäkra filbilagor – för fullständig kontroll över dina känsliga personuppgifter.",
    tag: "Ingår gratis",
    tagColor: "purple",
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
    title: "Ref ID - Minimera störning av dina referenser",
    desc: "Administrera dina referenser centralt. Du styr vem som får tillgång och när. Dina referensgivare verifierar enkelt med bank-id vid upprepade förfrågningar, vilket eliminerar repetitiv administration och säkrar processens integritet.",
    tag: "Kommer snart",
    tagColor: "muted",
    iconBg: "#EEEDFE",
    icon: (
      <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
        <circle cx="10" cy="10" r="6" stroke="#3C3489" strokeWidth="1.2" />
        <path d="M10 7v3l2 2" stroke="#3C3489" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  {
    title: "Ersättningsanalys - Se aktuella arvoden",
    desc: "Med full transparens kring avtalsvillkor och branschens marginaler skapar vi förutsättningar för en trygg och hållbar konsultkarriär.",
    tag: "Insight — 149 kr/mån",
    tagColor: "amber",
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
    desc: "Automatiserad revision av fakturor och tidrapport. Vi söker efter avvikelser och hjälper dig fakturera om vi ser något du missat att ta betalt för. Arvodet är helt prestationsbaserat: vi erhåller 25 % av det belopp vi återvinner åt dig.",
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
    desc: "Öka chansen att få uppdraget du verkligen vill ha. Vi har analyserat 5 års historik och över 30 000 bemanningsuppdrag. AI ger oss träffsäkra prognoser om kommande behov hos specifika verksamheter.",
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
  { num: "2", title: "Ladda upp dina dokument", desc: "Tidrapporter, intyg och CV. Allt struktureras och säkras i valvet." },
  { num: "3", title: "Få insikt och agera", desc: "Ersättningsanalys, marknadsdata och förhandlingsstöd — direkt." },
  { num: "4", title: "Dela på dina villkor", desc: "Skicka en krypterad länk när du är redo. Full kontroll över din data." },
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
    headlineColor: "text-[#534AB7]",
    subheadline: "Inga kreditkort",
    desc: "Dokumentvalvet, Ref ID och en kostnadsfri löneanalys. Få full koll utan kostnad — alltid.",
    features: ["Dokumentvalvet", "Ref ID", "En kostnadsfri löneanalys", "Bemanningsbolagens pris mot region", "Ingen tidsbegränsning"],
    cta: "Kom igång",
    href: "/registrera",
    bg: "bg-[#EFEDFA]",
    border: "border-[#534AB7]/20",
    iconBg: "bg-[#534AB7]/10 text-[#3C3489]",
    btnClass: "bg-transparent border border-[#534AB7]/40 text-[#3C3489] hover:bg-[#534AB7]/5",
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
    desc: "Detaljerad ersättningsanalys, AI-driven förhandlingsstöd och uppdragsprognos. Förstå exakt var du står — och var du borde stå.",
    features: ["Allt i Gratis", "Detaljerad ersättningsanalys", "Löneassistent med AI", "Uppdragsprognos", "Regional & specialitetsjämförelse"],
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
  useTimeOnPage("landing");
  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

  return (
    <div className="w-full bg-[#F2F1F8] text-foreground font-sans">

      {/* ── Nav ─────────────────────────────── */}
      <nav className="flex items-center justify-between px-6 lg:px-10 h-[60px] bg-white border-b border-border/40">
        <CompcareLogo variant="wordmark" />
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
          <h1 className="font-bold leading-[1.1] text-white mb-6 tracking-tight text-5xl">
            Förhandla utifrån <span className="text-[#AFA9EC]">data,</span><br />inte magkänsla
          </h1>
          <p className="text-lg text-white/[0.78] leading-relaxed mb-6 max-w-[520px]">
            Vi visar aktuella ersättningar för inhyrda läkare och sjuksköterskor. Se uppdaterade nivåer för din roll och region.
          </p>
          <Link to="/v1?start=1" onClick={() => trackEvent("product_cta_clicked", { cta: "hero_salary_analysis", target: "/v1?start=1" })}>
            <button className="px-6 py-3 bg-white hover:bg-white/90 rounded-lg text-[#1a1545] text-[15px] font-semibold whitespace-nowrap min-h-[44px] transition-colors">
              Gör analysen →
            </button>
          </Link>
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
          <div className="text-[15px] text-muted-foreground leading-[1.65]">
            Eliminera tråkig administration och lägg tiden på något roligare.
            <ul className="list-disc pl-5 mt-2 space-y-1">
              <li>Hantera din legitimation och dina intyg via tidsbegränsad åtkomst i stället för osäkra filbilagor</li>
              <li>Optimera din löneförhandling med objektiva marknadsdata och regional statistik</li>
              <li>Identifiera juridiska risker och obalanserad ansvarsfördelning i konsultavtal före signering.</li>
              <li>Analys av tidigare fakturering för att säkerställa att din arbetade tid fakturerats i sin helhet.&nbsp;</li>
            </ul>
          </div>
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
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className={`inline-block text-[11px] font-medium px-2.5 py-1 rounded-full border w-fit ${TAG_COLORS[m.tagColor]}`}>{m.tag}</span>
                {m.cta && (
                  <Link
                    to={m.cta.href}
                    className="text-[13px] font-semibold text-[#534AB7] hover:text-[#3C3489] inline-flex items-center gap-1 transition-colors"
                  >
                    {m.cta.label} <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
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

      {/* ── CTA Banner (above steps) ─────────── */}
      <div className="mx-4 sm:mx-6 lg:mx-10 my-[72px] rounded-xl bg-[#1a1545] px-6 lg:px-12 py-14 text-center">
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

      {/* ── Footer ──────────────────────────── */}
      <footer className="px-6 lg:px-10 pt-10 pb-24 border-t border-border/40 bg-white">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="mb-2.5">
              <CompcareLogo variant="wordmark" />
            </div>
            <p className="text-[13px] text-muted-foreground leading-relaxed max-w-[220px]">
              Transparent marknadsdata och smarta verktyg för Sveriges läkare och sjuksköterskor.
            </p>
          </div>
          <div>
            <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Verktyg</h4>
            <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
              <Link to="/dokhus-info" className="hover:text-foreground transition-colors">Dokhus</Link>
              <Link to="/" className="hover:text-foreground transition-colors">Ersättningsanalys</Link>
              <Link to="/consultant/fakturakontroll" className="hover:text-foreground transition-colors">Fakturagranskning</Link>
              <Link to="/consultant/forhandla" className="hover:text-foreground transition-colors">Ersättningsanalys</Link>
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
