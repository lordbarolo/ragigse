import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, RefreshCw, Download, Users, Clock, Filter } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoleStat {
  role: string;
  employment_type: string;
  salary_type: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface KommunStat {
  kommun: string;
  employment_type: string;
  salary_type: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface RoleKommunStat {
  role: string;
  kommun: string;
  employment_type: string;
  salary_type: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface RepeatUsers {
  unique_emails: number;
  repeat_count: number;
  total_revisits: number;
  avg_return_hours: number | null;
  median_return_hours: number | null;
}

interface InsightsData {
  total_leads_with_salary: number;
  filtered_out?: number;
  iqr_filtered?: number;
  bounds?: { hourly: { min: number; max: number }; monthly: { min: number; max: number } };
  by_role: RoleStat[];
  by_kommun: KommunStat[];
  by_role_kommun: RoleKommunStat[];
  repeat_users: RepeatUsers;
}

type EtFilter = "all" | "anstalld" | "foretagare";
type StFilter = "all" | "hourly" | "monthly";

const ET_LABELS: Record<string, string> = {
  anstalld: "Anställd",
  foretagare: "Företagare",
  all: "Alla",
};

const ST_LABELS: Record<string, string> = {
  hourly: "Timersättning",
  monthly: "Månadsersättning",
  all: "Alla",
};

function etLabel(et: string): string {
  return ET_LABELS[et] || et;
}

function stLabel(st: string): string {
  return ST_LABELS[st] || st;
}

function unitLabel(st: string): string {
  return st === "monthly" ? "kr/mån" : "kr/h";
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${Math.round(h)} tim`;
  const days = Math.round(h / 24);
  return days === 1 ? "1 dag" : `${days} dagar`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const bom = "\uFEFF";
  const csv = bom + [headers.join(";"), ...rows.map((r) => r.join(";"))].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function SalaryInsights() {
  const [data, setData] = useState<InsightsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [etFilter, setEtFilter] = useState<EtFilter>("all");
  const [stFilter, setStFilter] = useState<StFilter>("all");

  const fetchInsights = async () => {
    setLoading(true);
    try {
      const { data: result, error } = await supabase.functions.invoke("salary-insights");
      if (error) throw error;
      if (result?.error) throw new Error(result.error);
      setData(result as InsightsData);
    } catch (e: any) {
      toast({ title: "Fel", description: e.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const filterRows = <T extends { employment_type: string; salary_type: string }>(arr: T[]): T[] =>
    arr.filter((r) =>
      (etFilter === "all" || r.employment_type === etFilter) &&
      (stFilter === "all" || r.salary_type === stFilter)
    );

  const exportRoles = () => {
    if (!data) return;
    const rows = filterRows(data.by_role);
    downloadCsv(
      "ersattning_per_roll.csv",
      ["Yrkesroll", "Anställningstyp", "Ersättningstyp", "Antal", "Snitt", "Median", "Min", "Max"],
      rows.map((r) => [r.role, etLabel(r.employment_type), stLabel(r.salary_type), String(r.count), String(r.avg), String(r.median), String(r.min), String(r.max)])
    );
  };

  const exportKommuner = () => {
    if (!data) return;
    const rows = filterRows(data.by_kommun).slice(0, 50);
    downloadCsv(
      "ersattning_per_kommun.csv",
      ["Kommun", "Anställningstyp", "Ersättningstyp", "Antal", "Snitt", "Median", "Min", "Max"],
      rows.map((k) => [k.kommun, etLabel(k.employment_type), stLabel(k.salary_type), String(k.count), String(k.avg), String(k.median), String(k.min), String(k.max)])
    );
  };

  const exportAll = () => {
    if (!data) return;
    const roleRows = filterRows(data.by_role).map((r) => ["roll", r.role, "", etLabel(r.employment_type), stLabel(r.salary_type), String(r.count), String(r.avg), String(r.median), String(r.min), String(r.max)]);
    const kommunRows = filterRows(data.by_kommun).map((k) => ["kommun", "", k.kommun, etLabel(k.employment_type), stLabel(k.salary_type), String(k.count), String(k.avg), String(k.median), String(k.min), String(k.max)]);
    downloadCsv(
      "ersattningsanalys_komplett.csv",
      ["Kategori", "Yrkesroll", "Kommun", "Anställningstyp", "Ersättningstyp", "Antal", "Snitt", "Median", "Min", "Max"],
      [...roleRows, ...kommunRows]
    );
  };

  const FilterBar = () => (
    <div className="flex items-center gap-3 flex-wrap">
      <Badge variant="outline" className="text-sm">
        {data!.total_leads_with_salary} leads med ersättningsdata
      </Badge>
      {(data!.filtered_out ?? 0) > 0 && (
        <Badge variant="secondary" className="text-sm">
          {data!.filtered_out} bounds-filtrerade
        </Badge>
      )}
      {(data!.iqr_filtered ?? 0) > 0 && (
        <Badge variant="secondary" className="text-sm">
          <Filter className="w-3 h-3 mr-1" />
          {data!.iqr_filtered} IQR-outliers borttagna
        </Badge>
      )}
      {/* Employment type filter */}
      <div className="flex rounded-md border border-input overflow-hidden text-sm">
        {(["all", "anstalld", "foretagare"] as EtFilter[]).map((et) => (
          <button
            key={et}
            onClick={() => setEtFilter(et)}
            className={`px-3 py-1.5 transition-colors ${
              etFilter === et
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {etLabel(et)}
          </button>
        ))}
      </div>
      {/* Salary type filter */}
      <div className="flex rounded-md border border-input overflow-hidden text-sm">
        {(["all", "hourly", "monthly"] as StFilter[]).map((st) => (
          <button
            key={st}
            onClick={() => setStFilter(st)}
            className={`px-3 py-1.5 transition-colors ${
              stFilter === st
                ? "bg-primary text-primary-foreground"
                : "bg-background text-muted-foreground hover:bg-muted"
            }`}
          >
            {stLabel(st)}
          </button>
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5" />
                Angiven ersättning – marknadsöversikt
              </CardTitle>
              <CardDescription>
                Aggregerad data från användarnas angivna ersättningar. IQR-filtrering aktiv (Q1−1.5×IQR → Q3+1.5×IQR).
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={fetchInsights} disabled={loading} variant="outline" size="sm">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                <span className="ml-2">{data ? "Uppdatera" : "Ladda data"}</span>
              </Button>
              {data && (
                <Button onClick={exportAll} variant="outline" size="sm">
                  <Download className="w-4 h-4" />
                  <span className="ml-2">Exportera allt</span>
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {!data && !loading && (
            <p className="text-muted-foreground text-center py-6 text-sm">
              Klicka "Ladda data" för att hämta aggregerad ersättningsstatistik.
            </p>
          )}

          {data && (
            <div className="space-y-6">
              <FilterBar />

              {/* By Role */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Per yrkesroll</h3>
                  <Button onClick={exportRoles} variant="ghost" size="sm" className="h-7 text-xs">
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Yrkesroll</th>
                        <th className="p-2 font-medium">Typ</th>
                        <th className="p-2 font-medium">Ersättningstyp</th>
                        <th className="p-2 font-medium text-right">Antal</th>
                        <th className="p-2 font-medium text-right">Snitt</th>
                        <th className="p-2 font-medium text-right">Median</th>
                        <th className="p-2 font-medium text-right">Min</th>
                        <th className="p-2 font-medium text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterRows(data.by_role).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{r.role}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="text-xs">{etLabel(r.employment_type)}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant={r.salary_type === "monthly" ? "default" : "outline"} className="text-xs">
                              {stLabel(r.salary_type)}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{r.count}</td>
                          <td className="p-2 text-right font-mono font-semibold">{r.avg.toLocaleString()} {unitLabel(r.salary_type)}</td>
                          <td className="p-2 text-right font-mono">{r.median.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{r.min.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{r.max.toLocaleString()}</td>
                        </tr>
                      ))}
                      {filterRows(data.by_role).length === 0 && (
                        <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Ingen data för valt filter</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Kommun */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground">Per kommun (topp 30)</h3>
                  <Button onClick={exportKommuner} variant="ghost" size="sm" className="h-7 text-xs">
                    <Download className="w-3 h-3 mr-1" /> CSV
                  </Button>
                </div>
                <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted">
                      <tr className="text-left">
                        <th className="p-2 font-medium">Kommun</th>
                        <th className="p-2 font-medium">Typ</th>
                        <th className="p-2 font-medium">Ersättningstyp</th>
                        <th className="p-2 font-medium text-right">Antal</th>
                        <th className="p-2 font-medium text-right">Snitt</th>
                        <th className="p-2 font-medium text-right">Median</th>
                        <th className="p-2 font-medium text-right">Min</th>
                        <th className="p-2 font-medium text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterRows(data.by_kommun).slice(0, 30).map((k, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{k.kommun}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="text-xs">{etLabel(k.employment_type)}</Badge>
                          </td>
                          <td className="p-2">
                            <Badge variant={k.salary_type === "monthly" ? "default" : "outline"} className="text-xs">
                              {stLabel(k.salary_type)}
                            </Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{k.count}</td>
                          <td className="p-2 text-right font-mono font-semibold">{k.avg.toLocaleString()} {unitLabel(k.salary_type)}</td>
                          <td className="p-2 text-right font-mono">{k.median.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{k.min.toLocaleString()}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{k.max.toLocaleString()}</td>
                        </tr>
                      ))}
                      {filterRows(data.by_kommun).length === 0 && (
                        <tr><td colSpan={8} className="p-4 text-center text-muted-foreground">Ingen data för valt filter</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Role + Kommun */}
              {filterRows(data.by_role_kommun).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Per yrkesroll + kommun (≥2 svar)</h3>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr className="text-left">
                          <th className="p-2 font-medium">Yrkesroll</th>
                          <th className="p-2 font-medium">Kommun</th>
                          <th className="p-2 font-medium">Typ</th>
                          <th className="p-2 font-medium">Ersättningstyp</th>
                          <th className="p-2 font-medium text-right">Antal</th>
                          <th className="p-2 font-medium text-right">Snitt</th>
                          <th className="p-2 font-medium text-right">Median</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterRows(data.by_role_kommun).map((rk, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{rk.role}</td>
                            <td className="p-2">{rk.kommun}</td>
                            <td className="p-2">
                              <Badge variant="secondary" className="text-xs">{etLabel(rk.employment_type)}</Badge>
                            </td>
                            <td className="p-2">
                              <Badge variant={rk.salary_type === "monthly" ? "default" : "outline"} className="text-xs">
                                {stLabel(rk.salary_type)}
                              </Badge>
                            </td>
                            <td className="p-2 text-right font-mono">{rk.count}</td>
                            <td className="p-2 text-right font-mono font-semibold">{rk.avg.toLocaleString()} {unitLabel(rk.salary_type)}</td>
                            <td className="p-2 text-right font-mono">{rk.median.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Repeat Users */}
      {data?.repeat_users && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="w-5 h-5" />
              Återkommande användare
            </CardTitle>
            <CardDescription>
              Användare som gjort enkäten mer än en gång (baserat på e-postadress).
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{data.repeat_users.unique_emails}</p>
                <p className="text-xs text-muted-foreground mt-1">Unika e-poster</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <p className="text-2xl font-bold text-foreground">{data.repeat_users.repeat_count}</p>
                <p className="text-xs text-muted-foreground mt-1">Återvändare</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold text-foreground">
                    {data.repeat_users.median_return_hours !== null
                      ? formatHours(data.repeat_users.median_return_hours)
                      : "–"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Median tid till retur</p>
              </div>
              <div className="rounded-lg border border-border bg-muted/30 p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Clock className="w-4 h-4 text-muted-foreground" />
                  <p className="text-2xl font-bold text-foreground">
                    {data.repeat_users.avg_return_hours !== null
                      ? formatHours(data.repeat_users.avg_return_hours)
                      : "–"}
                  </p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">Snitt tid till retur</p>
              </div>
            </div>
            {data.repeat_users.repeat_count > 0 && (
              <p className="text-xs text-muted-foreground mt-3">
                {Math.round((data.repeat_users.repeat_count / data.repeat_users.unique_emails) * 100)}% av användarna med e-post har gjort enkäten mer än en gång.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
