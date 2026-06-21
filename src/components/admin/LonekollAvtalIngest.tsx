import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, FileText, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface IngestResult {
  file: string;
  chunks: number;
  error?: string;
}

export default function LonekollAvtalIngest() {
  const [running, setRunning] = useState(false);
  const [results, setResults] = useState<IngestResult[] | null>(null);
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;
    setUploading(true);
    let ok = 0;
    let fail = 0;
    for (const f of files) {
      const { error } = await supabase.storage.from("lonekoll_avtal").upload(f.name, f, { upsert: true });
      if (error) {
        console.error(error);
        fail++;
      } else ok++;
    }
    setUploading(false);
    toast.success(`${ok} fil(er) uppladdade${fail > 0 ? `, ${fail} misslyckades` : ""}.`);
    e.target.value = "";
  };

  const handleIngest = async () => {
    setRunning(true);
    setResults(null);
    try {
      const { data, error } = await supabase.functions.invoke("lonekoll-ingest-avtal", { body: {} });
      if (error) throw error;
      setResults(data?.results ?? []);
      const ok = (data?.results ?? []).filter((r: IngestResult) => !r.error).length;
      toast.success(`${ok} dokument indexerade.`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Okänt fel";
      toast.error(`Indexering misslyckades: ${msg}`);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <FileText className="w-4 h-4" /> Lönekoll — SKR-avtal (RAG-index)
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="text-muted-foreground text-xs">
          Ladda upp PDF:erna med SKR-ramavtalet till bucketen <code>lonekoll_avtal</code>. Kör sedan indexeringen — texten chunkas och embeddas (1536 dims) för semantisk sökning av Lönekoll topic 2.
        </p>

        <div>
          <label className="inline-flex items-center gap-2 cursor-pointer text-xs font-semibold px-4 py-2 rounded-lg border border-border hover:bg-secondary transition-colors">
            <Upload className="w-3.5 h-3.5" />
            {uploading ? "Laddar upp…" : "Ladda upp PDF:er"}
            <input
              type="file"
              accept="application/pdf"
              multiple
              className="hidden"
              onChange={handleUpload}
              disabled={uploading}
            />
          </label>
        </div>

        <Button onClick={handleIngest} disabled={running} className="text-sm font-semibold px-6 py-3">
          {running && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />}
          Kör indexering
        </Button>

        {results && (
          <div className="space-y-1 pt-2 border-t border-border">
            {results.map((r) => (
              <div key={r.file} className="text-xs flex items-center justify-between">
                <span className="font-mono">{r.file}</span>
                <span className={r.error ? "text-destructive" : "text-muted-foreground"}>
                  {r.error ? `❌ ${r.error}` : `✓ ${r.chunks} chunks`}
                </span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
