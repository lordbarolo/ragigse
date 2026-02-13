import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocations, useRates, calculateResult } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import {
  TrendingUp,
  ShieldCheck,
  MapPin,
  Briefcase,
  ArrowRight,
  BarChart3,
  MessageSquareQuote,
  Building2,
  Download,
} from "lucide-react";

/* ── helpers ──────────────────────────────────────────── */

function fmt(v: number) {
  return v.toLocaleString("sv-SE");
}

function monthlyFromHourly(hourly: number) {
  return Math.round(hourly * 165);
}

/* ── Main component ───────────────────────────────────── */

export default function Report() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();
  const { data: rates } = useRates();
  const [survey, setSurvey] = useState<SurveyData | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem("surveyData");
    if (!raw) {
      navigate("/");
      return;
    }
    setSurvey(JSON.parse(raw));
  }, [navigate]);

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.kommun === survey?.kommun),
    [locations, survey]
  );

  const selectedRate = useMemo(() => {
    if (!rates || !selectedLocation || !survey) return null;
    const zoneRates = rates.filter((r) => r.zon === selectedLocation.zon);
    const exact = zoneRates.find((r) => r.yrkeskategori === survey.yrke);
    if (exact) return exact;
    const fallback = rates.find((r) => r.yrkeskategori === survey.yrke);
    if (!fallback) return null;
    return zoneRates.find((r) => r.typ === fallback.typ) || null;
  }, [rates, selectedLocation, survey]);

  const result = useMemo(() => {
    if (!selectedRate || !survey) return null;
    return calculateResult(selectedRate.timpris_kund, survey.employmentType);
  }, [selectedRate, survey]);

  /* Regional comparison: same profession across all zones */
  const regionalComparison = useMemo(() => {
    if (!rates || !survey) return [];
    const allZones = rates
      .filter((r) => r.yrkeskategori === (survey.yrke || ""))
      .sort((a, b) => a.zon.localeCompare(b.zon));
    return allZones.map((r) => {
      const calc = calculateResult(r.timpris_kund, survey.employmentType);
      return { zon: r.zon, timpris: r.timpris_kund, ...calc };
    });
  }, [rates, survey]);

  const userHourly = useMemo(() => {
    if (!survey) return 0;
    return survey.salaryType === "hourly"
      ? survey.currentSalary
      : Math.round(survey.currentSalary / 165);
  }, [survey]);

  if (!survey || !result || !selectedRate) return null;

  const isEmployee = survey.employmentType === "anstalld";
  const diffPercent = Math.round(((result.high - userHourly) / result.high) * 100);
  const isUnderpaid = userHourly < result.high;

  const margin = 0.15;
  const afterMargin = Math.round(selectedRate.timpris_kund * (1 - margin));

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="hero-gradient py-10 px-5 text-center">
        <div className="max-w-2xl mx-auto space-y-2">
          <p className="text-xs uppercase tracking-widest text-primary-foreground/60">
            Din personliga rapport
          </p>
          <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
            Löneanalys för {survey.yrke}
          </h1>
          <p className="text-sm text-primary-foreground/80">
            {survey.kommun} · {selectedLocation?.region} · {selectedLocation?.zon}
          </p>
        </div>
      </header>

      <main className="px-4 py-8 max-w-2xl mx-auto space-y-6">
        {/* ── 1. Summary verdict ──────────────────── */}
        <Card className="card-shadow overflow-hidden">
          <div
            className={`p-4 flex items-center gap-3 ${
              isUnderpaid ? "bg-destructive/10" : "bg-accent/10"
            }`}
          >
            <TrendingUp
              className={`w-5 h-5 ${isUnderpaid ? "text-destructive" : "text-accent"}`}
            />
            <p className="font-semibold text-foreground">
              {isUnderpaid
                ? `Du kan tjäna upp till ${diffPercent}% mer`
                : "Grattis — din lön ligger i linje med marknaden!"}
            </p>
          </div>
          <CardContent className="pt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <StatBlock label="Din timlön" value={`${fmt(userHourly)} kr`} muted />
              <StatBlock
                label={isEmployee ? "Rekommenderad timlön" : "Rekommenderad ersättning"}
                value={`${fmt(result.low)}–${fmt(result.high)} kr`}
                accent
              />
              <StatBlock label="Din månadslön" value={`${fmt(monthlyFromHourly(userHourly))} kr`} muted />
              <StatBlock
                label="Möjlig månadslön"
                value={`${fmt(monthlyFromHourly(result.low))}–${fmt(monthlyFromHourly(result.high))} kr`}
                accent
              />
            </div>
          </CardContent>
        </Card>

        {/* ── 2. How we calculated ───────────────── */}
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={BarChart3} title="Så räknade vi" />
            <div className="space-y-3 text-sm text-muted-foreground">
              <CalcRow label="Ramavtalspris (timpris mot kund)" value={`${fmt(selectedRate.timpris_kund)} kr/h`} />
              <CalcRow label="Bemanningsbolagets marginal (15%)" value={`−${fmt(Math.round(selectedRate.timpris_kund * margin))} kr/h`} />
              <CalcRow label="Löneutrymme efter marginal" value={`${fmt(afterMargin)} kr/h`} />
              {isEmployee ? (
                <>
                  <CalcRow
                    label="÷ 1.42 (arbetsgivaravgift + semester + tjänstepension 4.5%)"
                    value={`= ${fmt(Math.round(afterMargin / 1.42))} kr/h brutto`}
                  />
                  <p className="text-xs text-muted-foreground/70 pt-1">
                    Spannet {fmt(result.low)}–{fmt(result.high)} kr/h baseras på 10–15% marginal.
                  </p>
                </>
              ) : (
                <p className="text-xs text-muted-foreground/70 pt-1">
                  Som egenföretagare bör du fakturera 85–90% av kundpriset, dvs {fmt(result.low)}–{fmt(result.high)} kr/h.
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── 3. Regional comparison ─────────────── */}
        {regionalComparison.length > 1 && (
          <Card className="card-shadow">
            <CardContent className="pt-6 space-y-4">
              <SectionHeading icon={MapPin} title="Jämförelse mellan zoner" />
              <div className="space-y-3">
                {regionalComparison.map((z) => {
                  const isCurrent = z.zon === selectedLocation?.zon;
                  return (
                    <div
                      key={z.zon}
                      className={`flex items-center justify-between p-3 rounded-lg text-sm ${
                        isCurrent
                          ? "bg-primary/5 border border-primary/20"
                          : "bg-muted/50"
                      }`}
                    >
                      <div>
                        <span className="font-medium text-foreground">{z.zon}</span>
                        {isCurrent && (
                          <span className="ml-2 text-xs text-primary font-semibold">
                            Din zon
                          </span>
                        )}
                      </div>
                      <span className="font-semibold text-foreground">
                        {fmt(z.low)}–{fmt(z.high)} kr/h
                      </span>
                    </div>
                  );
                })}
              </div>
              <p className="text-xs text-muted-foreground">
                Priserna baseras på ramavtalspriser för {survey.yrke}.
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── 4. Negotiation tips ────────────────── */}
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={MessageSquareQuote} title="Förhandlingsrekommendationer" />
            <ul className="space-y-3">
              {getNegotiationTips(isEmployee, isUnderpaid, diffPercent, survey.yrke || "").map(
                (tip, i) => (
                  <li key={i} className="flex items-start gap-3 text-sm">
                    <ArrowRight className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                    <span className="text-muted-foreground">{tip}</span>
                  </li>
                )
              )}
            </ul>
          </CardContent>
        </Card>

        {/* ── 5. Approved suppliers ──────────────── */}
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-4">
            <SectionHeading icon={Building2} title="Godkända leverantörer (ramavtal)" />
            <p className="text-sm text-muted-foreground">
              Följande bemanningsföretag har ramavtal med Sveriges kommuner och regioner
              för {survey.yrke}:
            </p>
            <div className="grid grid-cols-2 gap-2">
              {APPROVED_SUPPLIERS.map((s) => (
                <div
                  key={s}
                  className="flex items-center gap-2 p-2 rounded-lg bg-muted/50 text-sm"
                >
                  <Briefcase className="w-3.5 h-3.5 text-primary shrink-0" />
                  <span className="text-foreground">{s}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Disclaimer ─────────────────────────── */}
        <Separator />
        <p className="text-xs text-muted-foreground text-center leading-relaxed pb-8">
          Denna rapport baseras på offentliga ramavtalspriser och är avsedd som vägledning.
          Faktisk lön kan variera beroende på arbetsgivare, uppdrag och individuella avtal.
          <br />
          © {new Date().getFullYear()} BraGig.se
        </p>
      </main>
    </div>
  );
}

/* ── Sub-components ────────────────────────────────────── */

function SectionHeading({ icon: Icon, title }: { icon: any; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-5 h-5 text-primary" />
      <h2 className="font-display text-lg text-foreground">{title}</h2>
    </div>
  );
}

function StatBlock({
  label,
  value,
  muted,
  accent,
}: {
  label: string;
  value: string;
  muted?: boolean;
  accent?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg ${accent ? "bg-accent/10" : "bg-muted/50"}`}>
      <p className="text-xs text-muted-foreground mb-1">{label}</p>
      <p className={`text-base font-semibold ${accent ? "text-accent" : "text-foreground"}`}>
        {value}
      </p>
    </div>
  );
}

function CalcRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span>{label}</span>
      <span className="font-medium text-foreground whitespace-nowrap">{value}</span>
    </div>
  );
}

/* ── Static data ──────────────────────────────────────── */

const APPROVED_SUPPLIERS = [
  "Dedicare",
  "Bemanning Sverige",
  "Medpeople",
  "Randstad Care",
  "Adecco Medical",
  "Manpower Care",
  "Uniflex",
  "Qualipharma",
];

function getNegotiationTips(
  isEmployee: boolean,
  isUnderpaid: boolean,
  diffPercent: number,
  yrke: string
): string[] {
  const tips: string[] = [];

  if (isUnderpaid) {
    tips.push(
      `Enligt ramavtalet bör din ersättning ligga ${diffPercent}% högre. Använd detta som utgångspunkt i förhandlingen.`
    );
    tips.push(
      "Begär ett möte med din bemanningskonsult och presentera ramavtalspriserna som referens."
    );
  } else {
    tips.push(
      "Din lön ligger redan nära marknadspris — bra förhandlat! Fokusera på andra förmåner."
    );
  }

  if (isEmployee) {
    tips.push(
      "Fråga om tjänstepensionen uppgår till minst 4.5% — det ingår i ramavtalets kalkyl."
    );
    tips.push(
      "Kontrollera att OB-tilläggen följer gällande kollektivavtal. Många bemanningsbolag betalar lägre OB."
    );
    tips.push(
      "Förhandla om utbildningsbudget och kompetensutveckling — det kostar bolaget lite men är värt mycket för dig."
    );
  } else {
    tips.push(
      "Som egenföretagare bör du fakturera minst 85% av kundpriset. Under det äter marginalen in på din vinst."
    );
    tips.push(
      "Förhandla betalningsvillkor — 15 dagars betaltid istället för 30 gör stor skillnad för ditt kassaflöde."
    );
  }

  tips.push(
    `Nämn att du är medveten om ramavtalspriserna för ${yrke} i din zon — det signalerar att du är insatt.`
  );

  return tips;
}
