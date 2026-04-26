import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Menu, X, ShieldCheck, Lock, FileLock2, Database, MapPin, History } from "lucide-react";
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

const HOW_IT_WORKS = [
  {
    num: "01",
    title: "Välj din roll",
    desc: "Specialitet och ort i två klick. Inga formulär, ingen registrering.",
  },
  {
    num: "02",
    title: "Få ditt spann",
    desc: "Median, undre och övre intervall direkt — baserat på SKR:s ramavtal 2026.",
  },
  {
    num: "03",
    title: "Förhandla med data",
    desc: "Konkreta argument för nästa samtal med uppdragsgivaren.",
  },
];

type ProductCard = {
  step: string;
  title: string;
  tagline: string;
  desc: string;
  tag: string;
  tagColor: "purple" | "amber" | "green" | "muted";
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
    tagColor: "green",
    href: "/v1?start=1",
    cta: "Gör analysen",
  },
  {
    step: "02",
    title: "Uppdragsradar",
    tagline: "Hitta rätt uppdrag",
    desc: "AI-prognoser baserade på 30 000+ historiska avrop. Vi förutsäger när och var nästa uppdrag dyker upp inom din specialitet.",
    tag: "Beta",
    tagColor: "purple",
    href: "/uppdragsradar",
    cta: "Se prognoser",
  },
  {
    step: "03",
    title: "Förhandlingsagent",
    tagline: "Vinn förhandlingen",
    desc: "AI-assistent som ger dig argumenten i realtid. Branschspecifik kunskap, neutral analys, konkreta nästa steg.",
    tag: "Premium · 99 kr/mån",
    tagColor: "amber",
    href: "/consultant/forhandla",
    cta: "Starta",
  },
];

type InfraCard = {
  title: string;
  desc: string;
  href: string;
};

const INFRASTRUCTURE: InfraCard[] = [
  {
    title: "Dokhus",
    desc: "Säker lagring och tidsbegränsad delning av legitimation, intyg och CV.",
    href: "/dokhus-info",
  },
  {
    title: "Ref-ID",
    desc: "Dina referenser lämnar uppgifter en gång. Du styr vem som får tillgång och när.",
    href: "/referenser-info",
  },
  {
    title: "Fakturagranskning",
    desc: "AI granskar fakturor från senaste 2 åren. Hittar vi inget — kostar det ingenting.",
    href: "/consultant/fakturakontroll",
  },
];

const TRUST_POINTS = [
  { icon: ShieldCheck, title: "BankID-verifiering", note: "Aktiveras inom kort", muted: true },
  { icon: Lock, title: "GDPR-kompatibel", note: "All data lagras inom EU" },
  { icon: FileLock2, title: "Aldrig till tredje part", note: "Vi säljer inte din data till bemanningsföretag" },
];

const TAG_COLORS: Record<string, string> = {
  purple: "bg-[#EEEDFE] text-[#3C3489] border-[rgba(83,74,183,0.2)]",
  amber: "bg-[#FAEEDA] text-[#854F0B] border-[rgba(186,117,23,0.2)]",
  green: "bg-[#EAF3DE] text-[#3B6D11] border-[rgba(59,109,17,0.2)]",
  muted: "bg-[#F2F1F8] text-muted-foreground border-border/40",
};

/* ───────────────────── component ──────────────── */
export default function LandingV2() {
  useTimeOnPage("landing");
  const [menuOpen, setMenuOpen] = useState(false);
  useEffect(() => {
    trackEvent("landing_viewed");
  }, []);

  return (
    <div className="w-full bg-[#F2F1F8] text-foreground font-sans">

      {/* ── Nav ─────────────────────────────── */}
      <nav className="relative flex items-center justify-between px-5 sm:px-6 lg:px-10 h-[60px] bg-white border-b border-border/40">
        <Link to="/" aria-label="CompCare startsida">
          <CompcareLogo variant="wordmark" />
        </Link>
        <div className="flex items-center gap-2 sm:gap-3">
          <Link to="/logga-in">
            <button className="text-sm px-3 sm:px-4 py-2 border border-border rounded-lg bg-transparent text-foreground hover:bg-muted/40 transition-colors">
              Logga in
            </button>
          </Link>
          <button
            type="button"
            aria-label={menuOpen ? "Stäng meny" : "Öppna meny"}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex items-center justify-center h-9 w-9 rounded-lg border border-border text-foreground hover:bg-muted/50 transition-colors"
          >
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        {menuOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/30 z-40"
              onClick={() => setMenuOpen(false)}
              aria-hidden="true"
            />
            <div className="absolute top-full right-4 lg:right-10 mt-2 w-72 bg-white border border-border rounded-xl shadow-lg z-50 overflow-hidden">
              <div className="flex flex-col py-2">
                {NAV_LINKS.map((l) => (
                  <Link
                    key={l.label}
                    to={l.href}
                    onClick={() => setMenuOpen(false)}
                    className="px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors"
                  >
                    {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </>
        )}
      </nav>

      {/* ═══════════════════ 1. HERO med inline-form ═══════════════════ */}
      <section className="relative min-h-[560px] md:min-h-[600px] flex flex-col items-start overflow-hidden px-5 sm:px-6 lg:px-10">
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
          className="absolute inset-0 opacity-5"
          style={{
            backgroundImage:
              "repeating-linear-gradient(0deg,transparent,transparent 39px,#fff 39px,#fff 40px),repeating-linear-gradient(90deg,transparent,transparent 39px,#fff 39px,#fff 40px)",
          }}
        />

        <div className="relative z-10 w-full max-w-[760px] mx-auto md:mx-0 pt-14 md:pt-24 pb-12 md:pb-20">
          <div className="inline-flex items-center gap-1.5 text-[11px] sm:text-xs font-medium text-[#AFA9EC] bg-[rgba(83,74,183,0.2)] border border-[rgba(127,119,221,0.35)] rounded-full px-3 py-1 mb-5 uppercase tracking-wider">
            <svg width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="#AFA9EC" /></svg>
            För läkare &amp; sjuksköterskor
          </div>
          <h1 className="font-bold leading-[1.05] text-white mb-5 tracking-tight text-[34px] sm:text-5xl md:text-[56px]">
            Vet du vad du<br />är värd?
          </h1>
          <p className="text-[16px] sm:text-lg text-white/[0.78] leading-relaxed mb-8 max-w-[480px]">
            Aktuella ersättningar för alla bemanningsuppdrag — direkt från SKR:s ramavtal 2026. Inget formulär, ingen registrering.
          </p>
          <HeroInlineForm />
          <p className="mt-4 text-[12px] text-white/45">
            Anonymt · Klart på 60 sekunder · Vi sparar inte dina uppgifter
          </p>
        </div>
      </section>

      {/* ═══════════════════ 2. DATAKREDIBILITET ═══════════════════ */}
      <section className="bg-white border-b border-border/40 py-10 md:py-14 px-5 sm:px-6 lg:px-10">
        <div className="max-w-5xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-8">
            {DATA_STATS.map((s) => (
              <div key={s.label} className="flex items-start sm:flex-col gap-3 sm:gap-2">
                <div className="w-10 h-10 rounded-lg bg-[#EEEDFE] flex items-center justify-center shrink-0">
                  <s.icon className="w-5 h-5 text-[#3C3489]" />
                </div>
                <div>
                  <div className="text-[26px] sm:text-[32px] font-bold text-foreground leading-none">{s.num}</div>
                  <div className="text-[13px] text-muted-foreground mt-1.5">{s.label}</div>
                </div>
              </div>
            ))}
          </div>
          <p className="text-[12px] sm:text-[13px] text-muted-foreground text-center mt-6 sm:mt-8">
            All data från SKR:s ramavtal 2026 — ingen tredjeparts-skattning.
          </p>
        </div>
      </section>

      {/* ═══════════════════ 3. HUR DET FUNGERAR ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="mb-10 md:mb-12 text-center">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#534AB7] bg-[#EEEDFE] border border-[rgba(83,74,183,0.2)] rounded-full px-3.5 py-1 mb-4">
              Hur det fungerar
            </span>
            <h2 className="font-serif text-[28px] sm:text-[34px] font-bold leading-[1.15] tracking-tight text-foreground">
              Tre steg från fråga till svar
            </h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
            {HOW_IT_WORKS.map((s, i) => (
              <div key={s.num} className="relative bg-white border border-border/60 rounded-2xl p-6 md:p-7">
                <div className="text-[12px] font-semibold tracking-wider text-[#534AB7] mb-3">{s.num}</div>
                <h3 className="text-[17px] font-semibold text-foreground mb-2">{s.title}</h3>
                <p className="text-[14px] text-muted-foreground leading-relaxed">{s.desc}</p>
                {i < HOW_IT_WORKS.length - 1 && (
                  <div className="hidden md:block absolute top-1/2 -right-3 w-6 h-px bg-border" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 4. PRIMÄR PRODUKTTRAPPA ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 py-16 md:py-20 bg-white border-y border-border/40">
        <div className="max-w-6xl mx-auto">
          <div className="mb-10 md:mb-14">
            <span className="inline-block text-[11px] font-semibold uppercase tracking-[0.1em] text-[#534AB7] bg-[#EEEDFE] border border-[rgba(83,74,183,0.2)] rounded-full px-3.5 py-1 mb-4">
              Konsultplattformen
            </span>
            <h2 className="font-serif text-[28px] sm:text-[34px] font-bold leading-[1.15] tracking-tight text-foreground mb-2.5">
              Från svar till resultat
            </h2>
            <p className="text-[15px] text-muted-foreground max-w-[560px]">
              Tre steg som bygger på varandra. Varje verktyg är fristående — eller del av en längre resa.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 md:gap-6">
            {PRIMARY_PRODUCTS.map((p) => (
              <article
                key={p.title}
                className="bg-[#FAFAF8] border border-border/60 rounded-[18px] p-7 flex flex-col hover:border-[rgba(83,74,183,0.35)] hover:shadow-[0_8px_28px_rgba(83,74,183,0.08)] transition-all"
              >
                <div className="flex items-baseline gap-3 mb-4">
                  <span className="text-[13px] font-bold tracking-wider text-[#534AB7]">{p.step}</span>
                  <span className={`inline-block text-[11px] font-medium px-2.5 py-0.5 rounded-full border ${TAG_COLORS[p.tagColor]}`}>{p.tag}</span>
                </div>
                <h3 className="text-[20px] font-bold text-foreground mb-1 leading-tight">{p.title}</h3>
                <p className="text-[13px] font-medium text-[#534AB7] mb-3 italic">{p.tagline}</p>
                <p className="text-[14px] text-foreground/80 leading-[1.65] flex-1 mb-5">{p.desc}</p>
                <Link
                  to={p.href}
                  onClick={() => trackEvent("product_cta_clicked", { cta: `primary_${p.title.toLowerCase()}`, target: p.href })}
                  className="text-[14px] font-semibold text-[#534AB7] hover:text-[#3C3489] inline-flex items-center gap-1.5 transition-colors"
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
            <h2 className="text-[18px] sm:text-[20px] font-semibold text-foreground mb-1.5">
              Bakomliggande infrastruktur
            </h2>
            <p className="text-[13px] text-muted-foreground max-w-[480px]">
              Stödverktyg som du också får tillgång till — när du är redo.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            {INFRASTRUCTURE.map((c) => (
              <Link
                key={c.title}
                to={c.href}
                className="bg-white/60 border border-border/40 rounded-xl p-5 hover:bg-white hover:border-border transition-all group"
              >
                <h3 className="text-[15px] font-semibold text-foreground mb-1.5 inline-flex items-center gap-1.5">
                  {c.title}
                  <ArrowRight className="w-3.5 h-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                </h3>
                <p className="text-[13px] text-muted-foreground leading-relaxed">{c.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ 6. FÖRTROENDE ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 pb-14 md:pb-20">
        <div className="max-w-5xl mx-auto bg-white border border-border/60 rounded-2xl p-7 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8">
            {TRUST_POINTS.map((t) => (
              <div key={t.title} className="flex items-start gap-3">
                <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${t.muted ? "bg-muted text-muted-foreground" : "bg-[#EAF3DE] text-[#3B6D11]"}`}>
                  <t.icon className="w-5 h-5" />
                </div>
                <div>
                  <div className="text-[14px] font-semibold text-foreground inline-flex items-center gap-2 flex-wrap">
                    {t.title}
                    {t.muted && (
                      <span className="text-[10px] font-medium uppercase tracking-wider px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        {t.note}
                      </span>
                    )}
                  </div>
                  {!t.muted && (
                    <p className="text-[13px] text-muted-foreground mt-1 leading-relaxed">{t.note}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ═══════════════════ B2B-CTA-rad ═══════════════════ */}
      <section className="px-5 sm:px-6 lg:px-10 pb-14">
        <div className="max-w-5xl mx-auto bg-[#0B2A6B] rounded-xl px-6 md:px-8 py-6 md:py-7 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="md:max-w-[640px]">
            <h3 className="text-[17px] sm:text-[19px] font-semibold text-white leading-snug mb-1.5">
              Sluta gissa på priset inför nästa avrop
            </h3>
            <p className="text-[13.5px] sm:text-[14px] text-white/80 leading-relaxed">
              Vi visar vad marknaden faktiskt betalar — från den dolda zonskillnaden på 386 kr/h till prisskillnader mellan privata och offentliga aktörer. Se hur ni undviker de tilldelningsavvisningar som kostar mer än ni tror genom att säkra er representation digitalt.
            </p>
          </div>
          <Link
            to="/for-bemanningsforetag"
            onClick={() => trackEvent("product_cta_clicked", { cta: "b2b_footer_cta", target: "/for-bemanningsforetag" })}
            className="self-start md:self-auto bg-[#2563EB] hover:bg-[#1D4ED8] text-white text-[14px] font-semibold rounded-lg px-5 py-2.5 inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
          >
            Utforska CompCare Business <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* ── Footer ──────────────────────────── */}
      <footer className="px-5 sm:px-6 lg:px-10 pt-10 pb-12 border-t border-border/40 bg-white">
        <div className="max-w-6xl mx-auto">
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
              <h4 className="text-xs font-medium uppercase tracking-widest text-muted-foreground mb-3">Konsult</h4>
              <div className="flex flex-col gap-2 text-[13px] text-muted-foreground">
                <Link to="/v1?start=1" className="hover:text-foreground transition-colors">Lönanalys</Link>
                <Link to="/uppdragsradar" className="hover:text-foreground transition-colors">Uppdragsradar</Link>
                <Link to="/consultant/forhandla" className="hover:text-foreground transition-colors">Förhandlingsagent</Link>
                <Link to="/consultant/fakturakontroll" className="hover:text-foreground transition-colors">Fakturagranskning</Link>
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
                <Link to="/for-bemanningsforetag" className="hover:text-foreground transition-colors">
                  <span className="text-foreground font-medium">CompCare Insight</span> — beslutsstöd för prissättning baserat på aktuella tilldelningsdata
                </Link>
                <Link to="/for-bemanningsforetag" className="hover:text-foreground transition-colors">
                  <span className="text-foreground font-medium">CompCare Verify</span> — digital exklusivitet som eliminerar risk för dubbelpresentationer
                </Link>
                <Link to="/for-bemanningsforetag" className="hover:text-foreground transition-colors">
                  <span className="text-foreground font-medium">Intygsmodulen</span> — juridiskt hållbara konsultbekräftelser enligt nationella krav
                </Link>
                <Link to="/registrera/bemanning" className="hover:text-foreground transition-colors">
                  <span className="text-foreground font-medium">Bli partner</span> — kontakta oss för integration och tidig access
                </Link>
              </div>
            </div>
          </div>
          <div className="border-t border-border/40 pt-5 flex flex-col md:flex-row justify-between items-center gap-2 text-xs text-muted-foreground">
            <p>© 2026 CompCare — Piemonte Invest AB</p>
            <p>GDPR-kompatibel · Datan tillhör dig</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
