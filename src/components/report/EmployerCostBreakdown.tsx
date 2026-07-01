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
          <div className="rounded-lg border border-border/60 bg-muted/30 p-3 text-xs text-muted-foreground leading-relaxed">
            <span className="font-semibold text-foreground">Vad ingår i bemanningens marginal?</span>{" "}
            Utöver vinst och administration täcker marginalen även bemanningsbolagets kostnader
            för konsultens <span className="font-medium text-foreground">resor och boende</span> i
            samband med uppdraget, samt risk för vite, avbokningar och garantitid. Dessa kostnader
            är alltså redan inräknade i den marginal vi använder ({marginLabel ?? "15–20 %"}) och
            dras inte separat från konsultens ersättning.
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
          {" "}(jämfört med tidigare schablon × 1,38).
        </p>

        {/* Förklaring av varje kostnadspost — full transparens */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-2.5 text-xs leading-relaxed">
          <p className="font-semibold text-foreground text-sm">Vad går arbetsgivarens pengar till?</p>
          <ul className="space-y-2 text-muted-foreground">
            <li>
              <span className="font-semibold text-foreground">Arbetsgivaravgifter (31,42 %):</span>{" "}
              Lagstadgad avgift som arbetsgivaren betalar till staten — finansierar pension, sjukförsäkring,
              föräldraförsäkring och arbetsmarknadsavgift.
            </li>
            <li>
              <span className="font-semibold text-foreground">Tjänstepension ITP 1 (4,5 % / 30 %):</span>{" "}
              Kollektivavtalad pensionspremie. 4,5 % på lön upp till 7,5 inkomstbasbelopp
              ({fmt(ITP1_THRESHOLD_MONTHLY)} kr/mån), 30 % på den del som överstiger.
            </li>
            <li>
              <span className="font-semibold text-foreground">Särskild löneskatt på pension (24,26 %):</span>{" "}
              Skatt arbetsgivaren betalar ovanpå pensionspremien — räknas på ITP-premien.
            </li>
            <li>
              <span className="font-semibold text-foreground">AFA/TFA-försäkringar (0,85 %):</span>{" "}
              Kollektivavtalade försäkringar: trygghetsförsäkring vid arbetsskada, sjukförsäkring,
              omställningsstöd och tjänstegrupplivförsäkring.
            </li>
            <li>
              <span className="font-semibold text-foreground">Semesterersättning (12 %):</span>{" "}
              Ingår redan i bruttotimlönen ovan ({fmt2(hourlySalary * 0.12 / 1.12)} kr/h motsvarar
              semesterdelen). Schablonen 12 % motsvarar 25 semesterdagar enligt semesterlagen.
            </li>
          </ul>
        </div>
      </div>
    </Card>
  );
}
