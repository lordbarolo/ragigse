import { computeEmployerCost, HOURS_PER_MONTH, ITP1_THRESHOLD_MONTHLY } from "@/lib/calc";
import { Card } from "@/components/ui/card";

interface Props {
  hourlySalary: number;          // bruttolön/h (semester inkl.)
  customerRate?: number;         // kundpris/h som regionen betalar (optional)
  marginShare?: { min: number; max: number }; // t.ex. {min:0.80, max:0.85}
  marginLabel?: string;          // t.ex. "15–20 %"
}

const fmt = (n: number) =>
  new Intl.NumberFormat("sv-SE", { maximumFractionDigits: 0 }).format(Math.round(n));
const fmtPct = (n: number) =>
  `${(n * 100).toLocaleString("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} %`;
const fmt2 = (n: number) =>
  new Intl.NumberFormat("sv-SE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

export default function EmployerCostBreakdown({
  hourlySalary,
  customerRate,
  marginShare,
  marginLabel,
}: Props) {
  const breakdown = computeEmployerCost(hourlySalary);
  const crossesThreshold = breakdown.itp1_high_part > 0;

  // Stegfunktion: regionen → bemanning → arbetsgivarkostnad
  const agencyMargin = customerRate && marginShare
    ? {
        min: customerRate * (1 - marginShare.max),
        max: customerRate * (1 - marginShare.min),
      }
    : null;

  return (
    <Card className="p-6 space-y-6 bg-card border-border">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold tracking-tight">Stegfunktion: vart pengarna går</h3>
        <p className="text-sm text-muted-foreground">
          Anställd, född 1979 eller senare (ITP 1). Semester inkluderad i timlönen.
        </p>
      </div>

      {/* Steg 1: Region → Bemanning → Konsult */}
      {customerRate && agencyMargin && (
        <div className="space-y-3">
          <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Steg 1 – Pengaflöde
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Region betalar</div>
              <div className="text-xl font-semibold">{fmt(customerRate)} kr/h</div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">
                Bemanningens marginal ({marginLabel ?? "15–20 %"})
              </div>
              <div className="text-xl font-semibold">
                {fmt(agencyMargin.min)}–{fmt(agencyMargin.max)} kr/h
              </div>
            </div>
            <div className="rounded-lg border border-border p-3">
              <div className="text-xs text-muted-foreground">Kvar till arbetsgivarkostnad</div>
              <div className="text-xl font-semibold">
                {fmt(customerRate - agencyMargin.max)}–{fmt(customerRate - agencyMargin.min)} kr/h
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Steg 2: Arbetsgivarkostnad uppdelad */}
      <div className="space-y-3">
        <h4 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          Steg 2 – Arbetsgivarkostnad vid {fmt(hourlySalary)} kr/h
        </h4>
        <div className="text-xs text-muted-foreground">
          Månadslön: {fmt(breakdown.monthly_salary)} kr ({HOURS_PER_MONTH} h)
          {crossesThreshold && (
            <> · över brytpunkt 7,5 IBB ({fmt(ITP1_THRESHOLD_MONTHLY)} kr/mån)</>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-2 font-medium">Kostnadspost</th>
                <th className="py-2 font-medium text-right">Kr/timme</th>
                <th className="py-2 font-medium text-right">% av timlön</th>
              </tr>
            </thead>
            <tbody>
              {breakdown.components.map((c, i) => (
                <tr key={i} className="border-b border-border/50">
                  <td className="py-2">
                    {c.label}
                    {c.label.startsWith("ITP 1") && crossesThreshold && (
                      <div className="text-xs text-muted-foreground">
                        4,5 % × {fmt(breakdown.itp1_low_part)} +
                        30 % × {fmt(breakdown.itp1_high_part)} = {fmt(breakdown.itp1_per_month)} kr/mån
                      </div>
                    )}
                  </td>
                  <td className="py-2 text-right tabular-nums">{fmt2(c.per_hour)}</td>
                  <td className="py-2 text-right tabular-nums">{fmtPct(c.pct_of_salary)}</td>
                </tr>
              ))}
              <tr className="font-semibold">
                <td className="py-3">Total arbetsgivarkostnad</td>
                <td className="py-3 text-right tabular-nums">
                  {fmt2(breakdown.total_employer_cost_per_h)}
                </td>
                <td className="py-3 text-right tabular-nums">{fmtPct(breakdown.total_factor)}</td>
              </tr>
            </tbody>
          </table>
        </div>

        <p className="text-xs text-muted-foreground">
          Faktor: × {breakdown.total_factor.toLocaleString("sv-SE", { maximumFractionDigits: 4 })}
          {" "}(jämfört med tidigare schablon × 1,42).
        </p>
      </div>
    </Card>
  );
}
