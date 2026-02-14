import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, BarChart3, Users, TrendingUp, DollarSign } from "lucide-react";

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

export default function AnalyticsDashboard() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: result, error: fnError } = await supabase.functions.invoke("analytics-dashboard");
      if (fnError) throw fnError;
      setData(result as AnalyticsData);
    } catch (e: any) {
      setError(e.message || "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  return (
    <div className="min-h-screen bg-background p-4 sm:p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">📊 Analytics Dashboard</h1>
          <p className="text-sm text-muted-foreground">Funnelspårning & A/B-jämförelse</p>
        </div>
        <Button onClick={fetchData} disabled={loading} variant="outline" size="sm">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          <span className="ml-2">Uppdatera</span>
        </Button>
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
