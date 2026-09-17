import { AlertTriangle, CheckCircle2, CircleAlert, Pencil, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { BetaAssumptionBadge } from "./BetaAssumptionBadge";
import { BetaMarginGauge } from "./BetaMarginGauge";
import type { BetaAnalysisResult, BetaRisk } from "@/lib/beta/types";

const STATUS = {
  green: { label: "Rimlig nivå", className: "border-success/40 bg-success/10 text-success" },
  yellow: { label: "Förhandlingsutrymme finns", className: "border-warning/40 bg-warning/10 text-warning" },
  red: { label: "Tydligt underbetalt", className: "border-destructive/40 bg-destructive/10 text-destructive" },
} as const;

function RiskIcon({ risk }: { risk: BetaRisk }) {
  if (risk.severity === "high") return <CircleAlert className="h-5 w-5 text-destructive" aria-hidden="true" />;
  if (risk.severity === "medium") return <AlertTriangle className="h-5 w-5 text-warning" aria-hidden="true" />;
  return <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />;
}

function money(value: number): string {
  return `${Math.round(value).toLocaleString("sv-SE")} kr/h`;
}

interface BetaResultStepProps {
  result: BetaAnalysisResult;
  onAdjust: () => void;
  onCounter: () => void;
  onReset: () => void;
}

export function BetaResultStep({ result, onAdjust, onCounter, onReset }: BetaResultStepProps) {
  const { calc, benchmark, extracted } = result;
  const status = STATUS[calc.tier];
  const agencyCost = calc.normalized_rate + calc.cost_adjustment;
  const marginSek = benchmark.rate - agencyCost;
  const costParts = [
    extracted.housing_included ? "boende +150" : null,
    extracted.travel_included ? "resa +50" : null,
  ].filter(Boolean);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">Analysen är klar</p>
        <h1 className="mt-2 text-3xl font-semibold sm:text-4xl">Din ersättning i avtalet</h1>
      </div>

      <Card className="p-5 sm:p-7">
        <div className="grid items-center gap-8 md:grid-cols-[220px_minmax(0,1fr)]">
          <div>
            <BetaMarginGauge margin={calc.margin_pct} tier={calc.tier} />
            <div className={`mx-auto mt-4 w-fit rounded-full border px-3 py-1 text-sm font-medium ${status.className}`}>
              {status.label}
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="text-xl font-semibold">Regionens betalning vs din ersättning</h2>
            <dl className="mt-5 divide-y divide-border overflow-hidden rounded-md border border-border">
              <div className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <dt>
                  <span className="font-medium">SKR-takpris</span>
                  <span className="mt-1 block text-xs leading-5 text-muted-foreground">
                    Zon {result.zone} · {benchmark.specialty ?? extracted.specialty ?? extracted.profession} · {benchmark.source ?? "SKR 2026"}
                  </span>
                </dt>
                <dd className="flex flex-wrap items-center gap-2 font-semibold sm:justify-end">
                  {money(benchmark.rate)}
                  {result.zone_assumed && <BetaAssumptionBadge explanation="Ort saknades eller kunde inte matchas – zon 2 antagen." />}
                  {benchmark.assumed && <BetaAssumptionBadge explanation="Rollen kunde inte matchas mot katalogen – ett försiktigt standardvärde användes." />}
                </dd>
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <dt>
                  <span className="font-medium">Din ersättning</span>
                  <span className="mt-1 block text-xs text-muted-foreground">Fakturavärde per timme</span>
                </dt>
                <dd className="flex flex-wrap items-center gap-2 font-semibold sm:justify-end">
                  {money(calc.normalized_rate)}
                  {extracted.compensation_type === "Anställd" && (
                    <BetaAssumptionBadge explanation={calc.normalization_note} />
                  )}
                </dd>
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <dt>
                  <span className="font-medium">Omkostnader byrån bär</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{costParts.length ? costParts.join(" kr/h · ") + " kr/h" : "Inga markerade omkostnader"}</span>
                </dt>
                <dd className="font-semibold sm:text-right">{money(calc.cost_adjustment)}</dd>
              </div>
              <div className="grid gap-2 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center">
                <dt className="font-medium">Byråns marginal</dt>
                <dd className="font-semibold sm:text-right">{money(marginSek)} · {calc.margin_pct.toLocaleString("sv-SE", { maximumFractionDigits: 1 })} %</dd>
              </div>
            </dl>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <section aria-labelledby="beta-risks-title">
          <Card className="h-full p-5 sm:p-6">
            <h2 id="beta-risks-title" className="text-xl font-semibold">Riskanalys</h2>
            <ul className="mt-5 space-y-4">
              {result.flagged_issues.map((risk, index) => (
                <li key={`${risk.title}-${index}`} className="flex gap-3">
                  <RiskIcon risk={risk} />
                  <div>
                    <p className="text-sm font-medium">{risk.title}</p>
                    <p className="mt-1 text-sm leading-6 text-muted-foreground">{risk.detail}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </section>

        <section aria-labelledby="beta-interpretation-title">
          <Card className="h-full p-5 sm:p-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 id="beta-interpretation-title" className="text-xl font-semibold">Så tolkade AI:n dokumentet</h2>
              <Button type="button" size="sm" variant="ghost" onClick={onAdjust}>
                <Pencil aria-hidden="true" /> Något blev fel? Justera
              </Button>
            </div>
            <p className="mt-5 text-sm leading-7 text-muted-foreground">{extracted.masked_summary}</p>
          </Card>
        </section>
      </div>

      <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
        <Button type="button" onClick={onCounter}>Visa mitt motbud →</Button>
        <Button type="button" variant="ghost" onClick={onReset}><RotateCcw aria-hidden="true" /> Granska ett annat avtal</Button>
      </div>

      <BetaFootnote />
    </div>
  );
}

export function BetaFootnote() {
  return (
    <p className="mx-auto max-w-3xl text-center text-xs leading-5 text-muted-foreground">
      Beräkningen bygger på SKR:s ramavtal 2026 (grundpris, exkl. OB) och schabloner för omkostnader.
      Den är vägledande, inte ett besked om vad byrån faktiskt fakturerar.
    </p>
  );
}
