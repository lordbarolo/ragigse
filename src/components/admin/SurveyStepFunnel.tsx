import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2, RefreshCw } from "lucide-react";
import type { AdminAnalyticsData } from "@/hooks/useAdminAnalytics";

interface Props {
  data: AdminAnalyticsData | null;
  loading: boolean;
  period: number;
  onRefresh: () => void;
}

const STEPS = [
  { key: "landing_viewed", label: "Landning" },
  { key: "survey_started", label: "Enkät start" },
  { key: "survey_step_viewed", label: "Steg visat" },
  { key: "survey_step_completed", label: "Steg klart" },
] as const;

const fmt = (n: number) => n.toLocaleString("sv-SE");
const pct = (num: number, den: number) => (den > 0 ? (num / den) * 100 : 0);
const pctText = (p: number) => `${p.toFixed(1).replace(".", ",")}%`;

function crColor(p: number): string {
  if (p < 10) return "text-destructive";
  if (p < 25) return "text-yellow-500";
  return "text-primary";
}

export default function SurveyStepFunnel({ data, loading, period, onRefresh }: Props) {
  const rows = (() => {
    if (!data?.timeSeries) return [];
    return [...data.timeSeries]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, period)
      .map((entry) => ({
        date: entry.date,
        counts: STEPS.map((s) => entry.events?.[s.key] || 0),
      }));
  })();

  const totals = STEPS.map((_, i) => rows.reduce((sum, r) => sum + r.counts[i], 0));
  const totalCr = pct(totals[3], totals[0]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Survey-funnel per dag</CardTitle>
            <CardDescription>
              landing_viewed → survey_started → survey_step_viewed → survey_step_completed · senaste {period}d
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : rows.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Ingen data ännu.</p>
        ) : (
          <div className="overflow-x-auto max-h-[500px] overflow-y-auto rounded border">
            <Table>
              <TableHeader className="sticky top-0 bg-card z-10">
                <TableRow>
                  <TableHead className="w-[110px]">Datum</TableHead>
                  {STEPS.map((s) => (
                    <TableHead key={s.key} className="text-right">{s.label}</TableHead>
                  ))}
                  <TableHead className="text-right">CR (Klart/Landning)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => {
                  const dayCr = pct(r.counts[3], r.counts[0]);
                  return (
                    <TableRow key={r.date}>
                      <TableCell className="font-mono text-xs text-muted-foreground">{r.date}</TableCell>
                      {r.counts.map((c, i) => {
                        const stepPct = i === 0 ? null : pct(c, r.counts[i - 1]);
                        return (
                          <TableCell key={i} className="text-right font-mono text-sm">
                            <span className="text-foreground">{fmt(c)}</span>
                            {stepPct !== null && c > 0 && (
                              <span className="text-muted-foreground text-xs ml-1.5">
                                ({Math.round(stepPct)}%)
                              </span>
                            )}
                          </TableCell>
                        );
                      })}
                      <TableCell className={`text-right font-mono text-sm font-semibold ${crColor(dayCr)}`}>
                        {pctText(dayCr)}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter className="sticky bottom-0 bg-muted/80 backdrop-blur">
                <TableRow>
                  <TableCell className="font-semibold text-xs">TOTALT {period}d</TableCell>
                  {totals.map((t, i) => {
                    const stepPct = i === 0 ? null : pct(t, totals[i - 1]);
                    return (
                      <TableCell key={i} className="text-right font-mono text-sm font-semibold">
                        <span className="text-foreground">{fmt(t)}</span>
                        {stepPct !== null && t > 0 && (
                          <span className="text-muted-foreground text-xs ml-1.5">
                            ({Math.round(stepPct)}%)
                          </span>
                        )}
                      </TableCell>
                    );
                  })}
                  <TableCell className={`text-right font-mono text-sm font-bold ${crColor(totalCr)}`}>
                    {pctText(totalCr)}
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
