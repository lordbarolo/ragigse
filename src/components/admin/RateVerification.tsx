import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { CheckCircle2, AlertTriangle, XCircle, RefreshCw, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Run {
  id: string;
  run_at: string;
  status: string;
  total_rows: number;
  mismatch_count: number;
  current_checksum: string | null;
  baseline_checksum: string | null;
  version_id: string | null;
  diff_json: { diffs?: Array<{ key: string; baseline: number | null; current: number | null; type: string }> } | null;
  error_message: string | null;
}

interface Version {
  id: string;
  catalog_name: string;
  version_label: string;
}

const StatusBadge = ({ s }: { s: string }) => {
  if (s === "ok") return <Badge variant="default"><CheckCircle2 className="w-3 h-3 mr-1" />OK</Badge>;
  if (s === "mismatch") return <Badge variant="destructive"><AlertTriangle className="w-3 h-3 mr-1" />Avvikelse</Badge>;
  if (s === "error") return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Fel</Badge>;
  return <Badge variant="secondary">{s}</Badge>;
};

export default function RateVerification() {
  const [runs, setRuns] = useState<Run[]>([]);
  const [versions, setVersions] = useState<Version[]>([]);
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [selected, setSelected] = useState<Record<string, Record<string, boolean>>>({}); // versionId -> { key: true }
  const [reasons, setReasons] = useState<Record<string, string>>({});
  const [acking, setAcking] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: r }, { data: v }] = await Promise.all([
      supabase.from("rate_verification_runs").select("*").order("run_at", { ascending: false }).limit(40),
      supabase.from("contract_versions").select("id, catalog_name, version_label").eq("is_active", true),
    ]);
    setRuns((r ?? []) as Run[]);
    setVersions((v ?? []) as Version[]);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const runNow = async () => {
    setRunning(true);
    const { data, error } = await supabase.functions.invoke("verify-rates");
    setRunning(false);
    if (error) toast({ title: "Verifiering misslyckades", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Verifiering klar", description: `${data?.mismatch_count ?? 0} avvikelser totalt över ${data?.results?.length ?? 0} versioner` });
      load();
    }
  };

  // latest run per version
  const latestPerVersion = useMemo(() => {
    const m = new Map<string, Run>();
    for (const r of runs) {
      const k = r.version_id ?? "_null";
      if (!m.has(k)) m.set(k, r);
    }
    return m;
  }, [runs]);

  const versionLabel = (id: string | null) => {
    if (!id) return "Okänd version";
    const v = versions.find((x) => x.id === id);
    return v ? `${v.catalog_name} ${v.version_label}` : id.slice(0, 8);
  };

  const ackSelected = async (versionId: string) => {
    const run = latestPerVersion.get(versionId);
    if (!run?.diff_json?.diffs) return;
    const sel = selected[versionId] ?? {};
    const items = run.diff_json.diffs
      .filter((d) => sel[d.key] && d.type === "value_changed" && d.current !== null)
      .map((d) => {
        const [yrkeskategori, zon, typ] = d.key.split("|");
        return { yrkeskategori, zon, typ, new_value: Number(d.current) };
      });
    if (items.length === 0) {
      toast({ title: "Inget valt", description: "Markera minst en rad", variant: "destructive" });
      return;
    }
    const reason = (reasons[versionId] ?? "").trim();
    if (reason.length < 10) {
      toast({ title: "Motivering krävs (≥10 tecken)", variant: "destructive" });
      return;
    }
    setAcking(versionId);
    const { error } = await supabase.functions.invoke("rate-baseline-ack", {
      body: { version_id: versionId, items, reason },
    });
    setAcking(null);
    if (error) toast({ title: "Misslyckades", description: error.message, variant: "destructive" });
    else {
      toast({ title: "Baseline uppdaterad", description: `${items.length} rader re-baselineade och loggade` });
      setSelected((s) => ({ ...s, [versionId]: {} }));
      setReasons((r) => ({ ...r, [versionId]: "" }));
      load();
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Prisverifiering — alla aktiva kataloger</CardTitle>
          <CardDescription>
            Nattlig kontroll (kl 03:00) som jämför live mot låst baseline-snapshot. Diffar måste godkännas manuellt av admin med motivering.
          </CardDescription>
        </div>
        <Button size="sm" onClick={runNow} disabled={running}>
          {running ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <RefreshCw className="w-4 h-4 mr-2" />}
          Kör nu
        </Button>
      </CardHeader>
      <CardContent className="space-y-6">
        {[...latestPerVersion.entries()].map(([versionId, latest]) => (
          <div key={versionId} className="rounded-md border p-4 bg-muted/30">
            <div className="flex items-center gap-3 mb-2">
              <StatusBadge s={latest.status} />
              <span className="text-sm font-medium">{versionLabel(latest.version_id)}</span>
              <span className="text-xs text-muted-foreground">
                {new Date(latest.run_at).toLocaleString("sv-SE")} · {latest.total_rows} rader · {latest.mismatch_count} avvikelser
              </span>
            </div>
            {latest.error_message && <p className="text-sm text-destructive">{latest.error_message}</p>}
            {latest.diff_json?.diffs && latest.diff_json.diffs.length > 0 && (
              <>
                <div className="mt-3 max-h-64 overflow-auto">
                  <table className="w-full text-xs">
                    <thead className="text-left text-muted-foreground">
                      <tr>
                        <th className="py-1 w-8"></th>
                        <th className="py-1">Yrke|Zon|Typ</th>
                        <th>Typ</th><th>Baseline</th><th>Live</th>
                      </tr>
                    </thead>
                    <tbody>
                      {latest.diff_json.diffs.map((d, i) => (
                        <tr key={i} className="border-t">
                          <td className="py-1">
                            {d.type === "value_changed" && d.current !== null && (
                              <Checkbox
                                checked={selected[versionId]?.[d.key] ?? false}
                                onCheckedChange={(v) => setSelected((s) => ({
                                  ...s,
                                  [versionId]: { ...(s[versionId] ?? {}), [d.key]: !!v },
                                }))}
                              />
                            )}
                          </td>
                          <td className="py-1 pr-2 font-mono">{d.key}</td>
                          <td className="pr-2">{d.type}</td>
                          <td className="pr-2">{d.baseline ?? "—"}</td>
                          <td className="pr-2">{d.current ?? "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-3 space-y-2">
                  <Textarea
                    placeholder="Motivering (loggas i revisionsspår, min 10 tecken). T.ex. 'SKR 2026 publicerade korrigering 2026-05-09 — baseline var fel.'"
                    value={reasons[versionId] ?? ""}
                    onChange={(e) => setReasons((r) => ({ ...r, [versionId]: e.target.value }))}
                    rows={2}
                  />
                  <Button
                    size="sm"
                    onClick={() => ackSelected(versionId)}
                    disabled={acking === versionId}
                    className="text-sm font-semibold px-6 py-3"
                  >
                    {acking === versionId
                      ? <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      : <ShieldCheck className="w-4 h-4 mr-2" />}
                    Erkänn och re-snapshota markerade
                  </Button>
                </div>
              </>
            )}
          </div>
        ))}

        <div>
          <h4 className="text-sm font-medium mb-2">Historik (alla versioner)</h4>
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
            <div className="space-y-1">
              {runs.map((r) => (
                <div key={r.id} className="flex items-center gap-3 text-xs py-1 border-b">
                  <StatusBadge s={r.status} />
                  <span className="text-muted-foreground">{new Date(r.run_at).toLocaleString("sv-SE")}</span>
                  <span className="text-muted-foreground">{versionLabel(r.version_id)}</span>
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
