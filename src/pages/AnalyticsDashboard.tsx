import { useEffect, useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Loader2, RefreshCw, BarChart3, Users, TrendingUp, DollarSign, CalendarIcon, Download } from "lucide-react";
import { format, subDays } from "date-fns";
import { cn } from "@/lib/utils";

interface FunnelStep {
  step: string;
  count: number;
  rate: number;
}

interface AnalyticsData {
  funnels: Record<string, FunnelStep[]>;
  conversionRates: Record<string, { sessions: number; conversions: number; rate: string }>;
  referralEvents: Record<string, { sent: number; confirmed: number }>;
  revenueByVariant: Record<string, number>;
  timeSeries: Array<{ date: string; events: Record<string, number> }>;
  totalEvents: number;
}

const STEP_LABELS: Record<string, string> = {
  landing_viewed: "Landningssida",
  survey_started: "Enkät startad",
  survey_completed: "Enkät klar",
  teaser_viewed: "Resultat visad",
  checkout_started: "Checkout startad",
  payment_verified: "Betalning verifierad",
};

const DASHBOARD_PASSWORD = "Compcare2026";

export default function AnalyticsDashboard() {
  const [authenticated, setAuthenticated] = useState(false);
  const [passwordInput, setPasswordInput] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [dateFrom, setDateFrom] = useState<Date>(subDays(new Date(), 30));
  const [dateTo, setDateTo] = useState<Date>(new Date());

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordInput === DASHBOARD_PASSWORD) {
      setAuthenticated(true);
      setPasswordError(false);
    } else {
      setPasswordError(true);
    }
  };

  const fetchData = useCallback(async () => {
    if (!authenticated) return;
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
  }, [dateFrom, dateTo, authenticated]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    if (!autoRefresh || !authenticated) return;
    const id = setInterval(fetchData, 30000);
    return () => clearInterval(id);
  }, [autoRefresh, fetchData, authenticated]);

  if (!authenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <Card className="w-full max-w-sm">
          <CardHeader>
            <CardTitle className="text-lg">🔒 Analytics Dashboard</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <input
                type="password"
                placeholder="Lösenord"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                autoFocus
              />
              {passwordError && <p className="text-destructive text-sm">Fel lösenord</p>}
              <Button type="submit" className="w-full">Logga in</Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  const exportCSV = () => {
    if (!data) return;
    const rows: string[][] = [];

    // Funnel data
    rows.push(["--- Funnel ---"]);
    rows.push(["Variant", "Step", "Count", "Rate %"]);
    for (const v of ["A", "B"]) {
      for (const s of data.funnels[v] || []) {
        rows.push([v, s.step, String(s.count), String(s.rate)]);
      }
    }

    // Conversion rates
    rows.push([]);
    rows.push(["--- Conversion Rates ---"]);
    rows.push(["Variant", "Sessions", "Conversions", "Rate"]);
    for (const v of ["A", "B"]) {
      const cr = data.conversionRates[v];
      if (cr) rows.push([v, String(cr.sessions), String(cr.conversions), cr.rate]);
    }

    // Referrals
    rows.push([]);
    rows.push(["--- Referrals ---"]);
    rows.push(["Variant", "Sent", "Confirmed"]);
    for (const v of ["A", "B"]) {
      const r = data.referralEvents[v];
      if (r) rows.push([v, String(r.sent), String(r.confirmed)]);
    }

    // Time series
    rows.push([]);
    rows.push(["--- Daily Activity ---"]);
    rows.push(["Date", "Landing", "Survey", "Teaser", "Checkout", "Paid", "Referral"]);
    for (const day of data.timeSeries) {
      rows.push([
        day.date,
        String(day.events.landing_viewed || 0),
        String(day.events.survey_completed || 0),
        String(day.events.teaser_viewed || 0),
        String(day.events.checkout_started || 0),
        String(day.events.payment_verified || 0),
        String(day.events.referral_sent || 0),
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
          <p className="text-sm text-muted-foreground">Funnelspårning & A/B-jämförelse</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {/* Date range pickers */}
          <DatePicker label="Från" date={dateFrom} onSelect={(d) => d && setDateFrom(d)} />
          <DatePicker label="Till" date={dateTo} onSelect={(d) => d && setDateTo(d)} />
          <Button
            onClick={() => setAutoRefresh((v) => !v)}
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
          >
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
          {/* KPI Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <KPICard
              icon={<BarChart3 className="w-5 h-5" />}
              label="Totala events"
              value={String(data.totalEvents)}
            />
            <KPICard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Conv. rate A"
              value={data.conversionRates.A?.rate || "0%"}
              sub={`${data.conversionRates.A?.conversions || 0} / ${data.conversionRates.A?.sessions || 0}`}
            />
            <KPICard
              icon={<TrendingUp className="w-5 h-5" />}
              label="Conv. rate B"
              value={data.conversionRates.B?.rate || "0%"}
              sub={`${data.conversionRates.B?.conversions || 0} / ${data.conversionRates.B?.sessions || 0}`}
            />
            <KPICard
              icon={<DollarSign className="w-5 h-5" />}
              label="Betalningar"
              value={String((data.revenueByVariant.A || 0) + (data.revenueByVariant.B || 0))}
              sub={`A: ${data.revenueByVariant.A || 0} · B: ${data.revenueByVariant.B || 0}`}
            />
          </div>

          {/* Funnel Comparison */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {["A", "B"].map((variant) => (
              <Card key={variant} className="card-shadow">
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center gap-2">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-full text-sm font-bold ${
                      variant === "A" ? "bg-primary/10 text-primary" : "bg-accent/10 text-accent"
                    }`}>
                      {variant}
                    </span>
                    Funnel — Variant {variant}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {(data.funnels[variant] || []).map((step, i) => (
                    <FunnelBar
                      key={step.step}
                      label={STEP_LABELS[step.step] || step.step}
                      count={step.count}
                      rate={step.rate}
                      maxCount={data.funnels[variant]?.[0]?.count || 1}
                      isFirst={i === 0}
                      variant={variant}
                    />
                  ))}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Referral Comparison */}
          <Card className="card-shadow">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Users className="w-5 h-5" />
                Referral-användning per variant
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                {["A", "B"].map((v) => (
                  <div key={v} className="space-y-2">
                    <p className="font-semibold text-foreground">Variant {v}</p>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Skickade</span>
                      <span className="font-mono text-foreground">{data.referralEvents[v]?.sent || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Bekräftade</span>
                      <span className="font-mono text-foreground">{data.referralEvents[v]?.confirmed || 0}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Konvertering</span>
                      <span className="font-mono font-semibold text-foreground">
                        {data.referralEvents[v]?.sent
                          ? ((data.referralEvents[v].confirmed / data.referralEvents[v].sent) * 100).toFixed(0) + "%"
                          : "—"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Time Series (last 30 days) */}
          {data.timeSeries.length > 0 && (
            <Card className="card-shadow">
              <CardHeader>
                <CardTitle className="text-lg">Daglig aktivitet (senaste 30 dagarna)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs font-mono">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 pr-4 text-muted-foreground">Datum</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Landing</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Enkät</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Resultat</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Checkout</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Betalt</th>
                        <th className="text-right py-2 px-2 text-muted-foreground">Referral</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.timeSeries.map((day) => (
                        <tr key={day.date} className="border-b border-border/50">
                          <td className="py-1.5 pr-4 text-foreground">{day.date}</td>
                          <td className="text-right py-1.5 px-2">{day.events.landing_viewed || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.survey_completed || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.teaser_viewed || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.checkout_started || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.payment_verified || 0}</td>
                          <td className="text-right py-1.5 px-2">{day.events.referral_sent || 0}</td>
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

/* ── Sub-components ─────────────────────────────────── */

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
  label,
  count,
  rate,
  maxCount,
  isFirst,
  variant,
}: {
  label: string;
  count: number;
  rate: number;
  maxCount: number;
  isFirst: boolean;
  variant: string;
}) {
  const width = maxCount > 0 ? Math.max((count / maxCount) * 100, 2) : 2;
  const barColor = variant === "A" ? "bg-primary" : "bg-accent";

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="text-foreground font-mono">
          {count}
          {!isFirst && <span className="text-muted-foreground ml-1">({rate}%)</span>}
        </span>
      </div>
      <div className="h-5 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-500 ${barColor}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
