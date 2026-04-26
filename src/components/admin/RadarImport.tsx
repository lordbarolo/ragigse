import { useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/hooks/use-toast";
import { Upload, CheckCircle2, AlertCircle, Loader2, Database } from "lucide-react";

type TargetTable = "uppdragsradar_predictions" | "customer_intelligence";

interface ImportState {
  status: "idle" | "reading" | "uploading" | "done" | "error";
  fileName?: string;
  totalRows?: number;
  uploadedRows: number;
  error?: string;
  durationMs?: number;
}

const initialState: ImportState = { status: "idle", uploadedRows: 0 };

const CHUNK_SIZE = 500;

function ImportCard({
  title,
  description,
  table,
  expectedFields,
}: {
  title: string;
  description: string;
  table: TargetTable;
  expectedFields: string[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<ImportState>(initialState);
  const [truncate, setTruncate] = useState(false);

  const reset = () => setState(initialState);

  const onPick = () => inputRef.current?.click();

  const onFile = async (file: File) => {
    const t0 = performance.now();
    setState({ status: "reading", fileName: file.name, uploadedRows: 0 });

    let parsed: unknown;
    try {
      const text = await file.text();
      parsed = JSON.parse(text);
    } catch (e) {
      setState({
        status: "error",
        fileName: file.name,
        uploadedRows: 0,
        error: `Kunde inte läsa JSON: ${(e as Error).message}`,
      });
      return;
    }

    // Accept either an array, or { records: [...] } / { data: [...] }
    let rows: Record<string, unknown>[] | null = null;
    if (Array.isArray(parsed)) rows = parsed as Record<string, unknown>[];
    else if (parsed && typeof parsed === "object") {
      const obj = parsed as Record<string, unknown>;
      if (Array.isArray(obj.records)) rows = obj.records as Record<string, unknown>[];
      else if (Array.isArray(obj.data)) rows = obj.data as Record<string, unknown>[];
      else if (Array.isArray(obj.rows)) rows = obj.rows as Record<string, unknown>[];
    }

    if (!rows || rows.length === 0) {
      setState({
        status: "error",
        fileName: file.name,
        uploadedRows: 0,
        error: "JSON innehåller inga rader (förväntar array eller { records: [...] }).",
      });
      return;
    }

    setState({
      status: "uploading",
      fileName: file.name,
      totalRows: rows.length,
      uploadedRows: 0,
    });

    let uploaded = 0;
    try {
      for (let i = 0; i < rows.length; i += CHUNK_SIZE) {
        const slice = rows.slice(i, i + CHUNK_SIZE);
        const shouldTruncate = truncate && i === 0;
        const { data, error } = await supabase.functions.invoke("radar-import", {
          body: {
            table,
            rows: slice,
            // Only truncate on the very first chunk
            truncate: shouldTruncate,
            // Server requires explicit confirmation matching the table name
            ...(shouldTruncate ? { truncate_confirm: table } : {}),
          },
        });
        if (error) throw new Error(error.message);
        if (data && typeof data === "object" && "error" in (data as Record<string, unknown>)) {
          throw new Error(String((data as Record<string, unknown>).error));
        }
        uploaded += slice.length;
        setState((s) => ({ ...s, uploadedRows: uploaded }));
      }

      const durationMs = Math.round(performance.now() - t0);
      setState({
        status: "done",
        fileName: file.name,
        totalRows: rows.length,
        uploadedRows: uploaded,
        durationMs,
      });
      toast({
        title: "Import klar",
        description: `${uploaded.toLocaleString("sv-SE")} rader till ${table}.`,
      });
    } catch (e) {
      setState({
        status: "error",
        fileName: file.name,
        totalRows: rows.length,
        uploadedRows: uploaded,
        error: (e as Error).message,
      });
      toast({
        title: "Import misslyckades",
        description: (e as Error).message,
        variant: "destructive",
      });
    }
  };

  const pct = state.totalRows
    ? Math.round((state.uploadedRows / state.totalRows) * 100)
    : 0;

  const busy = state.status === "reading" || state.status === "uploading";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          <CardTitle className="text-base">{title}</CardTitle>
        </div>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">Förväntade fält:</span>{" "}
          <code className="text-[11px]">{expectedFields.join(", ")}</code>
        </div>

        <label className="flex items-center gap-2 cursor-pointer text-sm">
          <Checkbox
            checked={truncate}
            onCheckedChange={(v) => setTruncate(v === true)}
            disabled={busy}
          />
          <span>
            Töm tabellen först <span className="text-muted-foreground">(annars läggs rader till)</span>
          </span>
        </label>

        <input
          ref={inputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFile(f);
            e.target.value = "";
          }}
        />

        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={onPick} disabled={busy} size="sm">
            {busy ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Upload className="w-4 h-4 mr-2" />
            )}
            {busy ? "Importerar…" : "Välj JSON-fil & importera"}
          </Button>
          {state.status !== "idle" && (
            <Button variant="ghost" size="sm" onClick={reset} disabled={busy}>
              Återställ
            </Button>
          )}
          {state.fileName && (
            <Badge variant="outline" className="font-mono text-[11px]">
              {state.fileName}
            </Badge>
          )}
        </div>

        {(state.status === "uploading" || state.status === "reading") && (
          <div className="space-y-1.5">
            <Progress value={pct} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {state.status === "reading"
                  ? "Läser fil…"
                  : `${state.uploadedRows.toLocaleString("sv-SE")} / ${state.totalRows?.toLocaleString("sv-SE")} rader`}
              </span>
              <span>{pct}%</span>
            </div>
          </div>
        )}

        {state.status === "done" && (
          <div className="flex items-start gap-2 rounded-md border border-primary/30 bg-primary/5 p-3 text-sm">
            <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Import klar</div>
              <div className="text-muted-foreground text-xs mt-0.5">
                {state.uploadedRows.toLocaleString("sv-SE")} rader importerade
                {state.durationMs ? ` på ${(state.durationMs / 1000).toFixed(1)} s` : ""}.
              </div>
            </div>
          </div>
        )}

        {state.status === "error" && (
          <div className="flex items-start gap-2 rounded-md border border-destructive/30 bg-destructive/5 p-3 text-sm">
            <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
            <div>
              <div className="font-medium text-destructive">Importen misslyckades</div>
              <div className="text-muted-foreground text-xs mt-0.5 break-all">
                {state.error}
              </div>
              {state.uploadedRows > 0 && (
                <div className="text-muted-foreground text-xs mt-1">
                  {state.uploadedRows.toLocaleString("sv-SE")} rader hann importeras innan felet.
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function RadarImport() {
  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Database className="w-4 h-4 text-primary" />
          Uppdragsradar – Dataimport
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ladda upp <code>predictions.json</code> och <code>customer_profiles.json</code> till databasen.
          Importen körs server-side med admin-behörighet och bypassar RLS.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ImportCard
          title="Import Predictions"
          description="Insertar prognosrader till uppdragsradar_predictions."
          table="uppdragsradar_predictions"
          expectedFields={[
            "customer", "region", "profession", "specialization", "month",
            "expected_calloffs", "expected_calloffs_display",
            "seasonal_index", "yoy_ratio", "ytd_ratio", "trend_ratio",
            "confidence", "is_seasonal_peak", "is_trend_break",
          ]}
        />
        <ImportCard
          title="Import Customer Profiles"
          description="Insertar kundprofiler till customer_intelligence."
          table="customer_intelligence"
          expectedFields={[
            "customer", "region", "profession",
            "vol_2023", "vol_2024", "vol_2025", "vol_2026_ytd",
            "yoy_ratio", "ytd_ratio", "trend_ratio", "trend_label",
            "history_months", "seasonal_peaks", "seasonal_lows", "last_calloff_date",
          ]}
        />
      </div>
    </div>
  );
}
