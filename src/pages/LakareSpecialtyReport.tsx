import { Link, useLocation, Navigate } from "@/lib/router-compat";
import { useEffect } from "react";
import { Separator } from "@/components/ui/separator";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";
import { JsonLd } from "@/components/JsonLd";
import { buildRoleReportSchemas } from "@/lib/seo/roleReportSchema";
import PensionImpactSimulator from "@/components/report/PensionImpactSimulator";
import {
  ArrowRight, MapPin, BarChart3, Info, PiggyBank, FileSearch, ClipboardList, Calculator,
} from "lucide-react";
import {
  DOCTOR_SPECIALTY_BY_SLUG,
  type DoctorSpecialtyConfig,
} from "@/data/doctorSpecialtyReports";
import { useCatalogZoneRates } from "@/hooks/useCatalogZoneRates";
import RelateradeSidor from "@/components/report/RelateradeSidor";
import { getRelatedPaths } from "@/data/relatedContent";
import { getReportUpdatedAt } from "@/data/contentFreshness";
import { trackEvent } from "@/lib/trackEvent";


/**
 * Generisk specialistläkar-rapport.
 * Identisk struktur som AllmanmedicinReport men driven av config per slug.
 * Pris-källa: contract_version_rates v1.6 (SKR 2026), verifierat i DB.
 */

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

// Marginalmodell — specialistläkare 10–15 %
const SHARE_MIN_FORETAGARE = 0.85;
const SHARE_MAX_FORETAGARE = 0.90;
const SHARE_MIN_ANSTALLD = 0.83;
const SHARE_MAX_ANSTALLD = 0.88;
const EMPLOYER_FACTOR = 1.38;

function makeFaq(cfg: DoctorSpecialtyConfig, rates: { zone1: number; zone2: number; zone3: number }) {
  return [
    {
      question: `Vad är ramavtalspriset för ${cfg.skrCategory.toLowerCase()} 2026?`,
      answer: `Enligt SKR:s ramavtal vårdbemanning 2026 är kundpriset ${fmt(rates.zone1)} kr/timme i Zon 1 (storstad), ${fmt(rates.zone2)} kr/timme i Zon 2 (mellanstora regioner) och ${fmt(rates.zone3)} kr/timme i Zon 3 (glesbygd).`,
    },

    {
      question: "Hur stor del av kundpriset går till konsulten?",
      answer:
        "Möjlig ersättning redovisas som ett spann per zon i rapporten, med utgångspunkt i regionernas offentliga ramavtal 2026.",
    },
    {
      question: "Vilken region tillhör vilken zon?",
      answer:
        "SKR delar in landet i tre zoner. Zon 1 omfattar storstadsregionerna, Zon 2 mellanstora regioner och Zon 3 glesbygdsregioner där bemanningsbehovet historiskt varit svårare att täcka.",
    },
    {
      question: "Ingår OB och jour i timpriset?",
      answer:
        "Nej. Priserna ovan är grundpris för normal arbetstid. OB-tillägg, jour och beredskap regleras separat i ramavtalet och läggs ovanpå grundpriset.",
    },
  ];
}

export default function LakareSpecialtyReport() {
  const location = useLocation();
  const slug = location.pathname.replace(/^\/rapport\//, "").replace(/\/$/, "");
  const cfg = slug ? DOCTOR_SPECIALTY_BY_SLUG[slug] : undefined;
  const LAST_UPDATED = getReportUpdatedAt(slug);

  // Priserna hämtas live ur contract_version_rates (v1.6); config-värdena är fallback.
  const rates = useCatalogZoneRates(cfg?.skrCategory ?? "", "v1.6", {
    zone1: cfg?.zone1 ?? 0,
    zone2: cfg?.zone2 ?? 0,
    zone3: cfg?.zone3 ?? 0,
  });

  useEffect(() => {
    trackEvent("public_page_viewed", {
      page: "rapport_lakare_specialitet",
      role: cfg?.skrCategory ?? slug,
      slug,
    });
  }, [cfg?.skrCategory, slug]);

  useEffect(() => {
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = "#0b0c10";
    document.body.style.backgroundColor = "#0b0c10";
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  if (!cfg) return <Navigate to="/" replace />;

  const ZONES = [
    { zone: "Zon 1", rate: rates.zone1, desc: "Storstadsregioner (t.ex. Stockholm, Göteborg, Malmö)" },
    { zone: "Zon 2", rate: rates.zone2, desc: "Mellanstora regioner" },
    { zone: "Zon 3", rate: rates.zone3, desc: "Glesbygd / svårrekryterade områden" },
  ];

  const lowZone = rates.zone1;
  const highZone = rates.zone3;
  const refRate = rates.zone2;
  const recMinF = Math.round(refRate * SHARE_MIN_FORETAGARE);
  const recMaxF = Math.round(refRate * SHARE_MAX_FORETAGARE);
  const recMinA = Math.round((refRate * SHARE_MIN_ANSTALLD) / EMPLOYER_FACTOR);
  const recMaxA = Math.round((refRate * SHARE_MAX_ANSTALLD) / EMPLOYER_FACTOR);

  const FAQ = makeFaq(cfg, rates);


  const roleSchemas = buildRoleReportSchemas({
    roleName: cfg.skrCategory,
    roleSlug: cfg.slug,
    dateModified: LAST_UPDATED,
    summary:
      `Ramavtalspriset för ${cfg.skrCategory.toLowerCase()} är ${fmt(lowZone)}–${fmt(highZone)} kr/timme beroende på zon enligt SKR:s ramavtal vårdbemanning 2026. `,
    rateRange: { min: lowZone, median: refRate, max: highZone, unit: "SEK/h" },
    skrSources: ["https://www.vgregion.se/ov/hyrpersonal/avtal-och-dokument/"],
    faq: FAQ,
    relatedPaths: getRelatedPaths(cfg.slug),
  });

  const cream = "#0b0c10";
  const ink = "#ffffff";
  const sub = "#8a8c94";
  const border = "#22232b";
  const violet = "#22232b";
  const accent = "#ffffff";
  const card = "#121319";

  return (
    <>
      <JsonLd data={roleSchemas} />
      <div
        className="min-h-screen"
        style={{
          ["--background" as any]: "228 18% 5%",
          ["--foreground" as any]: "0 0% 100%",
          ["--card" as any]: "231 16% 9%",
          ["--card-foreground" as any]: "0 0% 100%",
          ["--muted" as any]: "231 16% 12%",
          ["--muted-foreground" as any]: "228 6% 62%",
          ["--border" as any]: "230 10% 17%",
          ["--primary" as any]: "0 0% 100%",
          ["--radius" as any]: "12px",
          backgroundColor: cream,
          color: ink,
        }}
      >
        <Navbar />

        <header className="relative overflow-hidden px-5 pt-20 pb-10 sm:pt-24 sm:pb-12" style={{ backgroundColor: cream, color: ink }}>
          <div className="max-w-lg mx-auto space-y-4 relative z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: sub }}>
              Marknadsrapport 2026
            </p>
            <h1 className="leading-tight" style={{ fontFamily: "Georgia, serif", fontSize: "30px", fontWeight: 700, color: ink }}>
              {cfg.title}
            </h1>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1" style={{ fontSize: "13px", color: sub }}>
              <span className="whitespace-nowrap">Nationell översikt</span>
              <span className="w-1 h-1 rounded-full mx-0.5" style={{ backgroundColor: violet }} />
              <span className="whitespace-nowrap">SKR Ramavtal vårdbemanning 2026</span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 max-w-lg mx-auto space-y-2.5">
          {/* TL;DR */}
          <section className="rounded-2xl border p-5 space-y-3" style={{ backgroundColor: card, borderColor: border }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: sub }}>Sammanfattning</p>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "17px", lineHeight: 1.5, color: ink }}>
              Kundpriset för {cfg.skrCategory.toLowerCase()} är{" "}
              <span style={{ color: accent, fontWeight: 700 }}>{fmt(lowZone)}–{fmt(highZone)} kr/timme</span>{" "}
              beroende på zon. Konsultandelen ligger typiskt på{" "}
              redovisad som ett spann per zon.
            </p>
            <p className="text-[12px]" style={{ color: sub }}>
               Senast uppdaterad {LAST_UPDATED} · Källa:{" "}
               <a
                 href="https://www.vgregion.se/ov/hyrpersonal/avtal-och-dokument/"
                 target="_blank"
                 rel="noopener noreferrer"
                 style={{ color: sub, textDecoration: "underline" }}
               >
                 SKR Ramavtal vårdbemanning 2026
               </a>
             </p>
          </section>

          {/* Kundpris per zon */}
          <section className="rounded-2xl border overflow-hidden" style={{ backgroundColor: card, borderColor: border }}>
            <div className="px-5 pt-5">
              <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: sub }}>Kundpris per zon</p>
            </div>
            <div className="mt-3">
              {ZONES.map((z, i) => (
                <div key={z.zone} className="flex items-center justify-between p-3.5 px-5" style={{ borderTop: i > 0 ? `1px solid ${border}` : "none" }}>
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: sub }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: ink }}>{z.zone}</p>
                      <p className="text-[11px]" style={{ color: sub }}>{z.desc}</p>
                    </div>
                  </div>
                  <span className="text-lg font-bold tracking-tight" style={{ fontFamily: "Georgia, serif", color: ink }}>
                    {fmt(z.rate)} <span className="text-xs font-normal" style={{ color: sub }}>kr/timme</span>
                  </span>
                </div>
              ))}
            </div>
            <div className="px-5 py-3 flex items-start gap-1.5" style={{ borderTop: `1px solid ${border}` }}>
              <Info className="w-3 h-3 mt-0.5 shrink-0" style={{ color: sub }} />
              <p className="text-[11px]" style={{ color: sub }}>
                Kundpris = vad regionen betalar bemanningsföretaget per arbetad timme. Grundpris exkl. OB, jour och beredskap.
              </p>
            </div>
          </section>

          {/* Möjlig konsultersättning */}
          <section className="rounded-2xl border p-5" style={{ backgroundColor: card, borderColor: border }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase mb-3" style={{ color: sub }}>
              Möjlig konsultersättning · referens Zon 2
            </p>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: `${violet}1A` }}>
                <BarChart3 className="w-5 h-5" style={{ color: accent }} />
              </div>
              <div>
                <p className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: ink }}>
                  {fmt(recMinF)}–{fmt(recMaxF)} kr/timme
                </p>
                <p className="text-[11px]" style={{ color: sub }}>Marknadsmässigt spann (eget bolag, Zon 2)</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Egenföretagare", share: "Möjlig ersättning", range: `${fmt(recMinF)}–${fmt(recMaxF)} kr/timme` },
                { label: "Anställd via bemanning", share: "Bruttolön efter sociala avgifter och tjänstepension", range: `${fmt(recMinA)}–${fmt(recMaxA)} kr/timme` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg px-3.5 py-2.5" style={{ backgroundColor: cream, border: `1px solid ${border}` }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: ink }}>{row.label}</p>
                    <p className="text-[11px]" style={{ color: sub }}>{row.share}</p>
                  </div>
                  <span className="text-sm font-bold whitespace-nowrap pl-3" style={{ fontFamily: "Georgia, serif", color: accent }}>
                    {row.range}
                  </span>
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-4 flex items-start gap-1.5" style={{ color: sub }}>
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
            </p>
          </section>

          {/* Pensionskoll */}
          <section className="rounded-2xl border p-5" style={{ backgroundColor: card, borderColor: border }}>
            <div className="flex items-center gap-2 mb-3">
              <PiggyBank className="w-4 h-4" style={{ color: accent }} />
              <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: sub }}>Pensionskoll</p>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: ink }}>
              Bruttolön är bara halva bilden. Dra i reglaget för att se hur tjänstepensionen förändras vid olika lönenivåer.
            </p>
            <PensionImpactSimulator initialSalary={95000} />
          </section>

          {/* Spann-förklaring */}
          <section className="rounded-2xl border p-5 space-y-3 text-sm" style={{ backgroundColor: card, borderColor: border }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: sub }}>Så läses spannen</p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>Undre spann:</span>{" "}
              <span style={{ color: sub }}>
                {fmt(recMinF)} kr/timme — utgångspunkt baserat på SKR Zon 2 för en konsult med begränsad tillgänglighet och erfarenhet.
              </span>
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>Median:</span>{" "}
              <span style={{ color: sub }}>
                {fmt(Math.round((recMinF + recMaxF) / 2))} kr/timme — typisk nivå för konsulter med dokumenterad erfarenhet.
              </span>
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>Övre spann:</span>{" "}
              <span style={{ color: sub }}>
                {fmt(recMaxF)} kr/timme — konsulter med god tillgänglighet och etablerad relation med beställande vårdgivare, som inte behöver betald resa, boende eller utbildning.
              </span>
            </p>
          </section>

          {/* FAQ */}
          <section className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: card, borderColor: border }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: sub }}>Vanliga frågor</p>
            {FAQ.map((item) => (
              <div key={item.question} className="space-y-1.5">
                <p className="text-sm font-semibold" style={{ color: ink }}>{item.question}</p>
                <p className="text-sm leading-relaxed" style={{ color: sub }}>{item.answer}</p>
              </div>
            ))}
          </section>

          {/* Metod */}
          <section className="rounded-2xl border p-5 space-y-2 text-[12px] leading-relaxed" style={{ backgroundColor: card, borderColor: border, color: sub }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: sub }}>Beräkningsmetod</p>
            <p><span className="font-semibold" style={{ color: ink }}>Källa:</span> <a href="https://www.vgregion.se/ov/hyrpersonal/avtal-och-dokument/" target="_blank" rel="noopener noreferrer" style={{ color: sub, textDecoration: "underline" }}>SKR:s ramavtal vårdbemanning 2026</a>, kategori {cfg.skrCategory}.</p>
            <p><span className="font-semibold" style={{ color: ink }}>OB & jour:</span> Hanteras separat ovanpå grundpriset enligt SKR-tariff.</p>
            <p><span className="font-semibold" style={{ color: ink }}>Neutralitet:</span> vårdbemanning.ai driver inte upp löner. Vi informerar om publika priser och offentliga ramavtal.</p>
          </section>

          {/* Verktygsteaser */}
          <section className="space-y-2.5 pt-2">
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase px-1" style={{ color: sub }}>Gå vidare med dina egna siffror</p>

            <Link to={`/?yrke=${cfg.prefillSlug}&fokus=faktura`} className="block rounded-2xl border p-5 transition hover:shadow-xs" style={{ backgroundColor: card, borderColor: border }}>
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: `${violet}1A` }}>
                  <Calculator className="w-5 h-5" style={{ color: accent }} />
                </div>
                <div className="flex-1">
                  <p className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: ink }}>Faktureringshjälp</p>
                  <p className="text-sm mt-1" style={{ color: sub }}>Låt vår AI-assistent kontrollera att du fakturerat för alla timmar du jobbat.</p>
                </div>
                <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: accent }} />
              </div>
            </Link>
          </section>

          {/* Relaterade roller och underlag */}
          <RelateradeSidor currentSlug={cfg.slug} prefillSlug={cfg.prefillSlug} />

          {/* Primär CTA */}
          <section className="rounded-2xl border p-5 text-center space-y-3" style={{ backgroundColor: card, borderColor: border }}>
            <h2 className="font-bold" style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: ink }}>
              Skapa din personliga rapport
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: sub }}>
              Några snabba frågor om kommun, anställningsform och nuvarande ersättning räcker. Rapporten är gratis.
            </p>
            <Link to={`/?yrke=${cfg.prefillSlug}`} className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg mt-2" style={{ backgroundColor: "#ffffff", color: "#0b0c10" }}>
              Starta <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

          <div className="pt-4">
            <Separator className="mb-6 opacity-30" />
            <div className="text-center space-y-3 pb-8">
              <CompcareLogo variant="wordmark" className="mx-auto !h-5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Rapporten baseras på SKR:s ramavtal vårdbemanning 2026 och är avsedd som vägledning. Faktisk ersättning kan variera beroende på uppdrag, region och individuella avtal.
              </p>
              <p className="text-[10px] text-muted-foreground">© {new Date().getFullYear()} vårdbemanning.ai</p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
