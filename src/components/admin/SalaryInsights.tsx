import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, BarChart3, RefreshCw, Download, Users, Clock } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface RoleStat {
  role: string;
  employment_type: string;
  count: number;
  avg: number;
  median: number;
  min: number;
  max: number;
}

interface KommunStat {
  kommun: string;
  employment_type: string;
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
  hourly_bounds?: Record<string, { min: number; max: number }>;
  by_role: RoleStat[];
  by_kommun: KommunStat[];
  by_role_kommun: RoleKommunStat[];
  repeat_users: RepeatUsers;
}

type EtFilter = "all" | "anstalld" | "foretagare";

const ET_LABELS: Record<string, string> = {
  anstalld: "Anställd",
  foretagare: "Företagare",
  all: "Alla",
};

function etLabel(et: string): string {
  return ET_LABELS[et] || et;
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`;
  if (h < 24) return `${Math.round(h)} tim`;
  const days = Math.round(h / 24);
  return days === 1 ? "1 dag" : `${days} dagar`;
}

function downloadCsv(filename: string, headers: string[], rows: string[][]) {
  const bom = "\uFEFF"; // UTF-8 BOM for Excel
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

  const filterEt = <T extends { employment_type: string }>(arr: T[]): T[] =>
    etFilter === "all" ? arr : arr.filter((r) => r.employment_type === etFilter);

  const exportRoles = () => {
    if (!data) return;
    const rows = filterEt(data.by_role);
    downloadCsv(
      "ersattning_per_roll.csv",
      ["Yrkesroll", "Typ", "Antal", "Snitt kr/h", "Median kr/h", "Min", "Max"],
      rows.map((r) => [r.role, etLabel(r.employment_type), String(r.count), String(r.avg), String(r.median), String(r.min), String(r.max)])
    );
  };

  const exportKommuner = () => {
    if (!data) return;
    const rows = filterEt(data.by_kommun).slice(0, 50);
    downloadCsv(
      "ersattning_per_kommun.csv",
      ["Kommun", "Typ", "Antal", "Snitt kr/h", "Median kr/h", "Min", "Max"],
      rows.map((k) => [k.kommun, etLabel(k.employment_type), String(k.count), String(k.avg), String(k.median), String(k.min), String(k.max)])
    );
  };

  const exportAll = () => {
    if (!data) return;
    const roleRows = filterEt(data.by_role).map((r) => ["roll", r.role, "", etLabel(r.employment_type), String(r.count), String(r.avg), String(r.median), String(r.min), String(r.max)]);
    const kommunRows = filterEt(data.by_kommun).map((k) => ["kommun", "", k.kommun, etLabel(k.employment_type), String(k.count), String(k.avg), String(k.median), String(k.min), String(k.max)]);
    downloadCsv(
      "ersattningsanalys_komplett.csv",
      ["Kategori", "Yrkesroll", "Kommun", "Typ", "Antal", "Snitt kr/h", "Median kr/h", "Min", "Max"],
      [...roleRows, ...kommunRows]
    );
  };

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
                Aggregerad data från användarnas angivna ersättningar (normaliserat till kr/h).
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
              Klicka "Ladda data" för att hämta aggregerad lönestatistik.
            </p>
          )}

          {data && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="text-sm">
                  {data.total_leads_with_salary} leads med lönedata
                </Badge>
                {data.filtered_out != null && data.filtered_out > 0 && (
                  <Badge variant="secondary" className="text-sm">
                    {data.filtered_out} filtrerade (utanför {data.hourly_bounds?.min}–{data.hourly_bounds?.max} kr/h)
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
              </div>

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
                        <th className="p-2 font-medium text-right">Antal</th>
                        <th className="p-2 font-medium text-right">Snitt kr/h</th>
                        <th className="p-2 font-medium text-right">Median kr/h</th>
                        <th className="p-2 font-medium text-right">Min</th>
                        <th className="p-2 font-medium text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterEt(data.by_role).map((r, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{r.role}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="text-xs">{etLabel(r.employment_type)}</Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{r.count}</td>
                          <td className="p-2 text-right font-mono font-semibold">{r.avg}</td>
                          <td className="p-2 text-right font-mono">{r.median}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{r.min}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{r.max}</td>
                        </tr>
                      ))}
                      {filterEt(data.by_role).length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Ingen data för valt filter</td></tr>
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
                        <th className="p-2 font-medium text-right">Antal</th>
                        <th className="p-2 font-medium text-right">Snitt kr/h</th>
                        <th className="p-2 font-medium text-right">Median kr/h</th>
                        <th className="p-2 font-medium text-right">Min</th>
                        <th className="p-2 font-medium text-right">Max</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filterEt(data.by_kommun).slice(0, 30).map((k, i) => (
                        <tr key={i} className="border-t">
                          <td className="p-2">{k.kommun}</td>
                          <td className="p-2">
                            <Badge variant="secondary" className="text-xs">{etLabel(k.employment_type)}</Badge>
                          </td>
                          <td className="p-2 text-right font-mono">{k.count}</td>
                          <td className="p-2 text-right font-mono font-semibold">{k.avg}</td>
                          <td className="p-2 text-right font-mono">{k.median}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{k.min}</td>
                          <td className="p-2 text-right font-mono text-muted-foreground">{k.max}</td>
                        </tr>
                      ))}
                      {filterEt(data.by_kommun).length === 0 && (
                        <tr><td colSpan={7} className="p-4 text-center text-muted-foreground">Ingen data för valt filter</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* By Role + Kommun */}
              {filterEt(data.by_role_kommun).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-foreground mb-3">Per yrkesroll + kommun (≥2 svar)</h3>
                  <div className="overflow-x-auto max-h-[300px] overflow-y-auto border rounded-md">
                    <table className="w-full text-sm">
                      <thead className="sticky top-0 bg-muted">
                        <tr className="text-left">
                          <th className="p-2 font-medium">Yrkesroll</th>
                          <th className="p-2 font-medium">Kommun</th>
                          <th className="p-2 font-medium">Typ</th>
                          <th className="p-2 font-medium text-right">Antal</th>
                          <th className="p-2 font-medium text-right">Snitt kr/h</th>
                          <th className="p-2 font-medium text-right">Median kr/h</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filterEt(data.by_role_kommun).map((rk, i) => (
                          <tr key={i} className="border-t">
                            <td className="p-2">{rk.role}</td>
                            <td className="p-2">{rk.kommun}</td>
                            <td className="p-2">
                              <Badge variant="secondary" className="text-xs">{etLabel(rk.employment_type)}</Badge>
                            </td>
                            <td className="p-2 text-right font-mono">{rk.count}</td>
                            <td className="p-2 text-right font-mono font-semibold">{rk.avg}</td>
                            <td className="p-2 text-right font-mono">{rk.median}</td>
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
