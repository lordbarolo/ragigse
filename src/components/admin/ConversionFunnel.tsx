import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, ChevronDown, ChevronUp } from "lucide-react";

interface FunnelStep {
  key: string;
  label: string;
  count: number;
  dropoff: number;
  dropoffPct: number;
}

interface SurveyDropoff {
  step_name: string;
  viewed: number;
  completed: number;
  dropoff: number;
  dropoffPct: number;
}

interface FunnelData {
  funnel: FunnelStep[];
  surveyDropoff: SurveyDropoff[];
  period: string;
}

const FUNNEL_STEPS = [
  { key: "landing_viewed", label: "Landningssida" },
  { key: "survey_started", label: "Enkät påbörjad" },
  { key: "survey_completed", label: "Enkät slutförd" },
  { key: "paywall_scrolled", label: "Teaser scrollad" },
  { key: "email_collected", label: "E-post lämnad" },
  { key: "report_viewed", label: "Rapport visad" },
  { key: "report_section_viewed", label: "Rapport scrollad" },
];

const SURVEY_STEP_NAMES = [
  "yrkeskategori",
  "specialisering",
  "kommun",
  "anstallningsform",
  "ersattning",
];

const SURVEY_STEP_LABELS: Record<string, string> = {
  yrkeskategori: "1. Yrkeskategori",
  specialisering: "2. Specialisering",
  kommun: "3. Kommun",
  anstallningsform: "4. Anställningsform",
  ersattning: "5. Ersättning",
};

export default function ConversionFunnel() {
  const [data, setData] = useState<FunnelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showDropoff, setShowDropoff] = useState(false);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - period);

      const { data: events, error } = await supabase
        .from("analytics_events")
        .select("event_name, metadata, created_at")
        .gte("created_at", fromDate.toISOString())
        .order("created_at", { ascending: false })
        .limit(10000);

      if (error) throw error;

      // Count main funnel events
      const counts: Record<string, number> = {};
      const surveyViewed: Record<string, number> = {};
      const surveyCompleted: Record<string, number> = {};

      for (const event of events || []) {
        counts[event.event_name] = (counts[event.event_name] || 0) + 1;

        // Track survey step dropoff
        if (event.event_name === "survey_step_viewed") {
          const meta = event.metadata as Record<string, unknown> | null;
          const stepName = meta?.step_name as string;
          if (stepName) {
            surveyViewed[stepName] = (surveyViewed[stepName] || 0) + 1;
          }
        }
        if (event.event_name === "survey_step_completed") {
          const meta = event.metadata as Record<string, unknown> | null;
          const stepName = meta?.step_name as string;
          if (stepName) {
            surveyCompleted[stepName] = (surveyCompleted[stepName] || 0) + 1;
          }
        }
      }

      // Build main funnel
      const funnel: FunnelStep[] = FUNNEL_STEPS.map((step, i) => {
        const count = counts[step.key] || 0;
        const prevCount = i === 0 ? count : (funnel[i - 1]?.count || 0);
        const dropoff = Math.max(0, prevCount - count);
        const dropoffPct = prevCount > 0 ? Math.round((dropoff / prevCount) * 100) : 0;
        return { ...step, count, dropoff, dropoffPct };
      });

      // Build survey dropoff
      const surveyDropoff: SurveyDropoff[] = SURVEY_STEP_NAMES.map((stepName) => {
        const viewed = surveyViewed[stepName] || 0;
        const completed = surveyCompleted[stepName] || 0;
        const dropoff = Math.max(0, viewed - completed);
        const dropoffPct = viewed > 0 ? Math.round((dropoff / viewed) * 100) : 0;
        return {
          step_name: stepName,
          viewed,
          completed,
          dropoff,
          dropoffPct,
        };
      });

      setData({
        funnel,
        surveyDropoff,
        period: `Senaste ${period} dagarna`,
      });
    } catch (err: any) {
      console.error("Funnel fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const maxCount = data?.funnel[0]?.count || 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Konverteringstratt</CardTitle>
            <CardDescription>{data?.period}</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {([7, 30, 90] as const).map((p) => (
              <Button
                key={p}
                variant={period === p ? "default" : "outline"}
                size="sm"
                onClick={() => setPeriod(p)}
              >
                {p}d
              </Button>
            ))}
            <Button variant="ghost" size="sm" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Main Funnel */}
        <div className="space-y-2">
          {data?.funnel.map((step, i) => {
            const barWidth = maxCount > 0 ? Math.max(4, (step.count / maxCount) * 100) : 4;
            const convRate = i > 0 && data.funnel[i - 1].count > 0
              ? Math.round((step.count / data.funnel[i - 1].count) * 100)
              : 100;

            return (
              <div key={step.key}>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span className="text-foreground font-medium">{step.label}</span>
                  <div className="flex items-center gap-3">
                    {i > 0 && (
                      <span className={`text-xs ${convRate < 30 ? "text-destructive" : convRate < 60 ? "text-yellow-500" : "text-primary"}`}>
                        {convRate}%
                      </span>
                    )}
                    <span className="font-mono text-sm font-semibold text-foreground w-16 text-right">
                      {step.count.toLocaleString("sv-SE")}
                    </span>
                  </div>
                </div>
                <div className="h-7 bg-muted rounded overflow-hidden">
                  <div
                    className="h-full bg-primary/70 rounded transition-all duration-700"
                    style={{ width: `${barWidth}%` }}
                  />
                </div>
                {i > 0 && step.dropoff > 0 && (
                  <p className="text-[11px] text-destructive/70 mt-0.5 text-right">
                    −{step.dropoff.toLocaleString("sv-SE")} ({step.dropoffPct}% avhopp)
                  </p>
                )}
              </div>
            );
          })}
        </div>

        {/* Survey step dropoff — expandable */}
        <div>
          <button
            onClick={() => setShowDropoff(!showDropoff)}
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            {showDropoff ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            Avhopp per enkätsteg
          </button>

          {showDropoff && data && (
            <div className="mt-3 space-y-1">
              <div className="grid grid-cols-4 gap-2 text-[11px] font-medium text-muted-foreground uppercase tracking-wide pb-1 border-b border-border">
                <span>Steg</span>
                <span className="text-right">Visade</span>
                <span className="text-right">Slutförde</span>
                <span className="text-right">Avhopp</span>
              </div>
              {data.surveyDropoff.map((s) => (
                <div
                  key={s.step_name}
                  className="grid grid-cols-4 gap-2 text-sm py-1.5 border-b border-border/50 last:border-0"
                >
                  <span className="text-foreground font-medium">
                    {SURVEY_STEP_LABELS[s.step_name] || s.step_name}
                  </span>
                  <span className="text-right font-mono text-muted-foreground">{s.viewed}</span>
                  <span className="text-right font-mono text-muted-foreground">{s.completed}</span>
                  <span className={`text-right font-mono ${s.dropoffPct > 30 ? "text-destructive" : "text-muted-foreground"}`}>
                    {s.dropoff} ({s.dropoffPct}%)
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
