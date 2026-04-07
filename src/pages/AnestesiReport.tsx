import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import CompcareLogo from "@/components/CompcareLogo";
import Navbar from "@/components/Navbar";
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

const ZONES = [
  { zone: "Zon 1", rate: 770, desc: "Storstadsregioner" },
  { zone: "Zon 2", rate: 824, desc: "Mellanstora regioner" },
  { zone: "Zon 3", rate: 880, desc: "Glesbygd / svårrekryterade" },
];

const OB_RATES = [
  { typ: "Vardagkväll", tid: "Mån–Tor 19–22", rate: 37, icon: Clock },
  { typ: "Vardagnatt", tid: "Mån–Fre 22–06", rate: 82, icon: Moon },
  { typ: "Helgdag", tid: "Lör–Sön 06–19", rate: 96, icon: Sun },
  { typ: "Helgkväll", tid: "Fre–Sön 19–22", rate: 96, icon: Clock },
  { typ: "Helgnatt", tid: "Fre–Mån 22–06", rate: 109, icon: Moon },
  { typ: "Storhelg dag/kväll", tid: "Dag & kväll", rate: 184, icon: Sparkles },
  { typ: "Storhelg natt", tid: "22–07", rate: 222, icon: Sparkles },
];

const SHARE_MIN_FORETAGARE = 0.82;
const SHARE_MAX_FORETAGARE = 0.88;
const SHARE_MIN_ANSTALLD = 0.80;
const SHARE_MAX_ANSTALLD = 0.86;

export default function AnestesiReport() {
  const zone1Rate = 770;
  const recMinF = Math.round(zone1Rate * SHARE_MIN_FORETAGARE);
  const recMaxF = Math.round(zone1Rate * SHARE_MAX_FORETAGARE);
  const recMinA = Math.round(zone1Rate * SHARE_MIN_ANSTALLD);
  const recMaxA = Math.round(zone1Rate * SHARE_MAX_ANSTALLD);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* Hero header */}
      <header className="relative overflow-hidden hero-gradient px-5 pt-20 pb-10 sm:pt-24 sm:pb-12">
        <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
        <div className="max-w-lg mx-auto space-y-4 relative z-10">
          <p className="text-[10px] uppercase tracking-[0.2em] font-medium opacity-70">
            Marknadsrapport 2026
          </p>
          <h1 className="text-2xl sm:text-3xl font-bold leading-tight tracking-tight drop-shadow-sm">
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
                  {fmt(z.rate)} <span className="text-xs font-normal text-muted-foreground">kr/h</span>
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
                  {fmt(recMin)}–{fmt(recMax)} kr/h
                </p>
                <p className="text-[11px] text-muted-foreground">Realistiskt förhandlingsspann</p>
              </div>
            </div>

            <div className="space-y-3">
              {[
                { label: "Egenföretagare", share: "85–92%", range: `${fmt(recMin)}–${fmt(recMax)} kr/h` },
                { label: "Anställd via bemanning", share: "60–65%", range: `${fmt(Math.round(zone1Rate * 0.60))}–${fmt(Math.round(zone1Rate * 0.65))} kr/h` },
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
              OB-tillägg · Sjuksköterska
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
                    +{fmt(ob.rate)} <span className="text-xs font-normal text-muted-foreground">kr/h</span>
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
              { label: "Grundpris Zon 1", value: "770 kr/h" },
              { label: "OB helgnatt (fre–mån 22–06)", value: "+109 kr/h" },
              { label: "Totalt kundpris", value: "879 kr/h", bold: true },
            ].map((row) => (
              <div key={row.label} className={`flex items-center justify-between ${row.bold ? "pt-2 border-t border-foreground/[0.08]" : ""}`}>
                <span className={`text-sm ${row.bold ? "font-semibold text-foreground" : "text-muted-foreground"}`}>{row.label}</span>
                <span className={`font-[var(--font-mono)] text-sm ${row.bold ? "font-bold text-primary" : "text-foreground"}`}>{row.value}</span>
              </div>
            ))}
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="rounded-2xl bg-gradient-to-b from-primary/[0.08] to-primary/[0.02] border border-primary/20 p-5 text-center space-y-3">
          <h2 className="text-lg font-bold text-foreground">Vad borde du tjäna?</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Svara på 6 snabba frågor och få en personlig rapport baserad på din roll, zon och anställningsform.
          </p>
          <Link to="/">
            <Button className="gap-2 h-12 rounded-xl px-6 mt-2">
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
