import { useEffect, useState } from "react";
import { Link } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, ArrowLeft } from "lucide-react";

interface HealthRow {
  id: string;
  check_name: string;
  status: "ok" | "warn" | "error";
  error_message: string | null;
  details: Record<string, unknown> | null;
  duration_ms: number | null;
  alert_sent_at: string | null;
  alert_id: string | null;
  created_at: string;
}

interface EdgeError {
  id: string;
  function_name: string;
  error_message: string;
  created_at: string;
}

export default function AdminHealth() {
  const [latest, setLatest] = useState<HealthRow[]>([]);
  const [history, setHistory] = useState<HealthRow[]>([]);
  const [errors, setErrors] = useState<EdgeError[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  async function load() {
    setLoading(true);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { data: hist } = await supabase
      .from("system_health_log")
      .select("*")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(200);
    const rows = (hist ?? []) as HealthRow[];
    setHistory(rows);

    // Latest result per check_name
    const latestByName = new Map<string, HealthRow>();
    for (const r of rows) {
      if (!latestByName.has(r.check_name)) latestByName.set(r.check_name, r);
    }
    setLatest([...latestByName.values()]);

    const { data: errs } = await supabase
      .from("edge_function_errors")
      .select("id, function_name, error_message, created_at")
      .gte("created_at", since)
      .order("created_at", { ascending: false })
      .limit(50);
    setErrors((errs ?? []) as EdgeError[]);

    setLoading(false);
  }

  async function runNow() {
    setRunning(true);
    try {
      await supabase.functions.invoke("health-check", { body: {} });
      await supabase.functions.invoke("edge-error-monitor", { body: {} });
      await load();
    } finally {
      setRunning(false);
    }
  }

  useEffect(() => {
    load();
    const t = setInterval(load, 60_000);
    return () => clearInterval(t);
  }, []);

  const overall = latest.some((l) => l.status === "error")
    ? "error"
    : latest.some((l) => l.status === "warn")
    ? "warn"
    : latest.length > 0
    ? "ok"
    : "unknown";

  return (
    <div className="min-h-screen bg-background text-foreground p-6 md:p-10">
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link to="/admin">
              <Button variant="ghost" size="sm" className="text-sm font-semibold px-3 py-2">
                <ArrowLeft className="w-4 h-4 mr-1" /> Admin
              </Button>
            </Link>
            <h1 className="text-2xl font-semibold tracking-tight">System health</h1>
            <StatusBadge status={overall} />
          </div>
          <Button onClick={runNow} disabled={running} className="text-sm font-semibold px-6 py-3">
            <RefreshCw className={`w-4 h-4 mr-2 ${running ? "animate-spin" : ""}`} />
            Kör nu
          </Button>
        </div>

        <Card className="p-5">
          <h2 className="text-base font-semibold mb-3">Senaste status per check</h2>
          {loading ? (
            <p className="text-sm text-muted-foreground">Laddar…</p>
          ) : latest.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga health-checks loggade ännu. Kör nu för att starta.</p>
          ) : (
            <div className="divide-y divide-border">
              {latest.map((r) => (
                <div key={r.id} className="py-3 flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <StatusIcon status={r.status} />
                    <div>
                      <div className="font-medium text-sm">{r.check_name}</div>
                      {r.error_message && (
                        <div className="text-xs text-muted-foreground font-mono mt-1 break-all">{r.error_message}</div>
                      )}
                      {r.details && Object.keys(r.details).length > 0 && r.status === "ok" && (
                        <div className="text-xs text-muted-foreground mt-1">
                          {JSON.stringify(r.details)}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="text-xs text-muted-foreground text-right whitespace-nowrap">
                    {new Date(r.created_at).toLocaleString("sv-SE")}
                    {r.duration_ms != null && <div>{r.duration_ms} ms</div>}
                    {r.alert_sent_at && <div className="text-red-600">📧 mail skickat</div>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold mb-3">Edge-fel senaste 24h ({errors.length})</h2>
          {errors.length === 0 ? (
            <p className="text-sm text-muted-foreground">Inga registrerade fel.</p>
          ) : (
            <div className="divide-y divide-border max-h-96 overflow-auto">
              {errors.map((e) => (
                <div key={e.id} className="py-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold">{e.function_name}</span>
                    <span className="text-muted-foreground">{new Date(e.created_at).toLocaleString("sv-SE")}</span>
                  </div>
                  <div className="font-mono text-muted-foreground break-all">{e.error_message}</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h2 className="text-base font-semibold mb-3">Historik (24h)</h2>
          <div className="text-xs divide-y divide-border max-h-96 overflow-auto">
            {history.map((r) => (
              <div key={r.id} className="py-1.5 flex items-center gap-3">
                <StatusIcon status={r.status} small />
                <span className="font-mono w-44 shrink-0">{new Date(r.created_at).toLocaleString("sv-SE")}</span>
                <span className="font-medium w-56 shrink-0">{r.check_name}</span>
                <span className="text-muted-foreground truncate">{r.error_message ?? "ok"}</span>
              </div>
            ))}
          </div>
        </Card>

        <p className="text-xs text-muted-foreground">
          health-check körs var 15 min. edge-error-monitor körs var 15 min. conversion-monitor körs dagligen 07:00.
          Fel skickar mail till anders@compcare.se med färdig chat-prompt.
        </p>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    ok: { label: "Alla system OK", cls: "bg-green-500/15 text-green-600 border-green-500/30" },
    warn: { label: "Varning", cls: "bg-yellow-500/15 text-yellow-600 border-yellow-500/30" },
    error: { label: "Fel upptäckt", cls: "bg-red-500/15 text-red-600 border-red-500/30" },
    unknown: { label: "Ingen data", cls: "bg-muted text-muted-foreground" },
  };
  const v = map[status] ?? map.unknown;
  return <Badge variant="outline" className={v.cls}>{v.label}</Badge>;
}

function StatusIcon({ status, small }: { status: string; small?: boolean }) {
  const cls = small ? "w-3.5 h-3.5" : "w-5 h-5";
  if (status === "ok") return <CheckCircle2 className={`${cls} text-green-500`} />;
  if (status === "warn") return <AlertTriangle className={`${cls} text-yellow-500`} />;
  return <XCircle className={`${cls} text-red-500`} />;
}
