import { useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { PiggyBank } from "lucide-react";
import {
  calculateAllScenarios,
  PENSION_THRESHOLD_MONTHLY,
} from "@/lib/pensionSimulation";

const MIN_SALARY = 20000;
const MAX_SALARY = 250000;
const STEP = 500;

const fmt = (n: number) =>
  n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

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

  const rows = [
    {
      label: "0 % tjänstepension",
      amount: scenarios.none.pensionContribution,
      note: null as string | null,
    },
    {
      label: "4,5 % tjänstepension",
      amount: scenarios.standard.pensionContribution,
      note: null,
    },
    {
      label: "Kollektivavtalad tjänstepension",
      amount: scenarios.tiered.pensionContribution,
      note: "Träder i kraft på årslön som överstiger 7,5 IBB",
    },
  ];

  return (
    <Card className="p-5 border border-border bg-card">
      <div className="mb-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <PiggyBank className="w-4 h-4 text-primary" />
          Pensionssimulator
        </h3>
        <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
          Dra i reglaget för att se pensionsbeloppet vid olika avsättningsnivåer.
        </p>
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

      {/* Three simple rows */}
      <ul className="divide-y divide-border border-t border-b border-border">
        {rows.map((r) => (
          <li
            key={r.label}
            className="flex items-baseline justify-between gap-3 py-3"
          >
            <div className="min-w-0">
              <p className="text-sm text-foreground">{r.label}</p>
              {r.note && (
                <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">
                  {r.note}
                </p>
              )}
            </div>
            <span className="font-semibold text-foreground tabular-nums whitespace-nowrap">
              {fmt(r.amount)} kr
            </span>
          </li>
        ))}
      </ul>
    </Card>
  );
}
