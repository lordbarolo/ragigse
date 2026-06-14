import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";
import { SEO } from "@/components/SEO";
import TLDRBox from "@/components/report/TLDRBox";
import { buildRoleReportSchemas } from "@/lib/seo/roleReportSchema";
import { ArrowRight, MapPin, BarChart3, Info, TrendingUp } from "lucide-react";

const LAST_UPDATED = "2026-01-15";
const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

// Allmänspecialist (Specialistläkare allmänmedicin) — SKR ramavtal 2026
const ZONES = [
  { zone: "Zon 1", rate: 1238, desc: "Storstadsregioner" },
  { zone: "Zon 2", rate: 1513, desc: "Mellanstora regioner" },
  { zone: "Zon 3", rate: 1787, desc: "Glesbygd / svårrekryterade — Bollnäs" },
];

// Specialistläkare: konsultandel av kundpris
const SHARE_MIN_FORETAGARE = 0.85;
const SHARE_MAX_FORETAGARE = 0.90;
const SHARE_MIN_ANSTALLD = 0.83;
const SHARE_MAX_ANSTALLD = 0.88;

const USER_RATE = 1240;
const USER_KOMMUN = "Bollnäs";
const USER_ZON_LABEL = "Zon 3";
const USER_ZON_RATE = 1787;

export default function BollnasAllmanspecialistReport() {
  const recMinF = Math.round(USER_ZON_RATE * SHARE_MIN_FORETAGARE);
  const recMaxF = Math.round(USER_ZON_RATE * SHARE_MAX_FORETAGARE);
  const recMinA = Math.round(USER_ZON_RATE * SHARE_MIN_ANSTALLD);
  const recMaxA = Math.round(USER_ZON_RATE * SHARE_MAX_ANSTALLD);

  // Säkerhetsregel: aldrig föreslå under nuvarande ersättning
  const safeMinF = Math.max(recMinF, USER_RATE);
  const safeMinA = Math.max(recMinA, USER_RATE);

  const gap = Math.max(0, recMinF - USER_RATE);
  const annualUpside = gap * 167 * 12;

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
        answer: `Som egenföretagare ligger möjlig ersättning på ${fmt(recMinF)}–${fmt(recMaxF)} kr/h (85–90% av kundpris). Som anställd konsult ligger spannet på ${fmt(recMinA)}–${fmt(recMaxA)} kr/h.`,
      },
      {
        question: "Är 1 240 kr/h bra för en allmänspecialist i Bollnäs?",
        answer: `1 240 kr/h motsvarar cirka ${Math.round((USER_RATE / USER_ZON_RATE) * 100)}% av Zon 3-priset (${fmt(USER_ZON_RATE)} kr/h). Marknadsmässigt spann för eget bolag är ${fmt(recMinF)}–${fmt(recMaxF)} kr/h — det finns utrymme att förhandla upp mot ramavtalet.`,
      },
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      <SEO
        title="Allmänspecialist Bollnäs – timpris & konsultarvode 2026"
        description="Ramavtalspriser, möjlig konsultersättning och förhandlingsspann för specialistläkare i allmänmedicin i Bollnäs (Zon 3). Källa: SKR ramavtal 2026."
        path="/Bollnas/lakare-alm"
        ogType="article"
        jsonLd={roleSchemas}
      />
      <Navbar />

      {/* Hero */}
      <header className="relative overflow-hidden hero-gradient px-5 pt-20 pb-10 sm:pt-24 sm:pb-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-70">
            Marknadsrapport 2026
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight">
            Allmänspecialist · {USER_KOMMUN}
          </h1>
          <div className="flex items-center gap-2 text-sm opacity-80 flex-wrap">
            <span>Specialistläkare allmänmedicin</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>{USER_ZON_LABEL}</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>SKR Ramavtal 2026</span>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        <TLDRBox
          summary={`I ${USER_KOMMUN} (${USER_ZON_LABEL}) är kundpriset enligt SKR ${fmt(USER_ZON_RATE)} kr/h för specialistläkare allmänmedicin. Med din nuvarande ersättning ${fmt(USER_RATE)} kr/h finns ett marknadsmässigt utrymme upp mot ${fmt(recMinF)}–${fmt(recMaxF)} kr/h (eget bolag).`}
          facts={[
            { label: "Din ersättning", value: `${fmt(USER_RATE)} kr/h` },
            { label: `Kundpris ${USER_ZON_LABEL}`, value: `${fmt(USER_ZON_RATE)} kr/h` },
            { label: "Möjlig ersättning (eget bolag)", value: `${fmt(safeMinF)}–${fmt(recMaxF)} kr/h` },
          ]}
          lastUpdated={LAST_UPDATED}
          source="SKR Ramavtal 2026"
        />

        {/* Din situation */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Din situation
            </span>
          </div>
          <div className="rounded-2xl bg-gradient-to-b from-primary/[0.08] to-primary/[0.02] border border-primary/20 p-5 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <TrendingUp className="w-5 h-5 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Din nuvarande ersättning (eget bolag)</p>
                <p className="text-2xl font-bold text-foreground">{fmt(USER_RATE)} kr/h</p>
                <p className="text-[12px] text-muted-foreground">
                  Motsvarar cirka {Math.round((USER_RATE / USER_ZON_RATE) * 100)}% av kundpriset i {USER_ZON_LABEL} ({fmt(USER_ZON_RATE)} kr/h).
                </p>
              </div>
            </div>
            {gap > 0 && (
              <div className="rounded-lg bg-background/60 border border-foreground/10 p-3.5 text-sm">
                <p className="text-foreground">
                  Marknadsmässigt undre spann är <span className="font-semibold">{fmt(recMinF)} kr/h</span> — en skillnad på{" "}
                  <span className="font-semibold text-primary">+{fmt(gap)} kr/h</span>.
                </p>
                <p className="text-[12px] text-muted-foreground mt-1">
                  På årsbasis ({fmt(167)} h/mån × 12 mån): ca <span className="font-semibold">+{fmt(annualUpside)} kr</span> brutto till bolaget.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Kundpris per zon */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Kundpris per zon — specialistläkare allmänmedicin
            </span>
          </div>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] overflow-hidden">
            {ZONES.map((z, i) => {
              const isUser = z.zone === USER_ZON_LABEL;
              return (
                <div
                  key={z.zone}
                  className={`flex items-center justify-between p-3.5 ${i > 0 ? "border-t border-foreground/[0.05]" : ""} ${isUser ? "bg-primary/[0.05]" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <MapPin className={`w-4 h-4 shrink-0 ${isUser ? "text-primary" : "text-primary/60"}`} />
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {z.zone}
                        {isUser && <span className="ml-2 text-[10px] font-semibold uppercase tracking-wider text-primary">Din zon</span>}
                      </p>
                      <p className="text-[11px] text-muted-foreground">{z.desc}</p>
                    </div>
                  </div>
                  <span className={`font-[var(--font-mono)] text-lg font-bold tracking-tight ${isUser ? "text-primary" : "text-foreground"}`}>
                    {fmt(z.rate)} <span className="text-xs font-normal text-muted-foreground">kr/h</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2 flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            Kundpris = vad regionen betalar bemanningsföretaget per arbetad timme. Grundpris exkl. OB/jour.
          </p>
        </section>

        {/* Möjlig konsultersättning */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Möjlig konsultersättning · {USER_ZON_LABEL}
            </span>
          </div>
          <div className="relative rounded-2xl bg-gradient-to-b from-foreground/[0.06] to-foreground/[0.02] border border-foreground/10 p-5 overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-primary to-transparent" />
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <BarChart3 className="w-5 h-5 text-primary" />
              </div>
              <div>
                <p className="text-lg font-bold text-foreground">
                  {fmt(safeMinF)}–{fmt(recMaxF)} kr/h
                </p>
                <p className="text-[11px] text-muted-foreground">Marknadsmässigt spann (eget bolag)</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Egenföretagare", share: "85–90%", range: `${fmt(safeMinF)}–${fmt(recMaxF)} kr/h` },
                { label: "Anställd via bemanning", share: "83–88%", range: `${fmt(safeMinA)}–${fmt(recMaxA)} kr/h` },
              ].map((row) => (
                <div key={row.label} className="flex items-center justify-between rounded-lg bg-foreground/[0.03] border border-foreground/[0.06] px-3.5 py-2.5">
                  <div>
                    <p className="text-sm font-medium text-foreground">{row.label}</p>
                    <p className="text-[11px] text-muted-foreground">Andel av kundpris: {row.share}</p>
                  </div>
                  <span className="font-[var(--font-mono)] text-sm font-bold text-primary">{row.range}</span>
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted-foreground/70 mt-4 flex items-start gap-1.5">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Bemanningsföretagets marginal är typiskt 10–15% av kundpriset (täcker administration, risk, försäkring).
            </p>
          </div>
        </section>

        {/* Förhandlingsobservationer */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Förhandlingsobservationer
            </span>
          </div>
          <div className="rounded-2xl border border-foreground/10 bg-background p-5 space-y-3 text-sm">
            <p>
              <span className="font-semibold text-foreground">Undre spann:</span>{" "}
              <span className="text-muted-foreground">{fmt(safeMinF)} kr/h — säker utgångspunkt baserat på SKR Zon 3.</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Median:</span>{" "}
              <span className="text-muted-foreground">{fmt(Math.round((safeMinF + recMaxF) / 2))} kr/h — typisk nivå för konsulter med dokumenterad erfarenhet.</span>
            </p>
            <p>
              <span className="font-semibold text-foreground">Övre spann:</span>{" "}
              <span className="text-muted-foreground">{fmt(recMaxF)} kr/h — uppnås vid brist, jourtillgänglighet eller etablerad relation med beställaren.</span>
            </p>
          </div>
        </section>

        {/* Metod */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Beräkningsmetod
            </span>
          </div>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] p-4 text-[12px] text-muted-foreground leading-relaxed space-y-2">
            <p>
              <span className="font-semibold text-foreground">Källa:</span> SKR ramavtal vårdbemanning 2026, kategori Specialistläkare allmänmedicin.
            </p>
            <p>
              <span className="font-semibold text-foreground">Zonindelning:</span> Bollnäs ingår i Region Gävleborg och klassas som Zon 3 (glesbygd/svårrekryterad).
            </p>
            <p>
              <span className="font-semibold text-foreground">Marginalmodell:</span> Specialistläkare 10–15% bemanningsmarginal → konsultandel 85–90% (eget bolag) respektive 83–88% (anställd konsult).
            </p>
            <p>
              <span className="font-semibold text-foreground">OB & jour:</span> Hanteras separat ovanpå grundpriset enligt SKR-tariff och påverkar inte basanalysen.
            </p>
          </div>
        </section>

        {/* CTA */}
        <section className="rounded-2xl bg-gradient-to-b from-primary/[0.08] to-primary/[0.02] border border-primary/20 p-5 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Vill du ha en personlig analys?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Svara på några snabba frågor och få en egen rapport baserad på din specialitet, zon och anställningsform.
          </p>
          <Link to="/?yrke=Specialistläkare%20allmänmedicin&kommun=Bollnäs">
            <Button className="text-sm font-semibold px-6 py-3 gap-2 mt-2">
              Skapa din rapport <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </section>

        {/* Footer */}
        <div className="pt-4">
          <Separator className="mb-6 opacity-30" />
          <div className="text-center space-y-3 pb-8">
            <CompcareLogo variant="wordmark" className="mx-auto opacity-40 !h-5" />
            <p className="text-[11px] text-muted-foreground/60 leading-relaxed max-w-xs mx-auto">
              Denna rapport baseras på gällande avtal från SKR och är avsedd som vägledning.
              Faktisk ersättning kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
            </p>
            <p className="text-[10px] text-muted-foreground/40">
              © {new Date().getFullYear()} CompCare.se
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}
