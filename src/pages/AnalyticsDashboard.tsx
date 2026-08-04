import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, RefreshCw, BarChart3, Users, TrendingUp, UserPlus, CalendarIcon, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface FunnelStep {
  step: string;
  unique: number;
  raw: number;
  rate: number;
  dropoff: number;
}

interface AnalyticsData {
  funnel: FunnelStep[];
  kpis: {
    unique_visitors: number;
    unique_signups: number;
    overall_rate: string;
    total_events: number;
  };
  referralEvents: { sent: number; confirmed: number };
  timeSeries: Array<{ date: string; unique_visitors: number; events: Record<string, number> }>;
}

const STEP_LABELS: Record<string, string> = {
  landing_viewed: "Besökt startsidan",
  survey_started: "Påbörjat enkät",
  survey_completed: "Slutfört enkät",
  email_collected: "Lämnat e-post",
  report_viewed: "Sett rapport",
  signup_initiated: "Påbörjat signup",
  signup_confirmed: "Bekräftat e-post",
  signup_completed: "Aktivt konto",
};

export default function AnalyticsDashboard() {
  const { user, isAdmin, loading: adminLoading } = useAdminAuth();
  const navigate = useNavigate();
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  useEffect(() => {
    if (!adminLoading && !user) navigate("/logga-in");
  }, [adminLoading, user, navigate]);

  const fetchData = useCallback(async () => {
    if (!isAdmin) return;
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("analytics-dashboard", {
        body: {
          from: format(dateFrom, "yyyy-MM-dd"),
          to: format(dateTo, "yyyy-MM-dd"),
        },
      });
      if (fnError) throw fnError;
      setData(result as AnalyticsData);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [dateFrom, dateTo, isAdmin]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || !isAdmin) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData, isAdmin]);

  if (adminLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">🔒 Åtkomst nekad</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">Du har inte behörighet att visa denna sida.</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exportCSV = () => {
    if (!data) return;
    const rows: string[][] = [];

    rows.push(["--- Funnel (unika besökare) ---"]);
    rows.push(["Step", "Unique", "Raw events", "Step rate %", "Dropoff"]);
    for (const s of data.funnel) {
      rows.push([s.step, String(s.unique), String(s.raw), String(s.rate), String(s.dropoff)]);
    }

    rows.push([]);
    rows.push(["--- KPIs ---"]);
    rows.push(["Unique visitors", String(data.kpis.unique_visitors)]);
    rows.push(["Unique signups", String(data.kpis.unique_signups)]);
    rows.push(["Overall conversion", data.kpis.overall_rate]);
    rows.push(["Total events", String(data.kpis.total_events)]);

    rows.push([]);
    rows.push(["--- Daily ---"]);
    rows.push(["Date", "Unique visitors", "Landing", "Survey started", "Survey done", "Email", "Report", "Signup init", "Signup confirmed"]);
    for (const day of data.timeSeries) {
      rows.push([
        day.date,
        String(day.unique_visitors),
        String(day.events.landing_viewed || 0),
        String(day.events.survey_started || 0),
        String(day.events.survey_completed || 0),
        String(day.events.email_collected || 0),
        String(day.events.report_viewed || 0),
        String(day.events.signup_initiated || 0),
        String(day.events.signup_confirmed || 0),
      ]);
    }

    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `analytics-${format(dateFrom, "yyyy-MM-dd")}-${format(dateTo, "yyyy-MM-dd")}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📊 Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">
            Unika besökare via cookieless dagshash · full funnel inkl. signup-loop
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <DatePicker label="Från" date={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
          <DatePicker label="Till" date={dateTo} onSelect={(d) => d && setDateTo(d)} />
          <Button onClick={() => setAutoRefresh((v) => !v)} variant={autoRefresh ? "default" : "outline"} size="sm">
            {autoRefresh ? "Auto ✓" : "Auto ✗"}
          </Button>
          <Button onClick={exportCSV} disabled={!data} variant="outline" size="sm">
            <Download className="w-4 h-4" />
            <span className="ml-2">CSV</span>
          </Button>
          <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            <span className="ml-2">Uppdatera</span>
          </Button>
        </div>
      </div>

      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-4">
            <p className="text-destructive font-mono text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {data && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              icon={<Users className="w-5 h-5" />}
              label="Unika besökare"
              value={String(data.kpis.unique_visitors)}
              sub="Cookieless dagshash"
            />
            <KPICard
              icon={<UserPlus className="w-5 h-5" />}
              label="Bekräftade konton"
              value={String(data.kpis.unique_signups)}
            />
            <KPICard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Övergrip. konv."
              value={data.kpis.overall_rate}
              sub="besök → konto"
            />
            <KPICard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Totala events"
              value={String(data.kpis.total_events)}
            />
          </div>

          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg">Funnel — unika besökare per steg</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {data.funnel.map((step, i) => (
                <FunnelBar
                  key={step.step}
                  label={STEP_LABELS[step.step] || step.step}
                  unique={step.unique}
                  raw={step.raw}
                  rate={step.rate}
                  dropoff={step.dropoff}
                  maxCount={data.funnel[0]?.unique || 1}
                  isFirst={i === 0}
                />
              ))}
            </CardContent>
          </Card>

          {data.timeSeries.length > 0 && (
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Daglig aktivitet</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 text-muted-foreground">Datum</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Unika</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Enkät start</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Enkät klar</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">E-post</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Rapport</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Signup init</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Konto klart</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.timeSeries.map((day) => (
                        <tr key={day.date} className="border-b border-border/50">
                          <td className="py-1.5 pr-4 text-foreground">{day.date}</td>
                          <td className="text-right py-1.5 px-2 font-semibold">{day.unique_visitors}</td>
                          <td className="text-right py-1.5 px-2">{day.events.survey_started || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.survey_completed || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.email_collected || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.report_viewed || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.signup_initiated || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.signup_confirmed || 0}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </>
      )}

      {!data && !loading && !error && (
        <p className="text-muted-foreground text-center py-12">Laddar analytics...</p>
      )}
    </div>
  );
}

function DatePicker({ label, date, onSelect }: { label: string; date: Date; onSelect: (d: Date | undefined) => void }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className={cn("justify-start text-left font-normal gap-1")}>
          <CalendarIcon className="w-3.5 h-3.5" />
          <span className="text-xs text-muted-foreground">{label}:</span>
          <span className="text-xs">{format(date, "yyyy-MM-dd")}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={onSelect}
          initialFocus
          className={cn("p-3 pointer-events-auto")}
        />
      </PopoverContent>
    </Popover>
  );
}

function KPICard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub?: string }) {
  return (
    <Card className="card-shadow">
      <CardContent className="pt-4 pb-4 space-y-1">
        <div className="flex items-center gap-2 text-muted-foreground">
          {icon}
          <span className="text-xs">{label}</span>
        </div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function FunnelBar({
  label, unique, raw, rate, dropoff, maxCount, isFirst,
}: {
  label: string; unique: number; raw: number; rate: number; dropoff: number; maxCount: number; isFirst: boolean;
}) {
  const width = maxCount > 0 ? Math.max((unique / maxCount) * 100, 2) : 2;
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono">
          {unique}
          <span className="text-muted-foreground ml-1">unika</span>
          {raw !== unique && <span className="text-muted-foreground ml-1">· {raw} events</span>}
          {!isFirst && (
            <span className="ml-2">
              <span className="text-foreground">{rate}%</span>
              {dropoff > 0 && <span className="text-destructive ml-1">−{dropoff}</span>}
            </span>
          )}
        </span>
      </div>
      <div className="h-5 bg-secondary rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all duration-500 bg-primary" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}
