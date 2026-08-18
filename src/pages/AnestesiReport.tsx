
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";
import { JsonLd } from "@/components/JsonLd";
import TLDRBox from "@/components/report/TLDRBox";
import { buildRoleReportSchemas } from "@/lib/seo/roleReportSchema";
import { useCatalogZoneRates } from "@/hooks/useCatalogZoneRates";
import RelateradeSidor from "@/components/report/RelateradeSidor";
import { getRelatedPaths } from "@/data/relatedContent";


// Single source of truth for the report's freshness stamp.
// Same value drives the visible TL;DR timestamp AND every JSON-LD schema.
const LAST_UPDATED = "2026-01-15";

import {
  Clock,
  Moon,
  Sun,
  Sparkles,
  ArrowRight,
  MapPin,
  BarChart3,
  Info,
} from "lucide-react";

const fmt = (n: number) => n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

// Priserna hämtas live ur contract_version_rates (v1.7); värdena nedan är fallback.
const ZONE_FALLBACK = { zone1: 740, zone2: 792, zone3: 845 };
const ZONE_META = [
  { zone: "Zon 1", desc: "Storstadsregioner" },
  { zone: "Zon 2", desc: "Mellanstora regioner" },
  { zone: "Zon 3", desc: "Glesbygd / svårrekryterade" },
];


const OB_RATES = [
  { typ: "Vardagkväll", tid: "Mån–Tor 19–22", rate: 36, icon: Clock },
  { typ: "Vardagnatt", tid: "Mån–Fre 22–06", rate: 79, icon: Moon },
  { typ: "Helgdag", tid: "Lör–Sön 06–19", rate: 92, icon: Sun },
  { typ: "Helgkväll", tid: "Fre–Sön 19–22", rate: 92, icon: Clock },
  { typ: "Helgnatt", tid: "Fre–Mån 22–06", rate: 105, icon: Moon },
  { typ: "Storhelg dag/kväll", tid: "Dag & kväll", rate: 177, icon: Sparkles },
  { typ: "Storhelg natt", tid: "22–07", rate: 213, icon: Sparkles },
];

const SHARE_MIN_FORETAGARE = 0.82;
const SHARE_MAX_FORETAGARE = 0.88;
const SHARE_MIN_ANSTALLD = 0.80;
const SHARE_MAX_ANSTALLD = 0.86;

export default function AnestesiReport() {
  const rates = useCatalogZoneRates("Specialistsjuksköterska anestesi", "v1.7", ZONE_FALLBACK);
  const ZONES = ZONE_META.map((meta, i) => ({
    ...meta,
    rate: [rates.zone1, rates.zone2, rates.zone3][i],
  }));
  const zone1Rate = rates.zone1;
  const zone3Rate = rates.zone3;

  const recMinF = Math.round(zone1Rate * SHARE_MIN_FORETAGARE);
  const recMaxF = Math.round(zone1Rate * SHARE_MAX_FORETAGARE);
  const recMinA = Math.round(zone1Rate * SHARE_MIN_ANSTALLD);
  const recMaxA = Math.round(zone1Rate * SHARE_MAX_ANSTALLD);

  const roleSchemas = buildRoleReportSchemas({
    roleName: "Anestesisjuksköterska",
    roleSlug: "anestesisjukskoterska",
    dateModified: LAST_UPDATED,
    summary:
      `Ramavtalspriset för anestesisjuksköterskor är ${fmt(zone1Rate)}–${fmt(zone3Rate)} kr/timme beroende på zon. ` +
      `Marknadsmässigt konsultarvode (egenföretagare) ligger på ${fmt(recMinF)}–${fmt(recMaxF)} kr/timme enligt SKR:s ramavtal 2026.`,
    rateRange: { min: zone1Rate, median: 792, max: zone3Rate, unit: "SEK/h" },
    skrSources: ["https://skr.se/ramavtal/vardbemanning"],
    faq: [
      {
        question: "Vad är timpriset för en anestesisjuksköterska 2026?",
        answer: `Ramavtalspriset enligt SKR är ${fmt(zone1Rate)} kr/timme i storstad (Zon 1), 792 kr/timme i mellanstora regioner (Zon 2) och ${fmt(zone3Rate)} kr/timme i glesbygd (Zon 3).`,
      },
      {
        question: "Hur mycket tjänar en anestesisjuksköterska som konsult?",
        answer: `Som egenföretagare ligger möjlig ersättning på ${fmt(recMinF)}–${fmt(recMaxF)} kr/timme i Zon 1. Som anställd konsult ligger spannet på ${fmt(recMinA)}–${fmt(recMaxA)} kr/timme.`,
      },
      {
        question: "Vad är OB-tillägget för anestesisjuksköterskor?",
        answer:
          "OB-tilläggen följer SKR:s ramavtal: vardagkväll 36 kr/timme, vardagnatt 79 kr/timme, helgdag/helgkväll 92 kr/timme, helgnatt 105 kr/timme, storhelg 177–213 kr/timme.",
      },
    ],
  });

  return (
    <div className="min-h-screen bg-background">
      <JsonLd data={roleSchemas} />
      <Navbar />


      {/* Hero header */}
      <header className="relative overflow-hidden hero-gradient px-5 pt-20 pb-10 sm:pt-24 sm:pb-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-70">
            Marknadsrapport 2026
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight drop-shadow-xs">
            Anestesisjuksköterska
          </h1>
          <div className="flex items-center gap-2 text-sm opacity-80">
            <span>Specialistsjuksköterska anestesi</span>
            <span className="w-1 h-1 rounded-full bg-current opacity-40" />
            <span>SKR Ramavtal 2026</span>
          </div>
        </div>
      </header>

      <main className="px-4 py-6 max-w-lg mx-auto space-y-6">
        {/* ── TL;DR — citerbar sammanfattning för människor & AI-agenter ── */}
        <TLDRBox
          summary={`Ramavtalspriset för anestesisjuksköterskor ligger på ${fmt(zone1Rate)}–${fmt(zone3Rate)} kr/timme beroende på zon. Marknadsmässigt konsultarvode (egenföretagare) är ${fmt(recMinF)}–${fmt(recMaxF)} kr/timme i storstad enligt SKR:s ramavtal 2026.`}
          facts={[
            { label: "Kundpris", value: `${fmt(zone1Rate)}–${fmt(zone3Rate)} kr/timme` },
            { label: "Konsult (eget bolag)", value: `${fmt(recMinF)}–${fmt(recMaxF)} kr/timme` },
            { label: "Konsult (anställd)", value: `${fmt(recMinA)}–${fmt(recMaxA)} kr/timme` },
          ]}
          lastUpdated={LAST_UPDATED}
          source="SKR Ramavtal 2026"
        />

        {/* ── Kundpris per zon ── */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Regionens kundpris per zon
            </span>
          </div>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] overflow-hidden">
            {ZONES.map((z, i) => (
              <div
                key={z.zone}
                className={`flex items-center justify-between p-3.5 ${i > 0 ? "border-t border-foreground/[0.05]" : ""}`}
              >
                <div className="flex items-center gap-3">
                  <MapPin className="w-4 h-4 text-primary/60 shrink-0" />
                  <div>
                    <p className="text-sm font-semibold text-foreground">{z.zone}</p>
                    <p className="text-[11px] text-muted-foreground">{z.desc}</p>
                  </div>
                </div>
                <span className="font-[var(--font-mono)] text-lg font-bold tracking-tight text-foreground">
                  {fmt(z.rate)} <span className="text-xs font-normal text-muted-foreground">kr/timme</span>
                </span>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2 flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            Kundpris = vad regionen betalar bemanningsföretaget per arbetad timme.
          </p>
        </section>

        {/* ── Vanlig konsultersättning ── */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Vanlig konsultersättning · Zon 1
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
                  {fmt(recMinF)}–{fmt(recMaxF)} kr/timme
                </p>
                <p className="text-[11px] text-muted-foreground">Realistiskt förhandlingsspann (egenföretagare)</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Egenföretagare", share: "82–88%", range: `${fmt(recMinF)}–${fmt(recMaxF)} kr/timme` },
                { label: "Anställd via bemanning", share: "80–86%", range: `${fmt(recMinA)}–${fmt(recMaxA)} kr/timme` },
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
          </div>
        </section>

        {/* ── OB-tillägg ── */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              OB-tillägg · vad regionen betalar
            </span>
          </div>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] overflow-hidden">
            {OB_RATES.map((ob, i) => {
              const Icon = ob.icon;
              const isStorhelg = ob.typ.startsWith("Storhelg");
              return (
                <div
                  key={ob.typ}
                  className={`flex items-center justify-between p-3.5 ${i > 0 ? "border-t border-foreground/[0.05]" : ""} ${isStorhelg ? "bg-primary/[0.03]" : ""}`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-4 h-4 shrink-0 ${isStorhelg ? "text-primary" : "text-muted-foreground"}`} />
                    <div>
                      <p className="text-sm font-medium text-foreground">{ob.typ}</p>
                      <p className="text-[11px] text-muted-foreground">{ob.tid}</p>
                    </div>
                  </div>
                  <span className={`font-[var(--font-mono)] text-base font-bold tracking-tight ${isStorhelg ? "text-primary" : "text-foreground"}`}>
                    +{fmt(ob.rate)} <span className="text-xs font-normal text-muted-foreground">kr/timme</span>
                  </span>
                </div>
              );
            })}
          </div>
          <p className="text-[11px] text-muted-foreground/70 mt-2 flex items-start gap-1.5">
            <Info className="w-3 h-3 mt-0.5 shrink-0" />
            OB-tillägg läggs ovanpå grundpriset. Samma OB-tariffer gäller för alla zoner.
          </p>
        </section>

        {/* ── Exempelberäkning ── */}
        <section>
          <div className="mb-3">
            <span className="text-[10px] font-semibold tracking-[1.4px] uppercase text-muted-foreground">
              Exempelberäkning · Nattpass helg
            </span>
          </div>
          <div className="rounded-[18px] bg-foreground/[0.035] border border-foreground/[0.07] p-4 space-y-2">
            {[
              { label: "Grundpris Zon 1", value: "740 kr/timme" },
              { label: "OB helgnatt (fre–mån 22–06)", value: "+109 kr/timme" },
              { label: "Totalt kundpris", value: "879 kr/timme", bold: true },
            ].map((row) => (
              <div key={row.label} className={`flex items-center justify-between ${row.bold ? "pt-2 border-t border-foreground/[0.08]" : ""}`}>
                <span className={`text-sm ${row.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{row.label}</span>
                <span className={`font-[var(--font-mono)] text-sm ${row.bold ? "font-bold text-primary" : "text-foreground"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Relaterade roller och underlag */}
        <RelateradeSidor currentSlug="anestesisjukskoterska" prefillSlug="anestesi" />

        {/* ── CTA ── */}
        <section className="rounded-2xl bg-gradient-to-b from-primary/[0.08] to-primary/[0.02] border border-primary/20 p-5 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Vad borde du tjäna?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Svara på 4 snabba frågor och få en personlig rapport baserad på din zon och anställningsform.
          </p>
          <Link to="/?yrke=anestesi">
            <Button className="gap-2 h-12 rounded-xl px-6 mt-2">
              Skapa din rapport <ArrowRight className="w-4 h-4" />
            </Button>
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
  );
}
