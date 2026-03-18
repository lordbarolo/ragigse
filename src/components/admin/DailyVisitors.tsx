import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw } from "lucide-react";
import type { AdminAnalyticsData } from "@/hooks/useAdminAnalytics";

interface Props {
  data: AdminAnalyticsData | null;
  loading: boolean;
  period: number;
  onRefresh: () => void;
}

export default function DailyVisitors({ data, loading, period, onRefresh }: Props) {
  // Build day data from shared analytics
  const dayData = (() => {
    if (!data) return [];

    const byDay: Record<string, number> = {};
    for (const entry of data.timeSeries || []) {
      byDay[entry.date] = entry.events?.landing_viewed || 0;
    }

    const fromDate = new Date();
    fromDate.setDate(fromDate.getDate() - period);
    const result: { date: string; count: number }[] = [];
    const cursor = new Date(fromDate);
    const today = new Date();
    while (cursor <= today) {
      const key = cursor.toISOString().slice(0, 10);
      result.push({ date: key, count: byDay[key] || 0 });
      cursor.setDate(cursor.getDate() + 1);
    }
    return result;
  })();

  const maxCount = Math.max(1, ...dayData.map((d) => d.count));
  const total = dayData.reduce((s, d) => s + d.count, 0);
  const avg = dayData.length > 0 ? Math.round(total / dayData.length) : 0;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg">Besökare per dag</CardTitle>
            <CardDescription>
              Totalt {total.toLocaleString("sv-SE")} · snitt {avg}/dag · senaste {period}d
            </CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onRefresh} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading && dayData.length === 0 ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : dayData.length === 0 ? (
          <p className="text-muted-foreground text-center py-8">Ingen data ännu.</p>
        ) : (
          <div className="flex items-end gap-[2px]" style={{ height: 160 }}>
            {dayData.map((d) => {
              const h = maxCount > 0 ? Math.max(2, Math.round((d.count / maxCount) * 160)) : 2;
              return (
                <div
                  key={d.date}
                  className="flex-1 group relative flex items-end"
                  style={{ minWidth: 0, height: '100%' }}
                >
                  <div
                    className="w-full bg-primary/70 rounded-t transition-all duration-300 hover:bg-primary"
                    style={{ height: `${h}px` }}
                  />
                  <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 hidden group-hover:block z-10">
                    <div className="bg-foreground text-background text-[10px] rounded px-1.5 py-0.5 whitespace-nowrap font-mono">
                      {d.date.slice(5)} · {d.count}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
