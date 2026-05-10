import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertTriangle } from "lucide-react";

interface RecentEvent {
  event_name: string;
  created_at: string;
  metadata: Record<string, unknown> | null;
}

interface DebugData {
  window_hours: number;
  since: string;
  totals: Record<string, number>;
  mounts_without_category: number;
  mount_breakdown: Array<{ key: string; count: number; with_category: number; without_category: number }>;
  failed_slugs: Array<{ slug: string; count: number }>;
  recent: RecentEvent[];
}

const HOUR_PRESETS = [
  { label: "1h", value: 1 },
  { label: "24h", value: 24 },
  { label: "7d", value: 168 },
  { label: "30d", value: 720 },
];

const fmtTime = (iso: string) => {
  const d = new Date(iso);
  return d.toLocaleString("sv-SE", { hour12: false });
};

export default function SurveyPrefillDebug() {
  const [hours, setHours] = useState(24);
  const [data, setData] = useState<DebugData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const { data: res, error: err } = await supabase.functions.invoke(
        "admin-survey-prefill-debug",
        { body: { hours } },
      );
      if (err) throw err;
      setData(res as DebugData);
    } catch (e: any) {
      setError(e?.message ?? "Kunde inte hämta data");
    } finally {
      setLoading(false);
    }
  }, [hours]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle>Survey prefill — debug</CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Visar vilken <code className="text-xs">initialCategory / initialRole</code> som används vid mount,
            samt fall där <code className="text-xs">?yrke=…</code> inte mappas till en känd specialitet.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={fetchData} disabled={loading}>
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? "animate-spin" : ""}`} />
          Uppdatera
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex flex-wrap gap-2">
          {HOUR_PRESETS.map((p) => (
            <Button
              key={p.value}
              size="sm"
              variant={hours === p.value ? "default" : "outline"}
              onClick={() => setHours(p.value)}
            >
              {p.label}
            </Button>
          ))}
        </div>

        {error && (
          <div className="text-sm text-destructive flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            {error}
          </div>
        )}

        {data && (
          <>
            {/* Totals */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              {[
                ["landing_viewed", data.totals.landing_viewed],
                ["hero_cta_clicked", data.totals.hero_cta_clicked],
                ["survey_mounted", data.totals.survey_mounted],
                ["survey_started", data.totals.survey_started],
                ["survey_prefill_failed", data.totals.survey_prefill_failed],
              ].map(([name, count]) => (
                <div
                  key={name as string}
                  className="rounded-lg border border-border bg-card/60 p-3"
                >
                  <div className="text-xs text-muted-foreground">{name}</div>
                  <div className="text-2xl font-semibold">{count as number}</div>
                </div>
              ))}
            </div>

            {/* Failed slugs */}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Trasiga prefill-slugs ({data.totals.survey_prefill_failed})
              </h3>
              {data.failed_slugs.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Inga <code className="text-xs">survey_prefill_failed</code>-events i fönstret.
                </p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {data.failed_slugs.map((s) => (
                    <Badge key={s.slug} variant="destructive" className="font-mono">
                      ?yrke={s.slug} × {s.count}
                    </Badge>
                  ))}
                </div>
              )}
            </div>

            {/* Mount breakdown */}
            <div>
              <h3 className="text-sm font-semibold mb-2">
                Mount-fördelning (initial_category / initial_role)
              </h3>
              {data.mount_breakdown.length === 0 ? (
                <p className="text-sm text-muted-foreground">Inga mounts i fönstret.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted/40">
                      <tr>
                        <th className="text-left p-2 font-medium">initial_category / initial_role</th>
                        <th className="text-right p-2 font-medium">Mounts</th>
                        <th className="text-right p-2 font-medium">Med kategori</th>
                        <th className="text-right p-2 font-medium">Utan kategori</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.mount_breakdown.map((row) => (
                        <tr key={row.key} className="border-t border-border">
                          <td className="p-2 font-mono text-xs">{row.key}</td>
                          <td className="p-2 text-right">{row.count}</td>
                          <td className="p-2 text-right text-emerald-600">{row.with_category}</td>
                          <td className="p-2 text-right text-amber-600">{row.without_category}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
              {data.mounts_without_category > 0 && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠ {data.mounts_without_category} mounts utan <code>initialCategory</code> — survey
                  startar då på steg 1 och Survey-komponenten auto-firar inte <code>survey_started</code>.
                </p>
              )}
            </div>

            {/* Recent stream */}
            <div>
              <h3 className="text-sm font-semibold mb-2">Senaste events ({data.recent.length})</h3>
              <div className="overflow-x-auto rounded-lg border border-border max-h-[480px] overflow-y-auto">
                <table className="w-full text-xs">
                  <thead className="bg-muted/40 sticky top-0">
                    <tr>
                      <th className="text-left p-2 font-medium">Tid</th>
                      <th className="text-left p-2 font-medium">Event</th>
                      <th className="text-left p-2 font-medium">Metadata</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.recent.map((e, i) => (
                      <tr key={i} className="border-t border-border align-top">
                        <td className="p-2 whitespace-nowrap text-muted-foreground">
                          {fmtTime(e.created_at)}
                        </td>
                        <td className="p-2">
                          <Badge
                            variant={
                              e.event_name === "survey_prefill_failed"
                                ? "destructive"
                                : e.event_name === "survey_mounted"
                                  ? "default"
                                  : "secondary"
                            }
                          >
                            {e.event_name}
                          </Badge>
                        </td>
                        <td className="p-2 font-mono text-[11px] break-all">
                          {e.metadata ? JSON.stringify(e.metadata) : "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
