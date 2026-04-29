import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X, ShieldCheck, Lock, FileLock2, Database, MapPin, History, Sparkles, Zap, LineChart, GitBranch } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import HeroInlineForm from "@/components/landing/HeroInlineForm";

import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";

/* ───────────────────── data ───────────────────── */
const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Lönanalys", href: "/v1?start=1", external: true },
  { label: "Uppdragsradar", href: "/uppdragsradar", external: true },
  { label: "Förhandlingsagent", href: "/consultant/forhandla", external: true },
  { label: "FAQ", href: "/vanliga-fragor", external: true },
];

const DATA_STATS = [
  { icon: Database, num: "20 000+", label: "offentliga avtal" },
  { icon: MapPin, num: "290 + 21", label: "kommuner & regioner" },
  { icon: History, num: "8 års", label: "prissättningshistorik" },
];

// Snitt-bruttolön/mån för anställd konsult, varierat över roller och zoner.
// Beräkning: kundpris × share / 1,42 × 167h. Share = 0,825 (övriga roller),
// 0,875 (specialistläkare). Källa: SKR ramavtal 2026.
const NURSE_RATE_TICKER = [
  { role: "Sjuksköterska · Zon 1", salary: "60 000" },
  { role: "Barnmorska · Zon 3", salary: "85 000" },
  { role: "Skolsköterska · Zon 1", salary: "69 000" },
  { role: "Röntgensjuksköterska · Zon 2", salary: "64 000" },
  { role: "Distriktssjuksköterska · Zon 3", salary: "85 000" },
  { role: "Legitimerad läkare · Zon 2", salary: "101 000" },
  { role: "Specialist akutsjukvård · Zon 3", salary: "184 000" },
  { role: "Specialist allmänmedicin · Zon 2", salary: "156 000" },
  { role: "Specialist anestesi · Zon 3", salary: "184 000" },
  { role: "Specialist äldrepsykiatri · Zon 1", salary: "150 000" },
  { role: "Specialist barnkirurgi · Zon 2", salary: "156 000" },
  { role: "Specialist allergologi · Zon 3", salary: "184 000" },
  { role: "Specialist arbetsmedicin · Zon 1", salary: "127 000" },
  { role: "Specialist barnkardiologi · Zon 3", salary: "184 000" },
  { role: "Specialist geriatrik · Zon 2", salary: "156 000" },
  { role: "Specialist gynekologi · Zon 3", salary: "184 000" },
  { role: "Specialist kardiologi · Zon 1", salary: "150 000" },
  { role: "Specialist neurologi · Zon 3", salary: "201 000" },
  { role: "Specialist ortopedi · Zon 2", salary: "156 000" },
  { role: "Specialist psykiatri · Zon 3", salary: "184 000" },
];

const HOW_IT_WORKS = [
  { num: "01", title: "Välj din roll", desc: "Specialitet och ort i två klick. Inga formulär, ingen registrering." },
  { num: "02", title: "Få ditt spann", desc: "Median, undre och övre intervall." },
  { num: "03", title: "Förhandla med data", desc: "Konkreta argument för nästa samtal med uppdragsgivaren." },
];

type ProductCard = {
  step: string;
  title: string;
  tagline: string;
  desc: string;
  tag: string;
  tagColor: "violet" | "pink" | "cyan" | "muted";
  href: string;
  cta: string;
};

const PRIMARY_PRODUCTS: ProductCard[] = [
  {
    step: "01",
    title: "Lönanalys",
    tagline: "Vet vad du är värd",
    desc: "Jämför din ersättning mot 290 kommuners ramavtalspriser. Se median och spann för din specialitet och zon — på 60 sekunder.",
    tag: "Gratis",
    tagColor: "cyan",
    href: "/v1?start=1",
    cta: "Gör analysen",
  },
  {
    step: "02",
    title: "Förhandlingsagent",
    tagline: "Vinn förhandlingen",
    desc: "AI-assistent som ger dig argumenten i realtid. Branschspecifik kunskap, neutral analys, konkreta nästa steg.",
    tag: "Premium · 99 kr/mån",
    tagColor: "pink",
    href: "/consultant/forhandla",
    cta: "Starta",
  },
  {
    step: "03",
    title: "Fakturakollen",
    tagline: "Få det du förtjänat",
    desc: "AI-analyser av fakturor och tidrapporter de senaste 2 åren. Vi ser vad du missat. Hittar vi inget, betalar du inget.",
    tag: "No cure – no pay",
    tagColor: "violet",
    href: "/consultant/fakturakontroll",
    cta: "Starta granskning",
  },
];

type InfraCard = { title: string; desc: string; href: string };

const INFRASTRUCTURE: InfraCard[] = [
  { title: "Dokhus", desc: "Säker lagring och tidsbegränsad delning av legitimation, intyg och CV. Aldrig mer bifogade filer.", href: "/dokhus-info" },
  { title: "Ref-ID", desc: "Dina referenser får ETT samtal och verifierar därefter med bank-ID. Referenstagningen sparas i ett utrymme du kontrollerar. Du delar tillgång till uppgifterna med samarbetspartners. ", href: "/referenser-info" },
  { title: "Eget bolag", desc: "Går du i tankar på att starta ett aktiebolag? Vår assistent svarar på dina frågor och hjälper dig ta de första stegen. Fördelarna är många för dig som återkommande arbetar som konsult.", href: "/eget-bolag" },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "BankID-verifiering", note: "LANSERAS I MAJ 2026", muted: true },
  { icon: Lock, title: "GDPR-kompatibel", note: "All data lagras inom EU" },
  { icon: FileLock2, title: "Aldrig till tredje part", note: "Vi säljer inte din data" },
];

const TAG_COLORS: Record<string, string> = {
  violet: "bg-[hsl(256_100%_67%_/_0.18)] text-[hsl(256_100%_82%)] border-[hsl(256_100%_67%_/_0.35)]",
  pink:   "bg-[hsl(320_95%_65%_/_0.16)] text-[hsl(320_95%_82%)] border-[hsl(320_95%_65%_/_0.35)]",
  cyan:   "bg-[hsl(190_95%_55%_/_0.16)] text-[hsl(190_95%_78%)] border-[hsl(190_95%_55%_/_0.35)]",
  muted:  "bg-white/5 text-white/70 border-white/10",
};

/* Ljus variant för produkttrappan på vit bakgrund */
const TAG_COLORS_LIGHT: Record<string, string> = {
  violet: "bg-[hsl(256_100%_67%_/_0.10)] text-[hsl(256_70%_45%)] border-[hsl(256_100%_67%_/_0.30)]",
  pink:   "bg-[hsl(320_95%_65%_/_0.10)] text-[hsl(320_70%_45%)] border-[hsl(320_95%_65%_/_0.30)]",
  cyan:   "bg-[hsl(190_95%_45%_/_0.10)] text-[hsl(190_80%_30%)] border-[hsl(190_95%_45%_/_0.30)]",
  muted:  "bg-slate-100 text-slate-600 border-slate-200",
};

/* Make-stil pillar-flikar */
const PILLARS = [
  { id: "data", label: "Datadriven analys", icon: LineChart },
  { id: "agent", label: "Agentisk AI", icon: Sparkles },
  { id: "speed", label: "60-sekunders svar", icon: Zap },
  { id: "trust", label: "Verifierad data", icon: GitBranch },
];

const PILLAR_CONTENT: Record<string, { title: string; desc: string }> = {
  data:  { title: "Skalbar & datadriven analys", desc: "Vi kombinerar 20 000+ ramavtal med historisk avropsdata för att ge dig ett spann som faktiskt speglar marknaden — inte en gissning." },
  agent: { title: "Autonoma agenter, alltid på", desc: "Förhandlingsagenten håller koll på prisuppdateringar, ramavtalsändringar och nya avrop åt dig — och pingar när något händer." },
  speed: { title: "Från fråga till svar — på 60 sekunder", desc: "Inga formulär. Välj roll och ort, få ditt ersättningsspann direkt. Hela rapporten levereras innan du hinner brygga kaffet." },
  trust: { title: "Verifierad data, hela vägen", desc: "All ersättningsdata kommer direkt från SKR:s ramavtal 2026. Uppgifter som alltid varit offentliga men aldrig paketerade för dig som jobbar." },
};

/* ───────────────────── component ──────────────── */
export default function LandingV2() {
  useTimeOnPage("landing");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePillar, setActivePillar] = useState("data");
  useEffect(() => { trackEvent("landing_viewed"); }, []);

  return (
    <div className="w-full text-foreground font-sans">

      {/* ── Nav ─────────────────────────────── */}
      <nav className="relative flex items-center justify-between px-5 sm:px-6 lg:px-10 h-[60px] glass-strong border-b border-white/10">
        <Link to="/" aria-label="CompCare startsida" className="inline-flex items-center">
          <span className="font-sans font-semibold text-[22px] sm:text-[24px] tracking-tight leading-none">
            <span className="text-white">comp</span>
            <span className="text-[hsl(320_95%_70%)]">care</span>
          </span>
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/logga-in">
            <button className="text-sm px-3 sm:px-4 py-2 border border-white/15 rounded-lg bg-transparent text-white hover:bg-white/5 transition-colors">
              Logga in
            </button>
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-white/15 text-white hover:bg-white/5 transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <>
            <div className="fixed inset-0 bg-black/60 z-40" onClick={() => setMenuOpen(false)} aria-hidden="true" />
            <div className="absolute top-full right-4 lg:right-10 mt-2 w-72 glass-strong border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
              <div className="flex flex-col py-2">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 text-sm text-white/85 hover:bg-white/5 hover:text-white transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* ═══════════════════ 1. HERO med inline-form + porträtt ═══════════════════ */}
      <section className="relative overflow-hidden px-5 sm:px-6 lg:px-10 hero-smooth-bg">
        <div className="relative z-10 max-w-3xl mx-auto flex flex-col items-center text-center pt-14 md:pt-24 pb-8 md:pb-12">
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[hsl(256_100%_85%)] bg-[hsl(256_100%_67%_/_0.18)] border border-[hsl(256_100%_67%_/_0.35)] rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>
            För läkare &amp; sjuksköterskor
          </div>
          <h1 className="font-bold leading-[1.05] text-white mb-5 tracking-tight text-[34px] sm:text-5xl md:text-[56px]">
            Vet du vad du<br />
            <span className="text-gradient-violet">är värd?</span>
          </h1>
          <p className="text-[16px] sm:text-lg text-white/75 leading-relaxed mb-8 max-w-[560px]">
            Vi visar ersättningsnivåer för läkare och sjuksköterskor inom bemanning. Baserat på SKR:s ramavtal för 2026 och djupgående AI-analyser av bemanningsbranschens marginaler.
          </p>
          <div className="w-full max-w-[560px] text-center">
            <HeroInlineForm />
          </div>
          <p className="mt-4 text-[12px] text-white/45">
            Anonymt · Kostnadsfritt · Klart på 60 sekunder
          </p>
        </div>
      </section>


      {/* ═══ Ljus sektion-wrapper för allt under hero ═══ */}
      <div className="bg-[#F7F5FB] text-slate-900 [&_.text-white]:!text-slate-900 [&_.text-white\/85]:!text-slate-700 [&_.text-white\/80]:!text-slate-700 [&_.text-white\/75]:!text-slate-600 [&_.text-white\/70]:!text-slate-600 [&_.text-white\/65]:!text-slate-600 [&_.text-white\/60]:!text-slate-500 [&_.text-white\/55]:!text-slate-500 [&_.text-white\/50]:!text-slate-500 [&_.text-white\/45]:!text-slate-400 [&_.border-white\/10]:!border-slate-200 [&_.border-white\/15]:!border-slate-200 [&_.glass]:!bg-white [&_.glass]:!border-slate-200 [&_.glass]:!shadow-sm [&_.glass-strong]:!bg-white [&_.glass-strong]:!border-slate-200 [&_.glass-subtle]:!bg-white [&_.glass-subtle]:!border-slate-200 [&_.bg-white\/5]:!bg-slate-100 [&_.bg-white\/8]:!bg-slate-100 [&_.hover\:bg-white\/5:hover]:!bg-slate-100">

      {/* ═══════════════════ 2. RULLANDE ERSÄTTNINGSBANNER ═══════════════════ */}
      <section className="border-y border-slate-200 py-5 bg-white overflow-hidden">
        <div className="flex justify-center px-5 sm:px-6 lg:px-10 mb-3">
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500 text-center">
            LÖNENIVÅER BERÄKNADE PÅ STANDARDMARGINALER I 290 KOMMUNER OCH 21 REGIONER
          </span>
        </div>
        <div className="overflow-hidden whitespace-nowrap select-none">
          <div className="inline-flex gap-10 animate-marquee" style={{ width: "max-content", animationDuration: "60s" }}>
            {[...NURSE_RATE_TICKER, ...NURSE_RATE_TICKER].map((item, i) => (
              <span
                key={i}
                className="font-display text-sm font-medium text-slate-700 tracking-wide flex items-center gap-3"
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[hsl(256_100%_67%)] flex-shrink-0" />
                <span className="text-slate-900 font-semibold">{item.role}</span>
                <span className="text-slate-400">·</span>
                <span className="text-[hsl(256_100%_55%)] font-semibold tabular-nums">{item.salary} kr/mån</span>
              </span>
            ))}
          </div>
        </div>
        <p className="text-[11px] text-center mt-4 px-5 text-muted">
          Exempel på den vanligaste bruttolönen per roll och zon. Logga in för att se vilken zon din ort tillhör.
        </p>
      </section>

      {/* ═══════════════════ MAKE-STIL: PILLAR-SEKTION ═══════════════════ */}
      <section className="relative px-5 sm:px-6 lg:px-10 py-20 md:py-28 overflow-hidden">
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'radial-gradient(ellipse 60% 50% at 50% 0%, hsl(var(--glow-violet) / 0.25) 0%, transparent 65%), radial-gradient(ellipse 50% 40% at 85% 50%, hsl(var(--glow-pink) / 0.18) 0%, transparent 60%)',
          }}
        />
        <div className="relative max-w-6xl mx-auto">
          <h2 className="font-bold text-center text-white tracking-tight leading-[1.1] text-[32px] sm:text-[44px] md:text-[56px] max-w-[920px] mx-auto mb-12 md:mb-16">
            Datadriven löneanalys och förhandling med{" "}
            <span className="text-gradient-violet">agentisk intelligens</span> inbyggd
          </h2>

          {/* Tab pills */}
          <div className="glass rounded-full p-1.5 max-w-3xl mx-auto mb-12 md:mb-16 flex flex-wrap items-center justify-center gap-1">
            {PILLARS.map((p) => {
              const active = activePillar === p.id;
              return (
                <button
                  key={p.id}
                  onClick={() => setActivePillar(p.id)}
                  className={`relative inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 rounded-full text-[13px] sm:text-sm font-medium transition-all ${
                    active
                      ? "bg-[hsl(256_100%_67%_/_0.25)] text-white border border-[hsl(256_100%_67%_/_0.5)] shadow-[0_0_30px_-5px_hsl(var(--glow-violet)/0.5)]"
                      : "text-white/70 hover:text-white border border-transparent"
                  }`}
                >
                  <p.icon className="w-4 h-4" />
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* Showcase row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div>
              <h3 className="font-bold text-white text-[26px] sm:text-[32px] leading-tight mb-4 tracking-tight">
                {PILLAR_CONTENT[activePillar].title}
              </h3>
              <p className="text-white/70 text-[15px] sm:text-base leading-relaxed mb-6 max-w-[460px]">
                {PILLAR_CONTENT[activePillar].desc}
              </p>
              <Link
                to="/v1?start=1"
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[hsl(256_100%_82%)] hover:text-white transition-colors"
              >
                Prova nu <ArrowRight className="w-4 h-4" />
              </Link>
            </div>

            {/* Illustrativa flytande kort à la Make */}
            <div className="relative h-[340px] sm:h-[400px]">
              <div className="absolute top-0 left-0 glass rounded-2xl p-4 w-[180px] shadow-[0_8px_40px_-8px_hsl(var(--glow-violet)/0.5)] rotate-[-4deg]">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 rounded-full bg-[hsl(256_100%_67%)] flex items-center justify-center">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="text-[11px] font-semibold text-white">Förhandlingsagent</div>
                </div>
                <div className="space-y-1.5">
                  <div className="h-1.5 rounded bg-white/15 w-full" />
                  <div className="h-1.5 rounded bg-white/10 w-4/5" />
                  <div className="h-1.5 rounded bg-white/10 w-3/5" />
                </div>
              </div>

              <div className="absolute top-12 right-2 sm:right-8 glass-strong rounded-2xl p-5 w-[220px] shadow-[0_12px_50px_-10px_hsl(var(--glow-pink)/0.5)] rotate-[3deg]">
                <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">Ersättningsspann</div>
                <div className="text-2xl font-bold text-white">1 240 kr/h</div>
                <div className="text-[11px] text-[hsl(190_95%_70%)] mt-1">+8% mot fjolåret</div>
                <div className="mt-3 h-12 flex items-end gap-1">
                  {[40, 65, 50, 80, 70, 95, 85].map((h, i) => (
                    <div
                      key={i}
                      className="flex-1 rounded-sm bg-gradient-to-t from-[hsl(256_100%_67%)] to-[hsl(320_95%_65%)] opacity-80"
                      style={{ height: `${h}%` }}
                    />
                  ))}
                </div>
              </div>

              <div className="absolute bottom-0 left-6 sm:left-12 glass rounded-2xl p-4 w-[200px] shadow-[0_8px_40px_-8px_hsl(var(--glow-cyan)/0.4)] rotate-[2deg]">
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-6 h-6 rounded-md bg-[hsl(190_95%_55%_/_0.25)] flex items-center justify-center">
                    <LineChart className="w-3.5 h-3.5 text-[hsl(190_95%_75%)]" />
                  </div>
                  <div className="text-[11px] font-semibold text-white">Uppdragsradar</div>
                </div>
                <div className="text-[10px] text-white/60 mb-2">3 nya prognoser i Stockholm</div>
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/70">Anestesi v.18</span>
                    <span className="text-[hsl(190_95%_75%)] font-semibold">92%</span>
                  </div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-white/70">IVA v.19</span>
                    <span className="text-[hsl(190_95%_75%)] font-semibold">78%</span>
                  </div>
                </div>
              </div>

              {/* Dotted connection line */}
              <svg className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden="true">
                <path
                  d="M 100 60 Q 200 100, 260 130 T 180 320"
                  stroke="hsl(320 95% 65% / 0.4)"
                  strokeWidth="1.5"
                  strokeDasharray="3 5"
                  fill="none"
                />
              </svg>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════ 3. HUR DET FUNGERAR ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 md:mb-12 text-center">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-[hsl(256_100%_82%)] bg-[hsl(256_100%_67%_/_0.15)] border border-[hsl(256_100%_67%_/_0.3)] rounded-full px-3.5 py-1 mb-4">
              Hur det fungerar
            </span>
            <h2 className="text-[28px] sm:text-[34px] font-bold leading-[1.15] tracking-tight text-white">
              Tre steg från fråga till svar
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.num} className="relative glass rounded-2xl p-6 md:p-7 glow-hover">
                <div className="text-[12px] font-semibold tracking-wider text-[hsl(256_100%_82%)] mb-3">{s.num}</div>
                <h3 className="text-[17px] font-semibold text-white mb-2">{s.title}</h3>
                <p className="text-[14px] text-white/70 leading-relaxed">{s.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-white/15" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 4. PRIMÄR PRODUKTTRAPPA ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 py-16 md:py-20 border-y border-slate-200 bg-white">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 md:mb-14">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-[hsl(256_60%_45%)] bg-[hsl(256_100%_67%_/_0.08)] border border-[hsl(256_100%_67%_/_0.25)] rounded-full px-3.5 py-1 mb-4">
              Konsultplattformen
            </span>
            <h2 className="text-[28px] sm:text-[34px] font-bold leading-[1.15] tracking-tight text-slate-900 mb-2.5">
              Från svar till resultat
            </h2>
            <p className="text-[15px] text-slate-600 max-w-[560px]">
              Tre steg som bygger på varandra. Varje verktyg är fristående — eller del av en längre resa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {PRIMARY_PRODUCTS.map((p) => (
              <article
                key={p.title}
                className="bg-white border border-slate-200 rounded-[18px] p-7 flex flex-col shadow-sm hover:shadow-md hover:border-[hsl(256_100%_67%_/_0.4)] transition-all"
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[13px] font-bold tracking-wider text-[hsl(256_70%_50%)]">{p.step}</span>
                  <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${TAG_COLORS_LIGHT[p.tagColor]}`}>{p.tag}</span>
                </div>
                <h3 className="text-[20px] font-bold text-slate-900 mb-1 leading-tight">{p.title}</h3>
                <p className="text-[13px] font-medium text-[hsl(256_60%_50%)] mb-3 italic">{p.tagline}</p>
                <p className="text-[14px] text-slate-600 leading-[1.65] flex-1 mb-5">{p.desc}</p>
                <Link
                  to={p.href}
                  onClick={() => trackEvent("product_cta_clicked", { cta: `primary_${p.title.toLowerCase()}`, target: p.href })}
                  className="text-[14px] font-semibold text-[hsl(256_70%_50%)] hover:text-[hsl(256_70%_40%)] inline-flex items-center gap-1.5 transition-colors"
                >
                  {p.cta} <ArrowRight className="w-4 h-4" />
                </Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 5. INFRASTRUKTUR (sekundär) ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 py-14 md:py-16">
        <div className="max-w-5xl mx-auto">
          <div className="mb-8 md:mb-10">
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-white mb-1.5">
              Bakomliggande infrastruktur
            </h2>
            <p className="text-[13px] text-white/60 max-w-[480px]">
              Stödverktyg som du också får tillgång till — när du är redo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {INFRASTRUCTURE.map((c) => (
              <Link
                key={c.title}
                to={c.href}
                className="glass-subtle rounded-xl p-5 hover:bg-white/5 transition-all group glow-hover"
              >
                <h3 className="text-[15px] font-semibold text-white mb-1.5 inline-flex items-center gap-1.5">
                  {c.title}
                  <ArrowRight className="w-3.5 h-3.5 text-white/50 group-hover:text-white transition-colors" />
                </h3>
                <p className="text-[13px] text-white/65 leading-relaxed">{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 6. FÖRTROENDE ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 pb-14 md:pb-20">
        <div className="max-w-5xl mx-auto glass rounded-2xl p-7 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {TRUST_POINTS.map((t) => (
              <div key={t.title} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.muted ? "bg-white/5 text-white/50" : "bg-[hsl(190_95%_55%_/_0.18)] text-[hsl(190_95%_75%)] border border-[hsl(190_95%_55%_/_0.35)]"}`}>
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-white inline-flex items-center gap-2 flex-wrap">
                    {t.title}
                    {t.muted && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-white/8 text-white/60">
                        {t.note}
                      </span>
                    )}
                  </div>
                  {!t.muted && (
                    <p className="text-[13px] text-white/65 mt-1 leading-relaxed">{t.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ B2B-CTA-rad ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 pb-14">
        <div className="max-w-5xl mx-auto rounded-xl px-6 md:px-8 py-6 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4 bg-gradient-to-r from-[hsl(256_100%_67%_/_0.18)] to-[hsl(320_95%_65%_/_0.18)] border border-white/10">
          <div className="md:max-w-[640px]">
            <h3 className="text-[17px] sm:text-[19px] font-semibold text-white leading-snug mb-1.5">
              Är du beredd att lita på din magkänsla om den kan kosta dig 100 000 kr? Luta dig mot vår data istället.
            </h3>
            <p className="text-[13.5px] sm:text-[14px] text-white/75 leading-relaxed">
              Vi visar vad marknaden faktiskt betalar — från den dolda zonskillnaden på 386 kr/h till prisskillnader mellan privata och offentliga aktörer. Se hur ni undviker de tilldelningsavvisningar som kostar mer än ni tror genom att säkra er representation digitalt.
            </p>
          </div>
          <Link
            to="/for-bemanningsforetag"
            onClick={() => trackEvent("product_cta_clicked", { cta: "b2b_footer_cta", target: "/for-bemanningsforetag" })}
            className="self-start md:self-auto bg-[hsl(256_100%_67%)] hover:bg-[hsl(256_100%_72%)] text-white text-sm font-semibold rounded-lg px-6 py-3 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap shadow-[0_8px_30px_-8px_hsl(var(--glow-violet)/0.6)]"
          >
            Utforska CompCare Business <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      </div>
      {/* ── /Ljus sektion-wrapper ── */}

      {/* ── Footer ──────────────────────────── */}
      <footer className="px-5 sm:px-6 lg:px-10 pt-10 pb-12 border-t border-white/10 bg-[hsl(260_50%_5%_/_0.6)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="mb-2.5">
                <CompcareLogo variant="full" inverted={true} />
              </div>
              <p className="text-[13px] text-white/60 leading-relaxed max-w-[220px]">
                Transparent marknadsdata och smarta verktyg för Sveriges läkare och sjuksköterskor.
              </p>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-3">Konsult</h4>
              <div className="flex flex-col gap-2 text-[13px] text-white/70">
                <Link to="/v1?start=1" className="hover:text-white transition-colors">Lönanalys</Link>
                <Link to="/uppdragsradar" className="hover:text-white transition-colors">Uppdragsradar</Link>
                <Link to="/consultant/forhandla" className="hover:text-white transition-colors">Förhandlingsagent</Link>
                <Link to="/consultant/fakturakontroll" className="hover:text-white transition-colors">Fakturagranskning</Link>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-3">Företag</h4>
              <div className="flex flex-col gap-2 text-[13px] text-white/70">
                <Link to="/vanliga-fragor" className="hover:text-white transition-colors">FAQ</Link>
                <Link to="/integritetspolicy" className="hover:text-white transition-colors">Integritetspolicy</Link>
                <a href="mailto:hej@compcare.se" className="hover:text-white transition-colors">Kontakt</a>
              </div>
            </div>
            <div>
              <h4 className="text-xs font-medium uppercase tracking-widest text-white/50 mb-3">För bemanningsföretag</h4>
              <div className="flex flex-col gap-2 text-[13px] text-white/70">
                <Link to="/for-bemanningsforetag" className="hover:text-white transition-colors">
                  <span className="text-white font-medium">CompCare Insight</span> — beslutsstöd för prissättning baserat på aktuella tilldelningsdata
                </Link>
                <Link to="/for-bemanningsforetag" className="hover:text-white transition-colors">
                  <span className="text-white font-medium">CompCare Dokhus</span> — digital exklusivitet som eliminerar risk för dubbelpresentationer
                </Link>
                <Link to="/for-bemanningsforetag" className="hover:text-white transition-colors">
                  <span className="text-white font-medium">Intygsmodulen</span> — juridiskt hållbara konsultbekräftelser enligt nationella krav
                </Link>
                <Link to="/registrera/bemanning" className="hover:text-white transition-colors">
                  <span className="text-white font-medium">Bli partner</span> — kontakta oss för integration och tidig access
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white/50">
            <p>© 2026 CompCare — Piemonte Invest AB</p>
            <p>GDPR-kompatibel · Datan tillhör dig</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
