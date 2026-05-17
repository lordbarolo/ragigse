import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { TrendingUp, PiggyBank, Wallet } from "lucide-react";
import {
  calculateAllScenarios,
  calculateCompensationMix,
  PENSION_THRESHOLD_MONTHLY,
  type PensionScenario,
  type SimulationResult,
} from "@/lib/pensionSimulation";

const MIN_SALARY = 20000;
const MAX_SALARY = 250000;
const STEP = 500;

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

const SCENARIO_META: Record<
  PensionScenario,
  { label: string; sublabel: string; accent: string }
> = {
  none: {
    label: "Ingen pension",
    sublabel: "0 % avsättning",
    accent: "bg-muted text-muted-foreground",
  },
  standard: {
    label: "Standard",
    sublabel: "4,5 % på hela lönen",
    accent: "bg-primary/10 text-primary",
  },
  tiered: {
    label: "Trappstegsmodell",
    sublabel: `4,5 % upp till ${fmt(PENSION_THRESHOLD_MONTHLY)} kr · 30 % över`,
    accent: "bg-accent text-accent-foreground",
  },
};

interface PensionImpactSimulatorProps {
  initialSalary?: number;
}

export default function PensionImpactSimulator({
  initialSalary = 55000,
}: PensionImpactSimulatorProps) {
  const clamped = Math.min(
    MAX_SALARY,
    Math.max(MIN_SALARY, Math.round(initialSalary / STEP) * STEP)
  );
  const [salary, setSalary] = useState<number>(clamped);

  const scenarios = useMemo(() => calculateAllScenarios(salary), [salary]);
  const baseline = scenarios.none;

  return (
    <Card className="p-5 border border-border bg-card">
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <PiggyBank className="w-4 h-4 text-primary" />
            Pensionssimulator
          </h3>
          <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
            Dra i reglaget för att se hur olika pensionsnivåer påverkar
            kontantlön, timersättning och total kompensation.
          </p>
        </div>
      </div>

      {/* Slider */}
      <div className="mb-5">
        <div className="flex items-baseline justify-between mb-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground font-medium">
            Bruttolön
          </span>
          <span className="font-display text-lg font-bold text-foreground tabular-nums">
            {fmt(salary)}{" "}
            <span className="text-xs font-normal text-muted-foreground">
              kr/mån
            </span>
          </span>
        </div>
        <Slider
          value={[salary]}
          min={MIN_SALARY}
          max={MAX_SALARY}
          step={STEP}
          onValueChange={(v) => setSalary(v[0])}
          aria-label="Bruttolön per månad"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground mt-1.5 tabular-nums">
          <span>{fmt(MIN_SALARY)}</span>
          <span className="opacity-60">
            brytpunkt {fmt(PENSION_THRESHOLD_MONTHLY)}
          </span>
          <span>{fmt(MAX_SALARY)}</span>
        </div>
      </div>

      {/* Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(Object.keys(scenarios) as PensionScenario[]).map((key) => (
          <ScenarioCard
            key={key}
            result={scenarios[key]}
            baseline={baseline}
          />
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground mt-4 leading-relaxed">
        Total arbetsgivar-/kundkostnad inkluderar arbetsgivaravgift (31,42 %),
        AFA/TFA (0,85 %), pensionspremie och särskild löneskatt på pension
        (24,26 %). Vid samma totalkostnad sänker högre pension den direkta
        kontantlönen.
      </p>
    </Card>
  );
}

function ScenarioCard({
  result,
  baseline,
}: {
  result: SimulationResult;
  baseline: SimulationResult;
}) {
  const meta = SCENARIO_META[result.scenario];
  const mix = calculateCompensationMix(result);
  const diffVsBaseline = result.totalCost - baseline.totalCost;

  return (
    <div className="rounded-lg border border-border bg-background/60 p-3 flex flex-col">
      <div className="mb-3">
        <span
          className={`inline-block text-[10px] font-semibold uppercase tracking-wide px-2 py-0.5 rounded ${meta.accent}`}
        >
          {meta.label}
        </span>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-tight">
          {meta.sublabel}
        </p>
      </div>

      <dl className="space-y-2 text-sm tabular-nums">
        <Row
          icon={<Wallet className="w-3 h-3" />}
          label="Månadslön"
          value={`${fmt(result.monthlySalary)} kr`}
        />
        <Row
          label="Timlön"
          value={`${fmt(result.hourlyEquivalent)} kr/h`}
          muted
        />
        <Row
          icon={<PiggyBank className="w-3 h-3" />}
          label="Pension"
          value={`${fmt(result.pensionContribution)} kr`}
        />
        <div className="h-px bg-border/60 my-1" />
        <Row
          icon={<TrendingUp className="w-3 h-3" />}
          label="Total kostnad"
          value={`${fmt(result.totalCost)} kr`}
          bold
        />
        <Row
          label="vs 0 % pension"
          value={
            diffVsBaseline === 0
              ? "—"
              : `${diffVsBaseline > 0 ? "+" : ""}${fmt(diffVsBaseline)} kr`
          }
          muted
        />
      </dl>

      {/* Mix bar */}
      <div className="mt-3">
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className="bg-primary"
            style={{ width: `${mix.salaryShare * 100}%` }}
            title={`Bruttolön ${(mix.salaryShare * 100).toFixed(0)} %`}
          />
          <div
            className="bg-primary/50"
            style={{ width: `${mix.pensionShare * 100}%` }}
            title={`Pension ${(mix.pensionShare * 100).toFixed(0)} %`}
          />
          <div
            className="bg-muted-foreground/30"
            style={{ width: `${mix.feesShare * 100}%` }}
            title={`Skatt/avgifter ${(mix.feesShare * 100).toFixed(0)} %`}
          />
        </div>
        <div className="flex justify-between text-[9px] text-muted-foreground mt-1">
          <span>Lön {(mix.salaryShare * 100).toFixed(0)} %</span>
          <span>Pension {(mix.pensionShare * 100).toFixed(0)} %</span>
          <span>Avgifter {(mix.feesShare * 100).toFixed(0)} %</span>
        </div>
      </div>
    </div>
  );
}

function Row({
  icon,
  label,
  value,
  bold,
  muted,
}: {
  icon?: React.ReactNode;
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span
        className={`text-xs flex items-center gap-1.5 ${
          muted ? "text-muted-foreground" : "text-foreground/80"
        }`}
      >
        {icon}
        {label}
      </span>
      <span
        className={
          bold
            ? "font-semibold text-foreground"
            : muted
            ? "text-muted-foreground text-xs"
            : "text-foreground"
        }
      >
        {value}
      </span>
    </div>
  );
}
