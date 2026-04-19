import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Run {
  id: string;
  run_at: string;
  status: string;
  total_rows: number;
  mismatch_count: number;
  current_checksum: string | null;
  baseline_checksum: string | null;
  diff_json: { diffs?: Array<{ key: string; baseline: number | null; current: number | null; type: string }> } | null;
  error_message: string | null;
}

export default function RateVerification() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("rate_verification_runs")
      .select("*")
      .order("run_at", { ascending: false })
      .limit(20);
    if (error) toast({ title: "Kunde inte ladda", description: error.message, variant: "destructive" });
    setRuns((data ?? []) as Run[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("verify-rates");
    setRunning(false);
    if (error) {
      toast({ title: "Verifiering misslyckades", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Verifiering klar", description: `${data?.mismatch_count ?? 0} avvikelser av ${data?.total_rows ?? 0} rader` });
      load();
    }
  };

  const StatusBadge = ({ s }: { s: string }) => {
    if (s === "ok") return <Badge className="bg-green-600"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>;
    if (s === "mismatch") return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Avvikelse</Badge>;
    if (s === "error") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fel</Badge>;
    return <Badge variant="secondary">{s}</Badge>;
  };

  const latest = runs[0];

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Prisverifiering — läkar-prislistan</CardTitle>
          <CardDescription>
            Nattlig kontroll (kl 03:00) som jämför live-databasen mot baseline-snapshot från SKR-importen.
          </CardDescription>
        </div>
        <Button size="sm" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Kör nu
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        {latest && (
          <div className="rounded-md border p-4 bg-muted/30">
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge s={latest.status} />
              <span className="text-sm text-muted-foreground">
                {new Date(latest.run_at).toLocaleString("sv-SE")} · {latest.total_rows} rader · {latest.mismatch_count} avvikelser
              </span>
            </div>
            {latest.error_message && (
              <p className="text-sm text-destructive">{latest.error_message}</p>
            )}
            {latest.diff_json?.diffs && latest.diff_json.diffs.length > 0 && (
              <div className="mt-3 max-h-64 overflow-auto">
                <table className="w-full text-xs">
                  <thead className="text-left text-muted-foreground">
                    <tr><th className="py-1">Yrke|Zon|Typ</th><th>Typ</th><th>Baseline</th><th>Live</th></tr>
                  </thead>
                  <tbody>
                    {latest.diff_json.diffs.map((d, i) => (
                      <tr key={i} className="border-t">
                        <td className="py-1 pr-2 font-mono">{d.key}</td>
                        <td className="pr-2">{d.type}</td>
                        <td className="pr-2">{d.baseline ?? "—"}</td>
                        <td className="pr-2">{d.current ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        <div>
          <h4 className="text-sm font-medium mb-2">Historik</h4>
          {loading ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <div className="space-y-1">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-xs py-1 border-b">
                  <StatusBadge s={r.status} />
                  <span className="text-muted-foreground">{new Date(r.run_at).toLocaleString("sv-SE")}</span>
                  <span className="ml-auto">{r.mismatch_count}/{r.total_rows} avvikelser</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
