import { useEffect, useState, useRef } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X, ShieldCheck, Lock, FileLock2, Database, MapPin, History, Sparkles, Zap, LineChart, GitBranch, Receipt } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";

import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import { setPageMeta } from "@/lib/setPageMeta";

const LANDING_JSONLD = [
  {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "CompCare",
    url: "https://www.compcare.se/",
    inLanguage: "sv-SE",
    potentialAction: {
      "@type": "SearchAction",
      target: "https://www.compcare.se/v1?yrke={search_term_string}",
      "query-input": "required name=search_term_string",
    },
  },
  {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "CompCare",
    url: "https://www.compcare.se/",
    logo: "https://www.compcare.se/compcare-logo.svg",
    sameAs: ["https://www.compcare.se/"],
  },
];

/* ───────────────────── data ───────────────────── */
const NAV_LINKS: { label: string; href: string; external?: boolean }[] = [
  { label: "Löneanalys", href: "/v1?start=1", external: true },
  { label: "Uppdragsradar", href: "/uppdragsradar", external: true },
  { label: "Förhandlingsagent", href: "/consultant/forhandla", external: true },
  { label: "FAQ", href: "/vanliga-fragor", external: true },
];

const DATA_STATS = [
  { icon: Database, num: "20 000+", label: "offentliga avtal" },
  { icon: MapPin, num: "290 + 21", label: "kommuner & regioner" },
  { icon: History, num: "8 års", label: "prissättningshistorik" },
];

// Snitt-bruttolön/mån för anställd konsult, baserat på SKR-ramavtal 2026
// (timpris kund) × konsultandel / 1,42 (arbetsgivaravgift+pension) × 167h.
// Konsultandel = 0,825 för sjuksköterskor/barnmorskor, 0,875 för läkare.
// Alla värden härledda från rates-tabellen (contract 2026), avrundat till
// närmaste 1 000 kr/mån. Källa: SKR Personaluthyrning 2026.
const NURSE_RATE_TICKER = [
  { role: "Sjuksköterska · Zon 1", salary: "60 000" },
  { role: "Sjuksköterska · Zon 3", salary: "69 000" },
  { role: "Barnmorska · Zon 3", salary: "85 000" },
  { role: "Distriktssjuksköterska · Zon 3", salary: "85 000" },
  { role: "Röntgensjuksköterska · Zon 2", salary: "64 000" },
  { role: "Skolsköterska · Zon 1", salary: "69 000" },
  { role: "Legitimerad läkare · Zon 2", salary: "107 000" },
  { role: "Specialist allmänmedicin · Zon 2", salary: "156 000" },
  { role: "Specialist akutsjukvård · Zon 3", salary: "184 000" },
  { role: "Specialist anestesi och intensivvård · Zon 3", salary: "184 000" },
  { role: "Specialist arbetsmedicin · Zon 1", salary: "127 000" },
  { role: "Specialist geriatrik · Zon 2", salary: "156 000" },
  { role: "Specialist kardiologi · Zon 1", salary: "127 000" },
  { role: "Specialist obstetrik och gynekologi · Zon 3", salary: "184 000" },
  { role: "Specialist ortopedi · Zon 2", salary: "156 000" },
  { role: "Specialist neurologi · Zon 3", salary: "184 000" },
  { role: "Specialist psykiatri · Zon 3", salary: "201 000" },
  { role: "Specialist äldrepsykiatri · Zon 1", salary: "150 000" },
  { role: "Specialist barn- och ungdomspsykiatri · Zon 2", salary: "173 000" },
  { role: "Specialist hud- och könssjukdomar · Zon 3", salary: "201 000" },
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
    title: "Löneanalys",
    tagline: "Se uppdaterad branschstandard",
    desc: "Att förhandla kan vara obekvämt. Speciellt för den som gör det sällan. Vi gör det lite lättare genom att visa vad som är en vanlig ersättning för din roll.",
    tag: "Gratis",
    tagColor: "cyan",
    href: "/v1?start=1",
    cta: "Gör analysen",
  },
  {
    step: "02",
    title: "AI-assistent som agerar förhandlingsrådgivsre",
    tagline: "Vinn förhandlingen",
    desc: "AI-assistent som ger dig argumenten i realtid. Branschspecifik kunskap, neutral analys, konkreta nästa steg.",
    tag: "Gratis",
    tagColor: "pink",
    href: "/consultant/forhandla",
    cta: "Individuell rådgivning",
  },
  {
    step: "03",
    title: "Fakturagranskning",
    tagline: "Få det du förtjänat",
    desc: "AI-analyser av fakturor och tidrapporter de senaste 2 åren. Vi ser vad du missat och hjälper dig få betalt.",
    tag: "Provision",
    tagColor: "violet",
    href: "/consultant/fakturakontroll",
    cta: "Starta granskning",
  },
];

type InfraCard = { title: string; desc: string; href: string };

const INFRASTRUCTURE: InfraCard[] = [
  { title: "Din data", desc: "Där dina dokument och intyg bor. Dela tillgång med hjälp av krypterade och tidsbestämda länkar. Varje visad version är spårbar och tidsbegränsad.", href: "/din-data" },
  { title: "Ref-ID", desc: "Referensgivare får ETT samtal och verifierar därefter nya förfrågningar med bank-ID. Referensuppgifterna stannar under din kontroll och du ger tidsbegränsad tillgång.", href: "/referenser-info" },
  { title: "Eget bolag", desc: "AI assistenten har branschspecifik kunskap och svarar på dina frågor dygnet runt. Det finns många fördelar med att ha ett eget aktiebolag för dig som arbetar återkommande som konsult.", href: "/eget-bolag" },
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
  { id: "agent", label: "Agentbaserad AI", icon: Sparkles },
  { id: "speed", label: "60-sekunders svar", icon: Zap },
  { id: "trust", label: "Verifierad data", icon: GitBranch },
];

const PILLAR_CONTENT: Record<string, { title: string; desc: string }> = {
  data:  { title: "Skalbar & datadriven analys", desc: "Vi har analyserat 20 000+ avtal och rapporter för att ge dig insyn i ersättningen för läkare och sjuksksöterskor inom vårdbemanning." },
  agent: { title: "Autonoma agenter, alltid på", desc: "Förhandlingsagenten håller koll på prisuppdateringar, ramavtalsändringar och nya avrop åt dig — och pingar när något händer." },
  speed: { title: "Från fråga till svar — på 60 sekunder", desc: "Inga formulär. Välj roll och ort, få din marknadmässig lön direkt. Hela rapporten levereras innan du hinner brygga kaffet." },
  trust: { title: "Verifierad data, hela vägen", desc: "All ersättningsdata kommer direkt från SKR:s ramavtal 2026. Uppgifter som alltid varit offentliga men aldrig paketerade för dig som jobbar." },
};

/* ───────────────────── component ──────────────── */
export default function LandingV2() {
  useTimeOnPage("landing");
  const [menuOpen, setMenuOpen] = useState(false);
  const [activePillar, setActivePillar] = useState("data");
  const [invoiceStep, setInvoiceStep] = useState(0);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    trackEvent("landing_viewed");
    setPageMeta({
      title: "CompCare – Lön & ramavtalspriser för vårdkonsulter",
      description:
        "Jämför ditt erbjudande mot SKR:s ramavtalspriser i 290 kommuner. Gratis löneanalys för sjuksköterskor, barnmorskor och läkare.",
      path: "/",
    });

    // Auto-rotate invoice card steps
    intervalRef.current = setInterval(() => {
      setInvoiceStep((s) => (s + 1) % 3);
    }, 2800);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  return (
    <div className="w-full text-foreground font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(LANDING_JSONLD) }}
      />

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
      <section className="relative z-20 overflow-visible px-5 sm:px-6 lg:px-10 hero-smooth-bg">
        <div className="relative z-10 max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-12 items-center pt-14 md:pt-24 pb-3 md:pb-4">
          {/* Vänster: rubrik och pitch */}
          <div className="flex flex-col items-center lg:items-start text-center lg:text-left">
            <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[hsl(256_100%_85%)] bg-[hsl(256_100%_67%_/_0.18)] border border-[hsl(256_100%_67%_/_0.35)] rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
              <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="currentColor" /></svg>
              För läkare &amp; sjuksköterskor
            </div>
            <h1 className="font-bold leading-[1.05] text-white mb-5 tracking-tight text-[34px] sm:text-5xl md:text-[56px]">
              Vet du vad du<br />
              <span className="text-gradient-violet">är värd?</span>
            </h1>
            <p className="text-[16px] sm:text-lg text-white/75 leading-relaxed mb-2 max-w-[560px]">
              Se om din konsultersättning är marknadsmässig
            </p>
            <p className="mt-4 text-[12px] text-white/45">
              Anonymt · Kostnadsfritt · Klart på 60 sekunder
            </p>
          </div>

          {/* Höger: formulär */}
          <div className="w-full">
            <InlineTerminalSurvey />
          </div>
        </div>
      </section>



      {/* ═══ Ljus sektion-wrapper för allt under hero ═══ */}
      <div className="bg-[#F7F5FB] text-slate-900 [&_.text-white]:!text-slate-900 [&_.text-white\/85]:!text-slate-700 [&_.text-white\/80]:!text-slate-700 [&_.text-white\/75]:!text-slate-600 [&_.text-white\/70]:!text-slate-600 [&_.text-white\/65]:!text-slate-600 [&_.text-white\/60]:!text-slate-500 [&_.text-white\/55]:!text-slate-500 [&_.text-white\/50]:!text-slate-500 [&_.text-white\/45]:!text-slate-400 [&_.border-white\/10]:!border-slate-200 [&_.border-white\/15]:!border-slate-200 [&_.glass]:!bg-white [&_.glass]:!border-slate-200 [&_.glass]:!shadow-sm [&_.glass-strong]:!bg-white [&_.glass-strong]:!border-slate-200 [&_.glass-subtle]:!bg-white [&_.glass-subtle]:!border-slate-200 [&_.bg-white\/5]:!bg-slate-100 [&_.bg-white\/8]:!bg-slate-100 [&_.hover\:bg-white\/5:hover]:!bg-slate-100">

      {/* ═══════════════════ 2. RULLANDE ERSÄTTNINGSBANNER ═══════════════════ */}
      <section className="border-y border-slate-200 pt-3 pb-4 bg-white overflow-hidden">
        <div className="flex justify-center px-5 sm:px-6 lg:px-10 mb-3">
          <span className="text-[11px] font-semibold tracking-[0.14em] uppercase text-slate-500 text-center">
            LÖNENIVÅER BERÄKNADE PÅ STANDARDMARGINALER OCH OFFENTLIGA RAMAVTAL I 290 KOMMUNER OCH 21 REGIONER
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
            <span className="text-gradient-violet">agentbaserad intelligens</span> inbyggd
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
                <div className="text-[10px] uppercase tracking-wider text-white/50 mb-2">Marknadmässig lön</div>
                <div className="text-2xl font-bold text-white">1 240 kr/h</div>
                <div className="text-[11px] text-[hsl(190_95%_70%)] mt-1 text-indigo-800">+8% mot fjolåret</div>
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

              <div 
                className="absolute bottom-0 left-6 sm:left-12 glass rounded-2xl p-4 w-[230px] shadow-[0_8px_40px_-8px_hsl(150_80%_50%/0.35)] rotate-[2deg] cursor-pointer group"
                onMouseEnter={() => intervalRef.current && clearInterval(intervalRef.current)}
                onMouseLeave={() => {
                  intervalRef.current = setInterval(() => setInvoiceStep((s) => (s + 1) % 3), 2800);
                }}
                onClick={() => setInvoiceStep((s) => (s + 1) % 3)}
              >
                <div className="flex items-center gap-2 mb-2.5">
                  <div className="w-7 h-7 rounded-md bg-emerald-400/20 flex items-center justify-center animate-pulse">
                    <Receipt className="w-4 h-4 text-emerald-300" />
                  </div>
                  <div className="text-[12px] font-semibold text-white">Faktureringsstöd</div>
                </div>

                <div className="min-h-[64px] transition-all duration-300">
                  {invoiceStep === 0 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="text-[11px] text-white/75 mb-2 flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 text-[9px] font-bold">1</span>Skannar faktura...</div>
                      <div className="space-y-1.5">
                        <div className="h-1 rounded bg-white/10 overflow-hidden">
                          <div className="h-full bg-emerald-400/40 animate-[shimmer_2s_infinite]" style={{ width: '60%' }} />
                        </div>
                        <div className="flex items-center gap-1.5 text-[10px] text-white/60">
                          <div className="w-1 h-1 rounded-full bg-emerald-400" />
                          Läser tidrapport
                        </div>
                      </div>
                    </div>
                  )}

                  {invoiceStep === 1 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="text-[11px] text-white/75 mb-2 flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 text-[9px] font-bold">2</span>Diff. mot tidrapport</div>
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/85">Storhelgstillägg</span>
                          <span className="text-emerald-300 font-semibold">+1 625 kr</span>
                        </div>
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="text-white/85">Aktiv jour</span>
                          <span className="text-emerald-300 font-semibold">+9 300 kr</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {invoiceStep === 2 && (
                    <div className="animate-in fade-in slide-in-from-bottom-2 duration-500">
                      <div className="text-[11px] text-white/75 mb-1 flex items-center gap-1.5"><span className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-emerald-400/20 text-emerald-300 text-[9px] font-bold">3</span>Extra att fakturera</div>
                      <div className="text-[20px] font-bold text-emerald-300 mb-1">+10 925 kr</div>
                      <Link 
                        to="/consultant/fakturakontroll" 
                        className="text-[10px] text-white/50 hover:text-white flex items-center gap-1 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          trackEvent("product_cta_clicked", { cta: "hero_invoice_card", target: "/consultant/fakturakontroll" });
                        }}
                      >
                        Se hur det fungerar <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  )}
                </div>

                <div className="flex gap-1 mt-3 justify-center">
                  {[0, 1, 2].map((i) => (
                    <div 
                      key={i} 
                      className={`w-1 h-1 rounded-full transition-colors ${invoiceStep === i ? "bg-emerald-300" : "bg-white/20"}`}
                    />
                  ))}
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


      </div>
      {/* ── /Ljus sektion-wrapper ── */}

      {/* ── Footer ──────────────────────────── */}
      <footer className="px-5 sm:px-6 lg:px-10 pt-10 pb-12 border-t border-white/10 bg-[hsl(260_50%_5%_/_0.6)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-8 mb-8">
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
                <Link to="/v1?start=1" className="hover:text-white transition-colors">Löneanalys</Link>
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
          </div>
          <div className="border-t border-white/10 pt-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-white/50">
            <p>© 2026 Compcare</p>
            <p>GDPR-kompatibel · Datan tillhör dig</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
