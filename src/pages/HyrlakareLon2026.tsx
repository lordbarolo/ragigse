import { useEffect } from "react";
import { Link } from "@/lib/router-compat";
import Navbar from "@/components/Navbar";
import Footer5c from "@/components/startsida5c/Footer5c";
import { JsonLd } from "@/components/JsonLd";
import { DOCTOR_SPECIALTY_REPORTS } from "@/data/doctorSpecialtyReports";
import { GUIDE_BY_SLUG } from "@/data/guides";
import {
  SPECIALIST_DOCTOR_SHARE_MIN,
  SPECIALIST_DOCTOR_SHARE_MAX,
} from "@/lib/calc";

/**
 * Guidesida: "Hyrläkare lön 2026".
 *
 * Ren presentation. Alla priser kommer från src/data/doctorSpecialtyReports.ts
 * (spegling av contract_version_rates v1.6, SKR:s ramavtal vårdbemanning 2026).
 * Inga nya siffror, ingen ny affärslogik.
 */

const GUIDE = GUIDE_BY_SLUG["hyrlakare-lon-2026"]!;

const BG = "#0b0c10";
const CARD = "#121319";
const BORDER = "#22232b";
const INK = "#ffffff";
const SUB = "#8a8c94";
const SOFT = "#b8bac2";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });
const lo = (rate: number) => Math.round(rate * SPECIALIST_DOCTOR_SHARE_MIN);
const hi = (rate: number) => Math.round(rate * SPECIALIST_DOCTOR_SHARE_MAX);

/** Allmänmedicin har en egen handskriven rapportsida och ligger inte i listan. */
const ROWS = [
  {
    slug: "lakare-allmanmedicin",
    title: "Allmänmedicin (distriktsläkare)",
    zone1: 1238,
    zone2: 1513,
    zone3: 1787,
  },
  ...DOCTOR_SPECIALTY_REPORTS.map((r) => ({
    slug: r.slug,
    title: r.title,
    zone1: r.zone1,
    zone2: r.zone2,
    zone3: r.zone3,
  })),
];

const allZone1 = ROWS.map((r) => r.zone1);
const allZone3 = ROWS.map((r) => r.zone3);
const LOWEST = Math.min(...allZone1);
const HIGHEST = Math.max(...allZone3);
const PAY_LOW = lo(LOWEST);
const PAY_HIGH = hi(HIGHEST);

const ZONES = [
  {
    zone: "Zon 1",
    desc: "Storstadsregioner — Stockholm, Göteborg, Malmö och kringliggande kommuner.",
  },
  {
    zone: "Zon 2",
    desc: "Mellanstora regioner och orter utanför storstadsområdena.",
  },
  {
    zone: "Zon 3",
    desc: "Glesbygd och svårrekryterade områden, där ramavtalspriset är högst.",
  },
];

const FAQ = [
  {
    question: "Vad tjänar en hyrläkare per timme 2026?",
    answer: `Ramavtalspriset som regionen betalar bemanningsbolaget ligger 2026 mellan ${fmt(LOWEST)} och ${fmt(HIGHEST)} kr/timme beroende på specialitet och zon. För en läkare som fakturerar via eget bolag motsvarar det ungefär ${fmt(PAY_LOW)}–${fmt(PAY_HIGH)} kr/timme, eftersom bemanningsbolaget behåller en marginal på 10–15 procent.`,
  },
  {
    question: "Vilken specialitet har högst ersättning 2026?",
    answer: `Den högsta prisnivån i ramavtalet 2026 är ${fmt(HIGHEST)} kr/timme i zon 3 och gäller bland annat psykiatri, barn- och ungdomspsykiatri, radiologi, dermatologi och ögonsjukdomar. Övriga specialiteter i tabellen ligger på nivån ${fmt(1787)} kr/timme i zon 3.`,
  },
  {
    question: "Vad är skillnaden mellan zon 1, 2 och 3?",
    answer:
      "Zonerna speglar var uppdraget utförs. Zon 1 är storstadsregionerna, zon 2 mellanstora regioner och zon 3 glesbygd och svårrekryterade områden. Priset stiger med zonen eftersom uppdragen längre från storstäderna historiskt varit svårare att bemanna.",
  },
  {
    question: "Ingår OB, jour och beredskap i timpriset?",
    answer:
      "Nej. Priserna i tabellen är grundpris för normal arbetstid. OB-tillägg, jour och beredskap regleras separat i ramavtalet och läggs ovanpå grundpriset.",
  },
  {
    question: "Skiljer sig ersättningen mellan eget bolag och anställning?",
    answer:
      "Ja. Som företagare fakturerar du ett timpris där semester, pension, försäkringar och sociala avgifter ska rymmas. Som anställd i ett bemanningsbolag betalar arbetsgivaren dessa kostnader ovanpå din lön, vilket gör att timlönen blir lägre än fakturapriset även vid samma ramavtalspris.",
  },
  {
    question: "Kan man förhandla över ramavtalspriset?",
    answer:
      "Ramavtalspriset är regionens tak mot bemanningsbolaget. Det som förhandlas är hur stor del av priset som går till dig som konsult, samt villkor som restid, boende, jourersättning och uppdragslängd.",
  },
  {
    question: "Var kommer siffrorna ifrån?",
    answer:
      "Samtliga priser är hämtade ur SKR:s ramavtal för vårdbemanning 2026 (läkarlistan v1.6). Vi publicerar inga egna löneuppskattningar och använder inte lönestatistik från andra källor för konsultersättning.",
  },
];

export default function HyrlakareLon2026() {
  useEffect(() => {
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = BG;
    document.body.style.backgroundColor = BG;
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  const schemas: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: GUIDE.metaTitle,
      description: GUIDE.metaDescription,
      inLanguage: "sv-SE",
      dateModified: GUIDE.lastUpdated,
      mainEntityOfPage: {
        "@type": "WebPage",
        "@id": `https://vardbemanning.ai/guide/${GUIDE.slug}`,
      },
      publisher: {
        "@type": "Organization",
        name: "vårdbemanning.ai",
        url: "https://vardbemanning.ai",
      },
      citation: "SKR:s ramavtal vårdbemanning 2026",
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ.map((f) => ({
        "@type": "Question",
        name: f.question,
        acceptedAnswer: { "@type": "Answer", text: f.answer },
      })),
    },
  ];

  const th: React.CSSProperties = {
    textAlign: "left",
    padding: "10px 12px",
    borderBottom: `1px solid ${BORDER}`,
    color: SUB,
    fontWeight: 600,
    fontSize: 12.5,
    letterSpacing: "0.02em",
    textTransform: "uppercase",
    whiteSpace: "nowrap",
  };
  const td: React.CSSProperties = {
    padding: "12px",
    borderBottom: `1px solid ${BORDER}`,
    color: SOFT,
    fontSize: 14.5,
    whiteSpace: "nowrap",
  };

  return (
    <div style={{ background: BG, minHeight: "100vh", color: INK }}>
      <JsonLd data={schemas} />
      <Navbar />

      <main className="mx-auto w-full max-w-[1200px] px-5 pb-20 pt-10 md:px-12">
        <p className="text-[13px] font-medium uppercase tracking-wider" style={{ color: SUB }}>
          Guide · Uppdaterad {GUIDE.lastUpdated}
        </p>
        <h1 className="mt-3 text-[32px] font-semibold leading-tight md:text-[44px]">
          Hyrläkare lön 2026
        </h1>

        <p className="mt-5 max-w-[70ch] text-[16.5px] leading-relaxed" style={{ color: SOFT }}>
          Regionerna betalar {fmt(LOWEST)}–{fmt(HIGHEST)} kr per timme för en specialistläkare
          2026, beroende på specialitet och vilken zon uppdraget ligger i. För dig som arbetar
          som hyrläkare via eget bolag motsvarar det ungefär{" "}
          <strong style={{ color: INK }}>
            {fmt(PAY_LOW)}–{fmt(PAY_HIGH)} kr per timme
          </strong>{" "}
          i fakturerad ersättning, eftersom bemanningsbolaget behåller en marginal på 10–15
          procent. Nedan hittar du priset per specialitet och zon, direkt ur SKR:s ramavtal för
          vårdbemanning 2026.
        </p>

        {/* Pristabell */}
        <section className="mt-12">
          <h2 className="text-[22px] font-semibold md:text-[26px]">
            Timpris per specialitet och zon 2026
          </h2>
          <p className="mt-3 max-w-[70ch] text-[15px] leading-relaxed" style={{ color: SOFT }}>
            Kolumnerna zon 1–3 visar regionens pris till bemanningsbolaget. Kolumnen längst till
            höger visar möjlig ersättning som företagare, från lägsta zonen till högsta.
          </p>

          <div
            className="mt-6 overflow-x-auto rounded-2xl"
            style={{ background: CARD, border: `1px solid ${BORDER}` }}
          >
            <table className="w-full border-collapse">
              <caption className="px-4 pt-4 text-left text-[13px]" style={{ color: SUB }}>
                Ramavtalspris i kronor per timme, SKR:s ramavtal vårdbemanning 2026 (läkare v1.6).
              </caption>
              <thead>
                <tr>
                  <th scope="col" style={th}>
                    Specialitet
                  </th>
                  <th scope="col" style={th}>
                    Zon 1
                  </th>
                  <th scope="col" style={th}>
                    Zon 2
                  </th>
                  <th scope="col" style={th}>
                    Zon 3
                  </th>
                  <th scope="col" style={th}>
                    Möjlig ersättning
                  </th>
                </tr>
              </thead>
              <tbody>
                {ROWS.map((r) => (
                  <tr key={r.slug}>
                    <th scope="row" style={{ ...td, color: INK, fontWeight: 500 }}>
                      <Link
                        to={`/rapport/${r.slug}`}
                        className="hover:underline"
                        style={{ color: INK }}
                      >
                        {r.title} — timpris och ersättning
                      </Link>
                    </th>
                    <td style={td}>{fmt(r.zone1)} kr</td>
                    <td style={td}>{fmt(r.zone2)} kr</td>
                    <td style={td}>{fmt(r.zone3)} kr</td>
                    <td style={{ ...td, color: INK }}>
                      {fmt(lo(r.zone1))}–{fmt(hi(r.zone3))} kr
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Så räknas ersättningen */}
        <section className="mt-14">
          <h2 className="text-[22px] font-semibold md:text-[26px]">
            Så räknas hyrläkarens ersättning fram
          </h2>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed" style={{ color: SOFT }}>
            Ramavtalspriset är vad regionen betalar bemanningsbolaget per arbetad timme. Av det
            priset behåller bolaget en marginal som täcker administration, rekrytering,
            försäkringar och betalningsrisk. För specialistläkare ligger den marginalen normalt
            på 10–15 procent, vilket är lägre än för andra vårdroller eftersom timpriserna är
            högre. Resten är utrymmet för din ersättning.
          </p>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed" style={{ color: SOFT }}>
            Marginalen kan ligga i den lägre delen av spannet när du själv står för
            uppdragsanskaffning eller längre uppdrag, och i den övre delen när bolaget garanterar
            timmar eller tar betalningsrisken.
          </p>
        </section>

        {/* Zoner */}
        <section className="mt-14">
          <h2 className="text-[22px] font-semibold md:text-[26px]">Vad zonerna betyder</h2>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {ZONES.map((z) => (
              <div
                key={z.zone}
                className="rounded-2xl p-5"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                <div className="text-[15px] font-semibold" style={{ color: INK }}>
                  {z.zone}
                </div>
                <p className="mt-2 text-[14.5px] leading-relaxed" style={{ color: SOFT }}>
                  {z.desc}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Anställd vs eget bolag */}
        <section className="mt-14">
          <h2 className="text-[22px] font-semibold md:text-[26px]">
            Eget bolag eller anställd — vad skiljer?
          </h2>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed" style={{ color: SOFT }}>
            Som företagare fakturerar du ett timpris där semester, pension, sjukförsäkring och
            sociala avgifter ska rymmas. Timpriset ser därför högre ut än en månadslön räknad per
            timme, men delar av beloppet är kostnader du själv bär.
          </p>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed" style={{ color: SOFT }}>
            Som anställd i ett bemanningsbolag betalar arbetsgivaren arbetsgivaravgifter, pension
            och försäkringar ovanpå din lön. Det innebär att timlönen blir lägre än det belopp en
            företagare fakturerar för samma uppdrag, samtidigt som du får semester, sjuklön och
            tjänstepension utan att administrera dem själv.
          </p>
        </section>

        {/* OB och jour */}
        <section className="mt-14">
          <h2 className="text-[22px] font-semibold md:text-[26px]">OB, jour och beredskap</h2>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed" style={{ color: SOFT }}>
            Priserna på den här sidan är grundpris för normal arbetstid. Obekväm arbetstid, jour
            och beredskap regleras separat i ramavtalet och faktureras utöver grundpriset. Det är
            också här fel uppstår oftast: felaktiga tidsintervall, missad helgdagsersättning eller
            timmar som inte kommit med på fakturan.
          </p>
        </section>

        {/* FAQ */}
        <section className="mt-14">
          <h2 className="text-[22px] font-semibold md:text-[26px]">Vanliga frågor om hyrläkarlön</h2>
          <div className="mt-6 flex flex-col gap-4">
            {FAQ.map((f) => (
              <div
                key={f.question}
                className="rounded-2xl p-5"
                style={{ background: CARD, border: `1px solid ${BORDER}` }}
              >
                <h3 className="text-[16px] font-semibold" style={{ color: INK }}>
                  {f.question}
                </h3>
                <p className="mt-2 max-w-[70ch] text-[14.8px] leading-relaxed" style={{ color: SOFT }}>
                  {f.answer}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* Nästa steg */}
        <section className="mt-14">
          <h2 className="text-[22px] font-semibold md:text-[26px]">Se din egen nivå</h2>
          <p className="mt-3 max-w-[70ch] text-[15.5px] leading-relaxed" style={{ color: SOFT }}>
            Sök din roll och ort för att se ramavtalspriset och ersättningsspannet för just din
            kombination.
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-4">
            <Link
              to="/faktasidor"
              className="inline-flex items-center rounded-xl px-6 py-3 text-sm font-semibold"
              style={{ background: INK, color: "#0b0c10" }}
            >
              Sök roll och ort
            </Link>
            <Link
              to="/rapport/sjukskoterska"
              className="text-sm font-medium hover:underline"
              style={{ color: SOFT }}
            >
              Ramavtalspriser för sjuksköterskor 2026
            </Link>
          </div>
          <p className="mt-8 text-[13px]" style={{ color: SUB }}>
            Källa: SKR:s ramavtal vårdbemanning 2026 (läkarlistan v1.6).
          </p>
        </section>
      </main>

      <Footer5c />
    </div>
  );
}
