import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import type { AdminAnalyticsData } from "@/hooks/useAdminAnalytics";

interface FunnelStep {
  key: string;
  label: string;
  count: number;
  dropoff: number;
  dropoffPct: number;
}

// Teaser-specific funnel — visar exakt var användare droppar runt /resultat
const TEASER_STEPS = [
  { key: "survey_started", label: "Enkät påbörjad" },
  { key: "survey_completed", label: "Enkät slutförd" },
  { key: "teaser_page_viewed", label: "Teaser öppnad" },
  { key: "teaser_scrolled", label: "Teaser scrollad (50%+)" },
  { key: "email_collected", label: "E-post lämnad" },
  { key: "free_report_unlocked", label: "Rapport upplåst" },
  { key: "report_viewed", label: "Rapport visad" },
];

interface Props {
  data: AdminAnalyticsData | null;
  loading: boolean;
  period: number;
  onRefresh: () => void;
}

export default function TeaserFunnel({ data, loading, period, onRefresh }: Props) {
  const funnel: FunnelStep[] = (() => {
    if (!data) return [];

    // Aggregera counts från timeSeries (alla events finns där per dag)
    const counts: Record<string, number> = {};
    for (const entry of data.timeSeries || []) {
      for (const [eventName, eventCount] of Object.entries(entry.events || {})) {
        counts[eventName] = (counts[eventName] || 0) + (eventCount as number);
      }
    }

    const result: FunnelStep[] = [];
    for (let i = 0; i < TEASER_STEPS.length; i++) {
      const step = TEASER_STEPS[i];
      const count = counts[step.key] || 0;
      const prevCount = i === 0 ? count : (result[i - 1]?.count || 0);
      const dropoff = Math.max(0, prevCount - count);
      const dropoffPct = prevCount > 0 ? Math.round((dropoff / prevCount) * 100) : 0;
      result.push({ ...step, count, dropoff, dropoffPct });
    }
    return result;
  })();

  if (loading && !data) {
    return (
      <Card>
        <CardContent className="flex justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  const maxCount = funnel[0]?.count || 1;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Teaser-funnel</CardTitle>
            <CardDescription>
              Survey → Teaser → E-post → Rapport · Senaste {period} dagarna
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          {funnel.map((step, i) => {
            const barWidth = maxCount > 0 ? Math.max(4, (step.count / maxCount) * 100) : 4;
            const convRate = i > 0 && funnel[i - 1].count > 0
              ? Math.round((step.count / funnel[i - 1].count) * 100)
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

        {funnel[0]?.count === 0 && (
          <p className="text-xs text-muted-foreground mt-4 text-center">
            Inga survey_started-events under perioden.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
