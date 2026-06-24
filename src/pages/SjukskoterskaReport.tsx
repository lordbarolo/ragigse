import { Link } from "react-router-dom";
import { Separator } from "@/components/ui/separator";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";
import { SEO } from "@/components/SEO";
import { buildRoleReportSchemas } from "@/lib/seo/roleReportSchema";
import PensionImpactSimulator from "@/components/report/PensionImpactSimulator";
import {
  ArrowRight,
  MapPin,
  BarChart3,
  Info,
  PiggyBank,
  FileSearch,
  ClipboardList,
  Calculator,
} from "lucide-react";
import { useEffect } from "react";

/**
 * Rollrapport — Legitimerad sjuksköterska (grundutbildning, nationell)
 * Färgschema matchar startsidans cream/violet (#EEEBE4 / #3D3491).
 * Neutral copy: informerar om SKR-priser, driver inte upp löner.
 * Gäller benämningarna: allmänsjuksköterska, legitimerad sjuksköterska,
 * leg sjuksköterska, sjuksköterska, leg ssk, ssk (utan vidareutbildning).
 */

const LAST_UPDATED = "2026-01-15";
const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

// SKR ramavtal vårdbemanning 2026 — Sjuksköterska grundutbildning (dagtid)
const ZONES = [
  { zone: "Zon 1", rate: 616, desc: "Storstadsregioner (t.ex. Stockholm, Göteborg, Malmö)" },
  { zone: "Zon 2", rate: 660, desc: "Mellanstora regioner" },
  { zone: "Zon 3", rate: 715, desc: "Glesbygd / svårrekryterade områden" },
];

// Övriga roller (ej specialistläkare): bemanningsmarginal 15–20 %
const SHARE_MIN_FORETAGARE = 0.80;
const SHARE_MAX_FORETAGARE = 0.85;
const SHARE_MIN_ANSTALLD = 0.78;
const SHARE_MAX_ANSTALLD = 0.83;
// Arbetsgivaravgifter ~31,42 % — bruttolön = total konsultkostnad / 1,42
const EMPLOYER_FACTOR = 1.42;

const FAQ = [
  {
    question: "Vad är ramavtalspriset för en legitimerad sjuksköterska 2026?",
    answer: `Enligt SKR:s ramavtal vårdbemanning 2026 är kundpriset ${fmt(ZONES[0].rate)}\u00a0kr/h i Zon 1 (storstad), ${fmt(ZONES[1].rate)}\u00a0kr/h i Zon 2 (mellanstora regioner) och ${fmt(ZONES[2].rate)}\u00a0kr/h i Zon 3 (glesbygd) för en sjuksköterska med grundutbildning på dagtid.`,
  },
  {
    question: "Hur stor del av kundpriset går till konsulten?",
    answer: `För sjuksköterskor utan specialistutbildning är bemanningsföretagets marginal typiskt 15–20 % av kundpriset. Som egenföretagare ligger konsultandelen därför på 80–85 % av kundpriset. För anställd via bemanning utgör konsultkostnaden 78–83 % av kundpriset, och av det betalar bolaget först arbetsgivaravgifter (~31,42 %) innan bruttolön betalas ut till konsulten.`,
  },
  {
    question: "Vilken region tillhör vilken zon?",
    answer:
      "SKR delar in landet i tre zoner. Zon 1 omfattar storstadsregionerna, Zon 2 mellanstora regioner och Zon 3 glesbygdsregioner där bemanningsbehovet historiskt varit svårare att täcka.",
  },
  {
    question: "Ingår OB och jour i timpriset?",
    answer:
      "Nej. Priserna ovan är grundpris för normal arbetstid (dagtid). OB-tillägg för kväll, natt, helg och storhelg regleras separat i ramavtalet och läggs ovanpå grundpriset.",
  },
  {
    question: "Vad gäller för leg ssk, allmänsjuksköterska och sjuksköterska?",
    answer:
      "Samtliga benämningar — legitimerad sjuksköterska, leg sjuksköterska, allmänsjuksköterska, sjuksköterska, leg ssk och ssk — avser i ramavtalet samma kategori: sjuksköterska med grundutbildning utan specialist- eller vidareutbildning.",
  },
];

export default function SjukskoterskaReport() {
  const lowZone = ZONES[0].rate;
  const highZone = ZONES[2].rate;

  // Spann baserat på Zon 2 (median) som referens för "marknadsmässigt"
  const refRate = ZONES[1].rate;
  const recMinF = Math.round(refRate * SHARE_MIN_FORETAGARE);
  const recMaxF = Math.round(refRate * SHARE_MAX_FORETAGARE);
  const recMinA = Math.round((refRate * SHARE_MIN_ANSTALLD) / EMPLOYER_FACTOR);
  const recMaxA = Math.round((refRate * SHARE_MAX_ANSTALLD) / EMPLOYER_FACTOR);

  useEffect(() => {
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = "#EEEBE4";
    document.body.style.backgroundColor = "#EEEBE4";
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  const roleSchemas = buildRoleReportSchemas({
    roleName: "Legitimerad sjuksköterska",
    roleSlug: "sjukskoterska",
    dateModified: LAST_UPDATED,
    summary:
      `Ramavtalspriset för en legitimerad sjuksköterska (grundutbildning) är ${fmt(lowZone)}–${fmt(highZone)}\u00a0kr/h beroende på zon enligt SKR:s ramavtal vårdbemanning 2026. ` +
      `Konsultandelen ligger typiskt på 80–85 % av kundpriset för egenföretagare och 78–83 % för anställda konsulter.`,
    rateRange: { min: lowZone, median: refRate, max: highZone, unit: "SEK/h" },
    skrSources: ["https://skr.se/ramavtal/vardbemanning"],
    faq: FAQ,
  });

  const cream = "#EEEBE4";
  const ink = "#0A0A0A";
  const sub = "#6B7280";
  const border = "#E0DBD3";
  const violet = "#3D3491";
  const card = "#FFFFFF";

  return (
    <>
      <SEO
        title="Sjuksköterska – timpris & ersättning 2026 | leg ssk"
        description="Ramavtalspriser per zon och möjlig konsultersättning för legitimerad sjuksköterska (grundutbildning). Källa: SKR:s ramavtal vårdbemanning 2026."
        path="/rapport/sjukskoterska"
        ogType="article"
        jsonLd={roleSchemas}
      />
      <div
        className="min-h-screen"
        style={{
          ["--background" as any]: "40 18% 91%",
          ["--foreground" as any]: "0 0% 4%",
          ["--card" as any]: "0 0% 100%",
          ["--card-foreground" as any]: "0 0% 4%",
          ["--muted" as any]: "40 18% 91%",
          ["--muted-foreground" as any]: "220 9% 46%",
          ["--border" as any]: "35 17% 85%",
          ["--primary" as any]: "247 47% 38%",
          ["--radius" as any]: "12px",
          backgroundColor: cream,
          color: ink,
        }}
      >
        <Navbar />

        {/* Hero */}
        <header
          className="relative overflow-hidden px-5 pt-20 pb-10 sm:pt-24 sm:pb-12"
          style={{ backgroundColor: cream, color: ink }}
        >
          <div className="max-w-lg mx-auto space-y-4 relative z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: sub }}>
              Marknadsrapport 2026
            </p>
            <h1
              className="leading-tight"
              style={{ fontFamily: "Georgia, serif", fontSize: "30px", fontWeight: 700, color: ink }}
            >
              Legitimerad sjuksköterska
            </h1>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1" style={{ fontSize: "13px", color: sub }}>
              <span className="whitespace-nowrap">Nationell översikt</span>
              <span className="w-1 h-1 rounded-full mx-0.5" style={{ backgroundColor: violet }} />
              <span className="whitespace-nowrap">SKR Ramavtal vårdbemanning 2026</span>
            </div>
            <p className="text-[12px] leading-relaxed" style={{ color: sub }}>
              Gäller även benämningarna allmänsjuksköterska, leg sjuksköterska, sjuksköterska,
              leg ssk och ssk — dvs. sjuksköterska utan vidareutbildning.
            </p>
          </div>
        </header>

        <main className="px-4 py-6 max-w-lg mx-auto space-y-2.5">
          {/* TL;DR */}
          <section
            className="rounded-2xl border p-5 space-y-3"
            style={{ backgroundColor: card, borderColor: border }}
          >
            <p
              className="text-[10px] font-semibold tracking-[1.4px] uppercase"
              style={{ color: sub }}
            >
              Sammanfattning
            </p>
            <p style={{ fontFamily: "Georgia, serif", fontSize: "17px", lineHeight: 1.5, color: ink }}>
              Kundpriset för en legitimerad sjuksköterska är{" "}
              <span style={{ color: violet, fontWeight: 700 }}>
                {fmt(lowZone)}–{fmt(highZone)}\u00a0kr/h
              </span>{" "}
              beroende på zon. Konsultandelen ligger typiskt på{" "}
              <span style={{ fontWeight: 600 }}>80–85 %</span> av kundpriset för egenföretagare.
            </p>
            <p className="text-[12px]" style={{ color: sub }}>
              Senast uppdaterad {LAST_UPDATED} · Källa: SKR Ramavtal vårdbemanning 2026
            </p>
          </section>

          {/* Kundpris per zon */}
          <section
            className="rounded-2xl border overflow-hidden"
            style={{ backgroundColor: card, borderColor: border }}
          >
            <div className="px-5 pt-5">
              <p
                className="text-[10px] font-semibold tracking-[1.4px] uppercase"
                style={{ color: sub }}
              >
                Kundpris per zon
              </p>
            </div>
            <div className="mt-3">
              {ZONES.map((z, i) => (
                <div
                  key={z.zone}
                  className="flex items-center justify-between p-3.5 px-5"
                  style={{ borderTop: i > 0 ? `1px solid ${border}` : "none" }}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className="w-4 h-4 shrink-0" style={{ color: sub }} />
                    <div>
                      <p className="text-sm font-semibold" style={{ color: ink }}>
                        {z.zone}
                      </p>
                      <p className="text-[11px]" style={{ color: sub }}>
                        {z.desc}
                      </p>
                    </div>
                  </div>
                  <span
                    className="text-lg font-bold tracking-tight"
                    style={{ fontFamily: "Georgia, serif", color: ink }}
                  >
                    {fmt(z.rate)}
                    <span className="text-xs font-normal" style={{ color: sub }}>
                      {"\u00a0"}kr/h
                    </span>
                  </span>
                </div>
              ))}
            </div>
            <div
              className="px-5 py-3 flex items-start gap-1.5"
              style={{ borderTop: `1px solid ${border}` }}
            >
              <Info className="w-3 h-3 mt-0.5 shrink-0" style={{ color: sub }} />
              <p className="text-[11px]" style={{ color: sub }}>
                Kundpris = vad regionen betalar bemanningsföretaget per arbetad timme. Grundpris exkl.
                OB, jour och beredskap.
              </p>
            </div>
          </section>

          {/* Möjlig konsultersättning */}
          <section
            className="rounded-2xl border p-5"
            style={{ backgroundColor: card, borderColor: border }}
          >
            <p
              className="text-[10px] font-semibold tracking-[1.4px] uppercase mb-3"
              style={{ color: sub }}
            >
              Möjlig konsultersättning · referens Zon 2
            </p>
            <div className="flex items-center gap-3 mb-5">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center"
                style={{ backgroundColor: `${violet}1A` }}
              >
                <BarChart3 className="w-5 h-5" style={{ color: violet }} />
              </div>
              <div>
                <p
                  className="font-bold"
                  style={{ fontFamily: "Georgia, serif", fontSize: "18px", color: ink }}
                >
                  {fmt(recMinF)}–{fmt(recMaxF)}\u00a0kr/h
                </p>
                <p className="text-[11px]" style={{ color: sub }}>
                  Marknadsmässigt spann (eget bolag, Zon 2)
                </p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                {
                  label: "Egenföretagare",
                  share: "Efter bemanningsbolagets marginal på 15–20 %",
                  range: `${fmt(recMinF)}–${fmt(recMaxF)}\u00a0kr/h`,
                },
                {
                  label: "Anställd via bemanning",
                  share: "Bruttolön efter sociala avgifter och tjänstepension",
                  range: `${fmt(recMinA)}–${fmt(recMaxA)}\u00a0kr/h`,
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between rounded-lg px-3.5 py-2.5"
                  style={{ backgroundColor: cream, border: `1px solid ${border}` }}
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: ink }}>
                      {row.label}
                    </p>
                    <p className="text-[11px]" style={{ color: sub }}>
                      {row.share}
                    </p>
                  </div>
                  <span
                    className="text-sm font-bold whitespace-nowrap pl-3"
                    style={{ fontFamily: "Georgia, serif", color: violet }}
                  >
                    {row.range}
                  </span>
                </div>
              ))}
            </div>
            <p
              className="text-[11px] mt-4 flex items-start gap-1.5"
              style={{ color: sub }}
            >
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Bemanningsföretagets marginal kan exempelvis täcka administration, försäkring, resor, boende, introduktion, utbildning och SITHS-kort.
            </p>
          </section>

          {/* Teaser: Pensionskoll (PensionImpactSimulator) */}
          <section
            className="rounded-2xl border p-5"
            style={{ backgroundColor: card, borderColor: border }}
          >
            <div className="flex items-center gap-2 mb-3">
              <PiggyBank className="w-4 h-4" style={{ color: violet }} />
              <p
                className="text-[10px] font-semibold tracking-[1.4px] uppercase"
                style={{ color: sub }}
              >
                Pensionskoll
              </p>
            </div>
            <p className="text-sm leading-relaxed mb-4" style={{ color: ink }}>
              Bruttolön är bara halva bilden. Dra i reglaget för att se hur tjänstepensionen
              förändras vid olika lönenivåer.
            </p>
            <PensionImpactSimulator initialSalary={42000} />
          </section>

          {/* Förhandlingsobservationer (neutral) */}
          <section
            className="rounded-2xl border p-5 space-y-3 text-sm"
            style={{ backgroundColor: card, borderColor: border }}
          >
            <p
              className="text-[10px] font-semibold tracking-[1.4px] uppercase"
              style={{ color: sub }}
            >
              Så läses spannen
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>
                Undre spann:
              </span>{" "}
              <span style={{ color: sub }}>
                {fmt(recMinF)}\u00a0kr/h — utgångspunkt baserat på SKR Zon 2 för en konsult med begränsad tillgänglighet och erfarenhet.
              </span>
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>
                Median:
              </span>{" "}
              <span style={{ color: sub }}>
                {fmt(Math.round((recMinF + recMaxF) / 2))}\u00a0kr/h — typisk nivå för konsulter med
                dokumenterad erfarenhet.
              </span>
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>
                Övre spann:
              </span>{" "}
              <span style={{ color: sub }}>
                {fmt(recMaxF)}\u00a0kr/h — Konsulter med god tillgänglighet och etablerad relation med beställande vårdgivare. Som ej behöver få betald resa, boende eller utbildning.
              </span>
            </p>
          </section>

          {/* FAQ */}
          <section
            className="rounded-2xl border p-5 space-y-4"
            style={{ backgroundColor: card, borderColor: border }}
          >
            <p
              className="text-[10px] font-semibold tracking-[1.4px] uppercase"
              style={{ color: sub }}
            >
              Vanliga frågor
            </p>
            {FAQ.map((item) => (
              <div key={item.question} className="space-y-1.5">
                <p className="text-sm font-semibold" style={{ color: ink }}>
                  {item.question}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: sub }}>
                  {item.answer}
                </p>
              </div>
            ))}
          </section>

          {/* Metod */}
          <section
            className="rounded-2xl border p-5 space-y-2 text-[12px] leading-relaxed"
            style={{ backgroundColor: card, borderColor: border, color: sub }}
          >
            <p
              className="text-[10px] font-semibold tracking-[1.4px] uppercase"
              style={{ color: sub }}
            >
              Beräkningsmetod
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>
                Källa:
              </span>{" "}
              SKR:s ramavtal vårdbemanning 2026, kategori Sjuksköterska grundutbildning (dagtid).
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>
                Marginalmodell:
              </span>{" "}
              Sjuksköterska utan vidareutbildning 15–20 % bemanningsmarginal → konsultandel
              80–85 % (eget bolag) respektive 78–83 % (anställd konsult).
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>
                OB & jour:
              </span>{" "}
              Hanteras separat ovanpå grundpriset enligt SKR-tariff.
            </p>
            <p>
              <span className="font-semibold" style={{ color: ink }}>
                Neutralitet:
              </span>{" "}
              CompCare driver inte upp löner. Vi informerar om publika priser och offentliga
              ramavtal.
            </p>
          </section>

          {/* Verktygsteaser — 3 övriga verktyg */}
          <section className="space-y-2.5 pt-2">
            <p
              className="text-[10px] font-semibold tracking-[1.4px] uppercase px-1"
              style={{ color: sub }}
            >
              Gå vidare med dina egna siffror
            </p>

            <Link
              to="/?yrke=sjukskoterska"
              className="block rounded-2xl border p-5 transition hover:shadow-sm"
              style={{ backgroundColor: card, borderColor: border }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${violet}1A` }}
                >
                  <ClipboardList className="w-5 h-5" style={{ color: violet }} />
                </div>
                <div className="flex-1">
                  <p
                    className="font-bold"
                    style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: ink }}
                  >
                    Personlig rapport
                  </p>
                  <p className="text-sm mt-1" style={{ color: sub }}>
                    Få en rapport baserad på din kommun, anställningsform och nuvarande
                    ersättning.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: violet }} />
              </div>
            </Link>

            <Link
              to="/?yrke=sjukskoterska&fokus=lonekoll"
              className="block rounded-2xl border p-5 transition hover:shadow-sm"
              style={{ backgroundColor: card, borderColor: border }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${violet}1A` }}
                >
                  <FileSearch className="w-5 h-5" style={{ color: violet }} />
                </div>
                <div className="flex-1">
                  <p
                    className="font-bold"
                    style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: ink }}
                  >
                    Lönekoll
                  </p>
                  <p className="text-sm mt-1" style={{ color: sub }}>
                    Jämför din nuvarande ersättning mot ramavtalets spann i din zon.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: violet }} />
              </div>
            </Link>

            <Link
              to="/?yrke=sjukskoterska&fokus=faktura"
              className="block rounded-2xl border p-5 transition hover:shadow-sm"
              style={{ backgroundColor: card, borderColor: border }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${violet}1A` }}
                >
                  <Calculator className="w-5 h-5" style={{ color: violet }} />
                </div>
                <div className="flex-1">
                  <p
                    className="font-bold"
                    style={{ fontFamily: "Georgia, serif", fontSize: "16px", color: ink }}
                  >
                    Faktureringshjälp
                  </p>
                  <p className="text-sm mt-1" style={{ color: sub }}>
                    Låt vår AI-assistent kontrollera att du fakturerat för alla
                    timmar du jobbat.
                  </p>
                </div>
                <ArrowRight className="w-4 h-4 mt-2 shrink-0" style={{ color: violet }} />
              </div>
            </Link>
          </section>

          {/* Primär CTA */}
          <section
            className="rounded-2xl border p-5 text-center space-y-3"
            style={{ backgroundColor: card, borderColor: border }}
          >
            <h2
              className="font-bold"
              style={{ fontFamily: "Georgia, serif", fontSize: "20px", color: ink }}
            >
              Skapa din personliga rapport
            </h2>
            <p className="text-sm leading-relaxed" style={{ color: sub }}>
              Några snabba frågor om kommun, anställningsform och nuvarande ersättning räcker.
              Rapporten är gratis.
            </p>
            <Link
              to="/?yrke=sjukskoterska"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg mt-2"
              style={{ backgroundColor: violet, color: "#FFFFFF" }}
            >
              Starta <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Footer */}
          <div className="pt-4">
            <Separator className="mb-6 opacity-30" />
            <div className="text-center space-y-3 pb-8">
              <CompcareLogo variant="wordmark" className="mx-auto !h-5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Rapporten baseras på SKR:s ramavtal vårdbemanning 2026 och är avsedd som
                vägledning. Faktisk ersättning kan variera beroende på uppdrag, region och
                individuella avtal.
              </p>
              <p className="text-[10px] text-muted-foreground">
                © {new Date().getFullYear()} CompCare.se
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
