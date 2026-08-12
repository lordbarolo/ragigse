import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";
import { JsonLd } from "@/components/JsonLd";
import { buildRoleReportSchemas } from "@/lib/seo/roleReportSchema";
import { ArrowRight, MapPin, BarChart3, Info, TrendingUp } from "lucide-react";
import { useEffect } from "react";
import { useCatalogZoneRates } from "@/hooks/useCatalogZoneRates";

const LAST_UPDATED = "2026-01-15";
const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

// Allmänspecialist (Specialistläkare allmänmedicin) — SKR ramavtal 2026
// Priserna hämtas live ur contract_version_rates (v1.6); värdena nedan är fallback.
const ZONE_FALLBACK = { zone1: 1189, zone2: 1453, zone3: 1717 };
const ZONE_META = [
  { zone: "Zon 1", desc: "Storstadsregioner" },
  { zone: "Zon 2", desc: "Mellanstora regioner" },
  { zone: "Zon 3", desc: "Glesbygd / svårrekryterade — Bollnäs" },
];

const SHARE_MIN_FORETAGARE = 0.85;
const SHARE_MAX_FORETAGARE = 0.90;
const SHARE_MIN_ANSTALLD = 0.83;
const SHARE_MAX_ANSTALLD = 0.88;

const USER_RATE = 1240;
const USER_KOMMUN = "Bollnäs";
const USER_ZON_LABEL = "Zon 3";

export default function BollnasAllmanspecialistReport() {
  const rates = useCatalogZoneRates("Specialistläkare Allmänmedicin", "v1.6", ZONE_FALLBACK);
  const ZONES = ZONE_META.map((meta, i) => ({
    ...meta,
    rate: [rates.zone1, rates.zone2, rates.zone3][i],
  }));
  const USER_ZON_RATE = rates.zone3;

  const recMinF = Math.round(USER_ZON_RATE * SHARE_MIN_FORETAGARE);
  const recMaxF = Math.round(USER_ZON_RATE * SHARE_MAX_FORETAGARE);
  const recMinA = Math.round(USER_ZON_RATE * SHARE_MIN_ANSTALLD);
  const recMaxA = Math.round(USER_ZON_RATE * SHARE_MAX_ANSTALLD);


  const safeMinF = Math.max(recMinF, USER_RATE);
  const safeMinA = Math.max(recMinA, USER_RATE);

  const gap = Math.max(0, recMinF - USER_RATE);
  const annualUpside = gap * 167 * 12;

  useEffect(() => {
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#0b0c10';
    document.body.style.backgroundColor = '#0b0c10';
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  const roleSchemas = buildRoleReportSchemas({
    roleName: "Specialistläkare allmänmedicin",
    roleSlug: "lakare-allmanmedicin-bollnas",
    dateModified: LAST_UPDATED,
    summary:
      `Ramavtalspriset för specialistläkare i allmänmedicin i Bollnäs (Zon 3) är ${fmt(USER_ZON_RATE)} kr/h. ` +
      `Marknadsmässigt konsultarvode (egenföretagare) ligger på ${fmt(recMinF)}–${fmt(recMaxF)} kr/h enligt SKR:s ramavtal 2026.`,
    rateRange: { min: ZONES[0].rate, median: ZONES[1].rate, max: ZONES[2].rate, unit: "SEK/h" },
    skrSources: ["https://skr.se/ramavtal/vardbemanning"],
    faq: [
      {
        question: "Vad är timpriset för en allmänspecialist i Bollnäs 2026?",
        answer: `Bollnäs tillhör Zon 3 i SKR:s ramavtal. Kundpriset (vad regionen betalar) är ${fmt(USER_ZON_RATE)} kr/h för specialistläkare allmänmedicin.`,
      },
      {
        question: "Hur mycket bör en allmänspecialist tjäna som konsult i Bollnäs?",
        answer: `Som egenföretagare ligger möjlig ersättning på ${fmt(recMinF)}–${fmt(recMaxF)} kr/h. Som anställd konsult ligger spannet på ${fmt(recMinA)}–${fmt(recMaxA)} kr/h.`,
      },
      {
        question: "Är 1 240 kr/h bra för en allmänspecialist i Bollnäs?",
        answer: `1 240 kr/h motsvarar cirka ${Math.round((USER_RATE / USER_ZON_RATE) * 100)}% av Zon 3-priset (${fmt(USER_ZON_RATE)} kr/h). Marknadsmässigt spann för eget bolag är ${fmt(recMinF)}–${fmt(recMaxF)} kr/h.`,
      },
    ],
  });

  return (
    <>
      <JsonLd data={roleSchemas} />
      <div
        className="min-h-screen"
        style={{
          ['--background' as any]: '40 18% 91%',
          ['--foreground' as any]: '0 0% 4%',
          ['--card' as any]: '0 0% 100%',
          ['--card-foreground' as any]: '0 0% 4%',
          ['--muted' as any]: '40 18% 91%',
          ['--muted-foreground' as any]: '220 9% 46%',
          ['--border' as any]: '35 17% 85%',
          ['--radius' as any]: '12px',
          backgroundColor: '#0b0c10',
          color: '#ffffff',
        }}
      >
        <Navbar />

        {/* Hero — cream light theme */}
        <header
          className="relative overflow-hidden px-5 pt-20 pb-10 sm:pt-24 sm:pb-12"
          style={{ backgroundColor: '#0b0c10', color: '#ffffff' }}
        >
          <div className="max-w-lg mx-auto space-y-4 relative z-10">
            <p className="text-[10px] uppercase tracking-[0.2em] font-medium" style={{ color: '#8a8c94' }}>
              Marknadsrapport 2026
            </p>
            <h1 className="leading-tight" style={{ fontFamily: 'Georgia, serif', fontSize: '28px', fontWeight: 700, color: '#ffffff' }}>
              Allmänspecialist · {USER_KOMMUN}
            </h1>
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1" style={{ fontSize: '13px', color: '#8a8c94' }}>
              <span className="whitespace-nowrap">Specialistläkare allmänmedicin</span>
              <span
                className="whitespace-nowrap px-1.5 py-0.5 rounded-md"
                style={{ backgroundColor: '#121319', border: '1px solid #22232b', color: '#ffffff', fontSize: '13px' }}
              >
                {USER_ZON_LABEL}
              </span>
              <span className="w-1 h-1 rounded-full mx-0.5" style={{ backgroundColor: '#22232b' }} />
              <span className="whitespace-nowrap">SKR Ramavtal 2026</span>
            </div>
          </div>
        </header>

        <main className="px-4 py-6 max-w-lg mx-auto space-y-2.5">

          {/* Din situation */}
          <section className="rounded-2xl border p-5 space-y-4" style={{ backgroundColor: '#121319', borderColor: '#22232b' }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: '#8a8c94' }}>
              Din situation
            </p>
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#22232b1A' }}>
                <TrendingUp className="w-5 h-5" style={{ color: '#22232b' }} />
              </div>
              <div className="space-y-1">
                <p className="text-sm" style={{ color: '#8a8c94' }}>Din nuvarande ersättning (eget bolag)</p>
                <p className="font-bold" style={{ fontFamily: 'Georgia, serif', fontSize: '24px', color: '#ffffff' }}>{fmt(USER_RATE)} kr/h</p>
                <p className="text-[12px]" style={{ color: '#8a8c94' }}>
                  Motsvarar cirka {Math.round((USER_RATE / USER_ZON_RATE) * 100)}% av kundpriset i {USER_ZON_LABEL} ({fmt(USER_ZON_RATE)} kr/h).
                </p>
              </div>
            </div>
            {gap > 0 && (
              <div className="rounded-lg p-3.5 text-sm" style={{ backgroundColor: '#0b0c10', border: '1px solid #22232b' }}>
                <p style={{ color: '#ffffff' }}>
                  Marknadsmässigt undre spann är <span className="font-semibold">{fmt(recMinF)} kr/h</span> — en skillnad på{" "}
                  <span className="font-semibold" style={{ color: '#22232b' }}>+{fmt(gap)} kr/h</span>.
                </p>
                <p className="text-[12px] mt-1" style={{ color: '#8a8c94' }}>
                  På årsbasis: ca <span className="font-semibold">+{fmt(annualUpside)} kr</span> brutto till bolaget.
                </p>
              </div>
            )}
          </section>

          {/* Kundpris per zon */}
          <section className="rounded-2xl border overflow-hidden" style={{ backgroundColor: '#121319', borderColor: '#22232b' }}>
            <div className="px-5 pt-5">
              <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: '#8a8c94' }}>
                Kundpris per zon — specialistläkare allmänmedicin
              </p>
            </div>
            <div className="mt-3">
              {ZONES.map((z, i) => {
                const isUser = z.zone === USER_ZON_LABEL;
                return (
                  <div
                    key={z.zone}
                    className="flex items-center justify-between p-3.5 px-5"
                    style={{ borderTop: i > 0 ? '1px solid #22232b' : 'none', backgroundColor: isUser ? '#22232b0A' : 'transparent' }}
                  >
                    <div className="flex items-center gap-3">
                      <MapPin className="w-4 h-4 shrink-0" style={{ color: isUser ? '#22232b' : '#8a8c94' }} />
                      <div>
                        <p className="text-sm font-semibold" style={{ color: '#ffffff' }}>
                          {z.zone}
                          {isUser && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider" style={{ color: '#22232b' }}>Din zon</span>}
                        </p>
                        <p className="text-[11px]" style={{ color: '#8a8c94' }}>{z.desc}</p>
                      </div>
                    </div>
                    <span className="text-lg font-bold tracking-tight" style={{ fontFamily: 'Georgia, serif', color: isUser ? '#22232b' : '#0b0c10' }}>
                      {fmt(z.rate)} <span className="text-xs font-normal" style={{ color: '#8a8c94' }}>kr/h</span>
                    </span>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 flex items-start gap-1.5" style={{ borderTop: '1px solid #22232b' }}>
              <Info className="w-3 h-3 mt-0.5 shrink-0" style={{ color: '#8a8c94' }} />
              <p className="text-[11px]" style={{ color: '#8a8c94' }}>
                Kundpris = vad regionen betalar bemanningsföretaget per arbetad timme. Grundpris exkl. OB/jour.
              </p>
            </div>
          </section>

          {/* Möjlig konsultersättning */}
          <section className="rounded-2xl border p-5" style={{ backgroundColor: '#121319', borderColor: '#22232b' }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase mb-3" style={{ color: '#8a8c94' }}>
              Möjlig konsultersättning · {USER_ZON_LABEL}
            </p>
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ backgroundColor: '#22232b1A' }}>
                <BarChart3 className="w-5 h-5" style={{ color: '#22232b' }} />
              </div>
              <div>
                <p className="font-bold" style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#ffffff' }}>
                  {fmt(safeMinF)}–{fmt(recMaxF)} kr/h
                </p>
                <p className="text-[11px]" style={{ color: '#8a8c94' }}>Marknadsmässigt spann (eget bolag)</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Egenföretagare", share: "Möjlig ersättning", range: `${fmt(safeMinF)}–${fmt(recMaxF)} kr/h` },
                { label: "Anställd via bemanning", share: "Bruttolön", range: `${fmt(safeMinA)}–${fmt(recMaxA)} kr/h` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg px-3.5 py-2.5" style={{ backgroundColor: '#0b0c10', border: '1px solid #22232b' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: '#ffffff' }}>{row.label}</p>
                    <p className="text-[11px]" style={{ color: '#8a8c94' }}>Andel av kundpris: {row.share}</p>
                  </div>
                  <span className="text-sm font-bold" style={{ fontFamily: 'Georgia, serif', color: '#22232b' }}>{row.range}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] mt-4 flex items-start gap-1.5" style={{ color: '#8a8c94' }}>
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
            </p>
          </section>

          {/* Förhandlingsobservationer */}
          <section className="rounded-2xl border p-5 space-y-3 text-sm" style={{ backgroundColor: '#121319', borderColor: '#22232b' }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: '#8a8c94' }}>
              Förhandlingsobservationer
            </p>
            <p>
              <span className="font-semibold" style={{ color: '#ffffff' }}>Undre spann:</span>{" "}
              <span style={{ color: '#8a8c94' }}>{fmt(safeMinF)} kr/h — säker utgångspunkt baserat på SKR Zon 3.</span>
            </p>
            <p>
              <span className="font-semibold" style={{ color: '#ffffff' }}>Median:</span>{" "}
              <span style={{ color: '#8a8c94' }}>{fmt(Math.round((safeMinF + recMaxF) / 2))} kr/h — typisk nivå för konsulter med dokumenterad erfarenhet.</span>
            </p>
            <p>
              <span className="font-semibold" style={{ color: '#ffffff' }}>Övre spann:</span>{" "}
              <span style={{ color: '#8a8c94' }}>{fmt(recMaxF)} kr/h — uppnås vid brist, jourtillgänglighet eller etablerad relation med beställaren.</span>
            </p>
          </section>

          {/* Metod */}
          <section className="rounded-2xl border p-5 space-y-2 text-[12px] leading-relaxed" style={{ backgroundColor: '#121319', borderColor: '#22232b', color: '#8a8c94' }}>
            <p className="text-[10px] font-semibold tracking-[1.4px] uppercase" style={{ color: '#8a8c94' }}>
              Beräkningsmetod
            </p>
            <p>
              <span className="font-semibold" style={{ color: '#ffffff' }}>Källa:</span> SKR ramavtal vårdbemanning 2026, kategori Specialistläkare allmänmedicin.
            </p>
            <p>
              <span className="font-semibold" style={{ color: '#ffffff' }}>Zonindelning:</span> Bollnäs ingår i Region Gävleborg och klassas som Zon 3 (glesbygd/svårrekryterad).
            </p>
            <p>
            </p>
            <p>
              <span className="font-semibold" style={{ color: '#ffffff' }}>OB & jour:</span> Hanteras separat ovanpå grundpriset enligt SKR-tariff och påverkar inte basanalysen.
            </p>
          </section>

          {/* CTA */}
          <section className="rounded-2xl border p-5 text-center space-y-3" style={{ backgroundColor: '#121319', borderColor: '#22232b' }}>
            <h2 className="font-bold" style={{ fontFamily: 'Georgia, serif', fontSize: '18px', color: '#ffffff' }}>Vill du ha en personlig analys?</h2>
            <p className="text-sm leading-relaxed" style={{ color: '#8a8c94' }}>
              Svara på några snabba frågor och få en egen rapport baserad på din specialitet, zon och anställningsform.
            </p>
            <Link
              to="/?yrke=Specialistläkare%20allmänmedicin&kommun=Bollnäs"
              className="inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg mt-2"
              style={{ backgroundColor: '#22232b', color: '#FFFFFF' }}
            >
              Skapa din rapport <ArrowRight className="w-4 h-4" />
            </Link>
          </section>

          {/* Footer */}
          <div className="pt-4">
            <Separator className="mb-6 opacity-30" />
            <div className="text-center space-y-3 pb-8">
              <CompcareLogo variant="wordmark" className="mx-auto !h-5" />
              <p className="text-[11px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                Denna rapport baseras på gällande avtal från SKR och är avsedd som vägledning.
                Faktisk ersättning kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
              </p>
              <p className="text-[10px] text-muted-foreground">
                © {new Date().getFullYear()} vårdbemanning.ai
              </p>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}
