import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, RefreshCw, Activity } from "lucide-react";
import { ALLOWED_EVENTS } from "@/lib/allowedEvents";

interface EventRow {
  event_name: string;
  count: number;
  last_seen: string;
}

const PERIODS = [7, 30, 90] as const;

export default function EventCoverage() {
  const [days, setDays] = useState<7 | 30 | 90>(30);
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<EventRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const { data, error: err } = await supabase.functions.invoke(
        "analytics-event-coverage",
        { body: { days } }
      );
      if (err) throw err;
      setRows((data?.events as EventRow[]) || []);
    } catch (e: any) {
      setError(e.message || "Kunde inte hämta event-data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); /* eslint-disable-next-line */ }, [days]);

  const stats = useMemo(() => {
    const seen = new Map(rows.map((r) => [r.event_name, r]));
    const allowed = ALLOWED_EVENTS as readonly string[];
    const allowedSet = new Set(allowed);

    const firing = allowed.filter((e) => seen.has(e));
    const silent = allowed.filter((e) => !seen.has(e));
    const unknown = rows.filter((r) => !allowedSet.has(r.event_name));

    return { firing, silent, unknown, seen };
  }, [rows]);

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Activity className="w-5 h-5" /> PostHog event-coverage
            </CardTitle>
            <CardDescription>
              Vilka events som faktiskt triggas i produktion vs. <code>ALLOWED_EVENTS</code>.
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {PERIODS.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={days === p ? "default" : "outline"}
                onClick={() => setDays(p)}
              >
                {p}d
              </Button>
            ))}
            <Button size="sm" variant="outline" onClick={fetchData} disabled={loading}>
              <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && <p className="text-sm text-destructive">{error}</p>}
        {loading && rows.length === 0 ? (
          <div className="flex justify-center py-8">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <Stat label="Tillåtna events" value={ALLOWED_EVENTS.length} />
              <Stat label="Fyrar i prod" value={stats.firing.length} tone="ok" />
              <Stat label="Tysta (allowed)" value={stats.silent.length} tone="warn" />
              <Stat label="Okända events" value={stats.unknown.length} tone={stats.unknown.length ? "bad" : "ok"} />
            </div>

            {/* Unknown events – sent by client but rejected by track-event */}
            {stats.unknown.length > 0 && (
              <Section title="🚨 Okända events (saknas i ALLOWED_EVENTS)">
                <Table
                  rows={stats.unknown.map((r) => ({
                    name: r.event_name,
                    count: r.count,
                    last_seen: r.last_seen,
                    badge: <Badge variant="destructive">Okänt</Badge>,
                  }))}
                />
              </Section>
            )}

            {/* Silent events – defined but never fired */}
            <Section title={`Tysta events – definierade men aldrig triggade (${stats.silent.length})`}>
              {stats.silent.length === 0 ? (
                <p className="text-sm text-muted-foreground">Alla allowed events triggas. ✅</p>
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {stats.silent.map((e) => (
                    <Badge key={e} variant="outline" className="font-mono text-xs">{e}</Badge>
                  ))}
                </div>
              )}
            </Section>

            {/* Firing events */}
            <Section title={`Aktiva events (${stats.firing.length})`}>
              <Table
                rows={stats.firing
                  .map((e) => stats.seen.get(e)!)
                  .sort((a, b) => b.count - a.count)
                  .map((r) => ({
                    name: r.event_name,
                    count: r.count,
                    last_seen: r.last_seen,
                    badge: <Badge variant="secondary">OK</Badge>,
                  }))}
              />
            </Section>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone?: "ok" | "warn" | "bad" }) {
  const color =
    tone === "ok" ? "text-emerald-600" :
    tone === "warn" ? "text-amber-600" :
    tone === "bad" ? "text-destructive" :
    "text-foreground";
  return (
    <div className="border rounded-lg p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={`text-2xl font-bold ${color}`}>{value}</div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold">{title}</h3>
      {children}
    </div>
  );
}

function Table({
  rows,
}: {
  rows: { name: string; count: number; last_seen: string; badge: React.ReactNode }[];
}) {
  if (rows.length === 0) return <p className="text-sm text-muted-foreground">Inga events.</p>;
  return (
    <div className="overflow-x-auto max-h-[420px] overflow-y-auto border rounded-lg">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-muted">
          <tr className="text-left">
            <th className="p-2 font-medium">Event</th>
            <th className="p-2 font-medium text-right">Antal</th>
            <th className="p-2 font-medium">Senast</th>
            <th className="p-2 font-medium">Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.name} className="border-t">
              <td className="p-2 font-mono text-xs">{r.name}</td>
              <td className="p-2 text-right tabular-nums">{r.count.toLocaleString("sv-SE")}</td>
              <td className="p-2 text-muted-foreground text-xs">
                {new Date(r.last_seen).toLocaleString("sv-SE")}
              </td>
              <td className="p-2">{r.badge}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
