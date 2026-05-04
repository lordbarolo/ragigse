import { Link } from "react-router-dom";
import { ArrowLeft, Building2, Calculator, ShieldCheck, FileText, Receipt, TrendingUp, AlertTriangle, CheckCircle2, Briefcase, PiggyBank, Scale, BookOpen } from "lucide-react";

/**
 * EgetBolag — informationssida för läkare & sjuksköterskor som överväger eget bolag.
 * Färgskala: samma som sektion 2 på LandingV2 (ljus #F7F5FB-bakgrund, slate-text,
 * violett accent hsl(256 100% 67%), inslag av cyan/pink för kontrast).
 * Innehåll: skattenivåer, AB vs HB, försäkringar, bokföring (Fortnox/Visma).
 */

const ACCENT = "hsl(256 100% 67%)";
const ACCENT_SOFT = "hsl(256 100% 67% / 0.12)";
const ACCENT_BORDER = "hsl(256 100% 67% / 0.30)";

const TAX_LEVELS = [
  {
    label: "Bolagsskatt",
    value: "20,6 %",
    note: "På vinsten i aktiebolaget innan utdelning",
    icon: Calculator,
  },
  {
    label: "Utdelning inom gränsbelopp (3:12)",
    value: "20 %",
    note: "Förenklingsregeln 2026: ca 217 000 kr/år",
    icon: PiggyBank,
  },
  {
    label: "Utdelning över gränsbelopp",
    value: "~32–52 %",
    note: "Beskattas som tjänst tills brytpunkten",
    icon: TrendingUp,
  },
  {
    label: "Lön till dig själv",
    value: "32–55 %",
    note: "Inkl. kommunalskatt + ev. statlig skatt",
    icon: Briefcase,
  },
];

const COMPARE = [
  {
    feature: "Personligt ansvar",
    ab: { label: "Begränsat till aktiekapitalet (25 000 kr)", good: true },
    hb: { label: "Personligt + solidariskt ansvar", good: false },
  },
  {
    feature: "Skatt på vinst",
    ab: { label: "20,6 % bolagsskatt + 20 % på utdelning", good: true },
    hb: { label: "All vinst beskattas som inkomst av näring (~32–55 %)", good: false },
  },
  {
    feature: "3:12-regler / låg utdelningsskatt",
    ab: { label: "Ja — gränsbelopp ~217 000 kr/år", good: true },
    hb: { label: "Nej", good: false },
  },
  {
    feature: "Lämpligt vid arvode > 60 000 kr/mån",
    ab: { label: "Ja — skatteeffektivt", good: true },
    hb: { label: "Nej — onödigt hög personlig skatt", good: false },
  },
  {
    feature: "Trovärdighet mot vårdgivare",
    ab: { label: "Standard i branschen", good: true },
    hb: { label: "Sällsynt, kan väcka frågor", good: false },
  },
];

const INSURANCES = [
  {
    title: "Patientförsäkring",
    body: "Lagkrav enligt patientskadelagen. Du måste själv teckna den om vårdgivaren inte täcker dig. LÖF + privata bolag som Trygg-Hansa, Länsförsäkringar.",
    required: true,
  },
  {
    title: "Ansvarsförsäkring för verksamheten",
    body: "Skyddar bolaget mot ekonomiska skadeståndskrav. Många upphandlingar kräver minst 10 mkr i ansvarsbelopp.",
    required: true,
  },
  {
    title: "Sjukvårdsförsäkring / privat sjukförsäkring",
    body: "Som egenföretagare har du inget kollektivavtal. Tecknas privat — avdragsgill för bolaget i vissa fall.",
    required: false,
  },
  {
    title: "Tjänstepension",
    body: "Inget tjänstepensionsavtal följer med uppdrag. Sätt av 4,5–10 % av lönen i bolaget. Vanligt: SPP, Avanza Tjänstepension, Söderberg & Partners.",
    required: false,
  },
  {
    title: "Sjukförsäkring (utöver Försäkringskassan)",
    body: "Karensvalet påverkar avgiften. 7 dagars karens är standard, lägre karens ger högre kostnad men snabbare ersättning.",
    required: false,
  },
];

const BOOKKEEPING = [
  {
    name: "Fortnox",
    price: "från ~199 kr/mån",
    points: ["Marknadsledande i Sverige", "Bra integrationer mot bank & Skatteverket", "Enkel fakturering & löneadministration"],
  },
  {
    name: "Visma eEkonomi",
    price: "från ~169 kr/mån",
    points: ["Användarvänligt gränssnitt", "Stark integration med Vismas övriga tjänster", "Automatisk bokföring av banktransaktioner"],
  },
];

const STEPS = [
  { n: "01", title: "Registrera AB", body: "Verksamt.se eller Bolagsverket. Aktiekapital 25 000 kr. Tar 2–4 veckor." },
  { n: "02", title: "F-skatt & moms", body: "Ansök om F-skatt hos Skatteverket. Vårdtjänster är momsbefriade — ingen moms tillkommer." },
  { n: "03", title: "Bokföring & bank", body: "Öppna företagskonto. Välj Fortnox eller Visma. Koppla bank för automatisk import." },
  { n: "04", title: "Försäkringar", body: "Patientförsäkring + ansvarsförsäkring innan första uppdraget. Tjänstepension när lönen är igång." },
  { n: "05", title: "Första lönen", body: "Sätt en rimlig grundlön. Resten kan tas som utdelning året efter (3:12)." },
];

export default function EgetBolag() {
  return (
    <div className="min-h-screen bg-[#F7F5FB] text-slate-900 font-sans">
      {/* ── Top bar ───────────────────────────── */}
      <header className="sticky top-0 z-30 backdrop-blur-md bg-white/80 border-b border-slate-200">
        <div className="max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Tillbaka
          </Link>
          <span className="font-semibold text-[18px] tracking-tight">
            <span className="text-slate-900">comp</span>
            <span style={{ color: ACCENT }}>care</span>
          </span>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────── */}
      <section className="px-5 sm:px-6 lg:px-10 pt-14 md:pt-20 pb-10">
        <div className="max-w-4xl mx-auto text-center">
          <div
            className="inline-flex items-center gap-2 text-[11px] font-semibold tracking-[0.14em] uppercase rounded-full px-3 py-1 mb-6 border"
            style={{ background: ACCENT_SOFT, borderColor: ACCENT_BORDER, color: ACCENT }}
          >
            <Building2 className="w-3 h-3" />
            Starta eget bolag · för läkare & sjuksköterskor
          </div>
          <h1 className="font-bold tracking-tight text-[34px] sm:text-5xl md:text-[56px] leading-[1.05] mb-5">
            Eget bolag, <span style={{ color: ACCENT }}>utan att gissa</span>.
          </h1>
          <p className="text-[16px] sm:text-lg text-slate-600 max-w-[640px] mx-auto leading-relaxed">
            Det här är en orientering — inte juridisk rådgivning. Här är det som faktiskt
            spelar roll: skattenivåerna, valet av bolagsform, försäkringarna du måste ha
            och bokföringen som kan skötas på en kvart i månaden.
          </p>
        </div>
      </section>

      {/* ── 1. Skattenivåer ──────────────────── */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16">
        <div className="max-w-6xl mx-auto">
          <SectionLabel num="01" title="Skattenivåer som styr" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {TAX_LEVELS.map((t) => (
              <div
                key={t.label}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm hover:shadow-md transition-shadow"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                  style={{ background: ACCENT_SOFT }}
                >
                  <t.icon className="w-5 h-5" style={{ color: ACCENT }} />
                </div>
                <div className="text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 mb-1">
                  {t.label}
                </div>
                <div className="text-3xl font-bold tracking-tight tabular-nums mb-2" style={{ color: ACCENT }}>
                  {t.value}
                </div>
                <p className="text-[13px] text-slate-600 leading-relaxed">{t.note}</p>
              </div>
            ))}
          </div>
          <p className="text-[12px] text-slate-500 mt-4 max-w-3xl">
            Tumregel: månadsarvode över ~60 000 kr → aktiebolag blir tydligt mer skatteeffektivt.
            Under det är enskild firma ofta enklare. Källa: Skatteverket 2026.
          </p>
        </div>
      </section>

      {/* ── 2. AB vs HB ──────────────────────── */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16">
        <div className="max-w-6xl mx-auto">
          <SectionLabel num="02" title="Aktiebolag vs handelsbolag" />
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="grid grid-cols-12 gap-0 border-b border-slate-200 bg-slate-50">
              <div className="col-span-12 sm:col-span-4 px-5 py-3 text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500">
                Aspekt
              </div>
              <div
                className="col-span-12 sm:col-span-4 px-5 py-3 text-[11px] font-semibold tracking-[0.12em] uppercase border-l border-slate-200"
                style={{ color: ACCENT }}
              >
                Aktiebolag (AB)
              </div>
              <div className="col-span-12 sm:col-span-4 px-5 py-3 text-[11px] font-semibold tracking-[0.12em] uppercase text-slate-500 border-l border-slate-200">
                Handelsbolag (HB)
              </div>
            </div>
            {COMPARE.map((row, i) => (
              <div
                key={row.feature}
                className={`grid grid-cols-12 gap-0 ${i !== COMPARE.length - 1 ? "border-b border-slate-100" : ""}`}
              >
                <div className="col-span-12 sm:col-span-4 px-5 py-4 text-sm font-semibold text-slate-900">
                  {row.feature}
                </div>
                <div
                  className="col-span-12 sm:col-span-4 px-5 py-4 text-sm text-slate-700 border-l border-slate-100 flex items-start gap-2"
                  style={{ background: ACCENT_SOFT }}
                >
                  <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
                  <span>{row.ab.label}</span>
                </div>
                <div className="col-span-12 sm:col-span-4 px-5 py-4 text-sm text-slate-600 border-l border-slate-100 flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0 text-slate-400" />
                  <span>{row.hb.label}</span>
                </div>
              </div>
            ))}
          </div>
          <div
            className="mt-5 p-5 rounded-xl border flex items-start gap-3"
            style={{ background: ACCENT_SOFT, borderColor: ACCENT_BORDER }}
          >
            <Scale className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
            <p className="text-[14px] text-slate-700 leading-relaxed">
              <strong className="text-slate-900">För konsultarvoden i vården</strong> — där
              månadsbeloppen typiskt ligger på 80 000–250 000 kr — är aktiebolag i princip alltid
              det bättre valet. Du skyddar din privatekonomi och får tillgång till 3:12-reglerna
              som beskattar utdelning till bara 20 %.
            </p>
          </div>
        </div>
      </section>

      {/* ── 3. Försäkringar ──────────────────── */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16">
        <div className="max-w-6xl mx-auto">
          <SectionLabel num="03" title="Försäkringar du behöver" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {INSURANCES.map((ins) => (
              <div
                key={ins.title}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-9 h-9 rounded-lg flex items-center justify-center"
                      style={{ background: ACCENT_SOFT }}
                    >
                      <ShieldCheck className="w-4.5 h-4.5" style={{ color: ACCENT }} />
                    </div>
                    <h3 className="font-semibold text-slate-900">{ins.title}</h3>
                  </div>
                  <span
                    className={`text-[10px] font-semibold tracking-[0.1em] uppercase px-2 py-1 rounded-full ${
                      ins.required
                        ? "text-white"
                        : "bg-slate-100 text-slate-500 border border-slate-200"
                    }`}
                    style={ins.required ? { background: ACCENT } : undefined}
                  >
                    {ins.required ? "Lagkrav" : "Rekommenderas"}
                  </span>
                </div>
                <p className="text-[14px] text-slate-600 leading-relaxed">{ins.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. Bokföring ─────────────────────── */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16">
        <div className="max-w-6xl mx-auto">
          <SectionLabel num="04" title="Bokföring på 15 minuter i månaden" />
          <p className="text-slate-600 max-w-2xl mb-6 text-[15px] leading-relaxed">
            Som konsult har du få men återkommande transaktioner: en faktura ut, en lön ut,
            några utlägg. Två svenska molntjänster sköter detta i sömnen — och vi planerar
            integrationer mot båda.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {BOOKKEEPING.map((b) => (
              <div
                key={b.name}
                className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-xl flex items-center justify-center"
                      style={{ background: ACCENT_SOFT }}
                    >
                      <Receipt className="w-5 h-5" style={{ color: ACCENT }} />
                    </div>
                    <h3 className="font-bold text-slate-900 text-lg">{b.name}</h3>
                  </div>
                  <span className="text-[12px] text-slate-500 tabular-nums">{b.price}</span>
                </div>
                <ul className="space-y-2 mb-4">
                  {b.points.map((p) => (
                    <li key={p} className="flex items-start gap-2 text-[14px] text-slate-700">
                      <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: ACCENT }} />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
                <div
                  className="mt-auto text-[11px] font-semibold tracking-[0.12em] uppercase pt-3 border-t border-slate-100"
                  style={{ color: ACCENT }}
                >
                  Integration planerad
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. Steg för steg ─────────────────── */}
      <section className="px-5 sm:px-6 lg:px-10 pb-20">
        <div className="max-w-6xl mx-auto">
          <SectionLabel num="05" title="Från idé till första fakturan" />
          <div className="relative">
            <div className="absolute left-6 top-2 bottom-2 w-px bg-slate-200 hidden sm:block" />
            <div className="space-y-4">
              {STEPS.map((s) => (
                <div key={s.n} className="relative bg-white rounded-2xl p-5 sm:p-6 border border-slate-200 shadow-sm flex gap-5">
                  <div
                    className="relative z-10 w-12 h-12 rounded-xl flex items-center justify-center font-bold tabular-nums flex-shrink-0"
                    style={{ background: ACCENT_SOFT, color: ACCENT }}
                  >
                    {s.n}
                  </div>
                  <div>
                    <h3 className="font-semibold text-slate-900 mb-1">{s.title}</h3>
                    <p className="text-[14px] text-slate-600 leading-relaxed">{s.body}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ── Disclaimer ───────────────────────── */}
      <section className="px-5 sm:px-6 lg:px-10 pb-16">
        <div className="max-w-4xl mx-auto bg-white rounded-2xl p-6 border border-slate-200 flex items-start gap-3">
          <BookOpen className="w-5 h-5 mt-0.5 flex-shrink-0 text-slate-400" />
          <div className="text-[13px] text-slate-600 leading-relaxed">
            <strong className="text-slate-900">Inte juridisk eller skattemässig rådgivning.</strong>{" "}
            Belopp och regler stämmer per 2026 men kan ändras. För personlig rådgivning — prata
            med en redovisningsbyrå eller skattejurist innan du fattar beslut.
          </div>
        </div>
      </section>

      {/* ── Footer link ──────────────────────── */}
      <footer className="px-5 sm:px-6 lg:px-10 pb-12 text-center">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm font-semibold hover:opacity-80 transition-opacity"
          style={{ color: ACCENT }}
        >
          <ArrowLeft className="w-4 h-4" />
          Tillbaka till startsidan
        </Link>
      </footer>
    </div>
  );
}

function SectionLabel({ num, title }: { num: string; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-6">
      <span
        className="text-[11px] font-semibold tracking-[0.18em] uppercase tabular-nums px-2.5 py-1 rounded-md"
        style={{ background: ACCENT_SOFT, color: ACCENT }}
      >
        {num}
      </span>
      <h2 className="text-[22px] sm:text-[28px] font-bold tracking-tight text-slate-900">{title}</h2>
    </div>
  );
}
