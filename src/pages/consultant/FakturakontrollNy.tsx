import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, Loader2, AlertCircle, CheckCircle2, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";

type FileSlot = "faktura" | "tidrapport" | "kontrakt";

interface UploadedFile {
  file: File;
  name: string;
}

const FILE_LABELS: Record<FileSlot, { label: string; desc: string }> = {
  faktura: { label: "Faktura", desc: "Din faktura till regionen" },
  tidrapport: { label: "Tidrapport", desc: "Signerad tidrapport" },
  kontrakt: { label: "Kontrakt", desc: "Ditt kontrakt med bemanningsföretaget" },
};

interface Avvikelse {
  kod: string;
  datum: string;
  beskrivning: string;
  belopp: number;
}

interface ReviewResult {
  id: string;
  status: string;
  avvikelser: Avvikelse[] | null;
  forvantad_summa: number | null;
  fakturerad_summa: number | null;
  differens: number | null;
  har_avvikelse: boolean;
  error_message: string | null;
}

export default function FakturakontrollNy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [files, setFiles] = useState<Partial<Record<FileSlot, UploadedFile>>>({});
  const [uploading, setUploading] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [result, setResult] = useState<ReviewResult | null>(null);

  useEffect(() => {
    trackEvent("fakturakontroll_ny_viewed");
  }, []);

  const allUploaded = files.faktura && files.tidrapport && files.kontrakt;

  const handleFileSelect = useCallback((slot: FileSlot, file: File) => {
    if (file.type !== "application/pdf") {
      toast.error("Endast PDF-filer stöds.");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Filen får vara max 10 MB.");
      return;
    }
    setFiles((prev) => ({ ...prev, [slot]: { file, name: file.name } }));
  }, []);

  const handleDrop = useCallback((slot: FileSlot, e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(slot, file);
  }, [handleFileSelect]);

  // Step 1 → 2: Upload files + create review + trigger analysis
  const handleSubmit = async () => {
    if (!user || !allUploaded) return;
    setUploading(true);

    try {
      const userId = user.id;
      const paths: Record<FileSlot, string> = {} as Record<FileSlot, string>;

      // Upload each file
      for (const slot of ["faktura", "tidrapport", "kontrakt"] as FileSlot[]) {
        const f = files[slot]!;
        const path = `${userId}/${Date.now()}_${slot}.pdf`;
        const { error } = await supabase.storage
          .from("invoice_reviews")
          .upload(path, f.file, { contentType: "application/pdf" });
        if (error) throw new Error(`Upload ${slot} failed: ${error.message}`);
        paths[slot] = path;
      }

      // Create review record
      const { data: review, error: insertErr } = await supabase
        .from("invoice_reviews")
        .insert({
          user_id: userId,
          faktura_path: paths.faktura,
          tidrapport_path: paths.tidrapport,
          kontrakt_path: paths.kontrakt,
          status: "pending",
        })
        .select("id")
        .single();

      if (insertErr || !review) throw new Error("Could not create review: " + insertErr?.message);

      setReviewId(review.id);
      setStep(2);
      trackEvent("fakturakontroll_uploaded");

      // Trigger analyzer
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      await fetch(
        `https://${projectId}.supabase.co/functions/v1/invoice-analyzer`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${session?.access_token ?? ""}`,
          },
          body: JSON.stringify({ review_id: review.id }),
        }
      );
    } catch (err) {
      console.error(err);
      toast.error("Något gick fel vid uppladdningen. Försök igen.");
      setUploading(false);
      return;
    }

    setUploading(false);
  };

  // Step 2: Poll for results
  useEffect(() => {
    if (step !== 2 || !reviewId) return;
    let cancelled = false;
    const poll = async () => {
      while (!cancelled) {
        await new Promise((r) => setTimeout(r, 3000));
        const { data } = await supabase
          .from("invoice_reviews")
          .select("id, status, avvikelser, forvantad_summa, fakturerad_summa, differens, har_avvikelse, error_message")
          .eq("id", reviewId)
          .single();

        if (data && (data.status === "completed" || data.status === "error")) {
          setResult(data as unknown as ReviewResult);
          setStep(3);
          trackEvent("fakturakontroll_completed", { har_avvikelse: data.har_avvikelse });
          break;
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [step, reviewId]);

  if (!user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center space-y-4">
        <h1 className="font-display text-2xl font-bold">Logga in för att använda fakturagranskning</h1>
        <Button onClick={() => navigate("/logga-in")}>Logga in</Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-6 py-10 md:py-16">
      {/* Progress indicator */}
      <div className="flex items-center gap-2 mb-8 text-xs font-medium text-muted-foreground">
        {[
          { n: 1, label: "Ladda upp" },
          { n: 2, label: "Analyserar" },
          { n: 3, label: "Rapport" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              step >= s.n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
            }`}>
              {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={step >= s.n ? "text-foreground" : ""}>{s.label}</span>
            {i < 2 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
          </div>
        ))}
      </div>

      {/* Step 1: Upload */}
      {step === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="font-display text-2xl md:text-3xl font-bold tracking-tight mb-2">
              Ladda upp dina dokument
            </h1>
            <p className="text-muted-foreground text-sm">
              Vi analyserar om du fakturerat rätt enligt nationellt avtal.
            </p>
          </div>

          <div className="space-y-3">
            {(["faktura", "tidrapport", "kontrakt"] as FileSlot[]).map((slot) => {
              const uploaded = files[slot];
              const meta = FILE_LABELS[slot];
              return (
                <label
                  key={slot}
                  className={`flex items-center gap-4 p-4 rounded-xl border-2 border-dashed transition-colors cursor-pointer ${
                    uploaded ? "border-primary/40 bg-primary/[0.03]" : "border-border hover:border-primary/30"
                  }`}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(slot, e)}
                >
                  <input
                    type="file"
                    accept="application/pdf"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) handleFileSelect(slot, f);
                    }}
                  />
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                    uploaded ? "bg-primary/10" : "bg-muted"
                  }`}>
                    {uploaded ? <FileCheck className="w-5 h-5 text-primary" /> : <Upload className="w-5 h-5 text-muted-foreground" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm">{meta.label}</p>
                    <p className="text-xs text-muted-foreground truncate">
                      {uploaded ? uploaded.name : meta.desc}
                    </p>
                  </div>
                  {uploaded && <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />}
                </label>
              );
            })}
          </div>

          <Button
            size="lg"
            className="w-full font-semibold"
            disabled={!allUploaded || uploading}
            onClick={handleSubmit}
          >
            {uploading ? (
              <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Laddar upp...</>
            ) : (
              "Analysera faktura"
            )}
          </Button>
        </div>
      )}

      {/* Step 2: Processing */}
      {step === 2 && (
        <div className="text-center space-y-6 py-12">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <div>
            <h2 className="font-display text-xl font-bold mb-2">Analyserar dina dokument</h2>
            <p className="text-muted-foreground text-sm">
              Läser faktura, tidrapport och kontrakt. Det tar ca 30–60 sekunder.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Results */}
      {step === 3 && result && (
        <div className="space-y-6">
          {result.status === "error" ? (
            <div className="rounded-xl border border-destructive/30 bg-destructive/[0.04] p-6 text-center space-y-3">
              <AlertCircle className="w-8 h-8 text-destructive mx-auto" />
              <h2 className="font-display text-xl font-bold">Något gick fel</h2>
              <p className="text-muted-foreground text-sm">
                {result.error_message ?? "Försök igen eller kontakta support."}
              </p>
              <Button variant="outline" onClick={() => { setStep(1); setFiles({}); setReviewId(null); setResult(null); }}>
                Försök igen
              </Button>
            </div>
          ) : !result.har_avvikelse ? (
            <div className="rounded-xl border border-primary/30 bg-primary/[0.04] p-6 text-center space-y-3">
              <CheckCircle2 className="w-8 h-8 text-primary mx-auto" />
              <h2 className="font-display text-xl font-bold">Fakturan ser korrekt ut</h2>
              <p className="text-muted-foreground text-sm">
                Vi hittade inga avvikelser mot avtalet. Bra jobbat.
              </p>
            </div>
          ) : (
            <>
              <div>
                <h2 className="font-display text-2xl font-bold tracking-tight mb-2">
                  Avvikelser hittade
                </h2>
                <p className="text-muted-foreground text-sm">
                  Vi hittade skillnader mellan din tidrapport och faktura.
                </p>
              </div>

              {/* Summary card */}
              <div className="rounded-xl border border-border bg-card p-5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-muted-foreground">Beräknad differens</p>
                  <p className="text-2xl font-bold text-foreground">
                    {result.differens && result.differens > 0 ? "+" : ""}
                    {result.differens?.toLocaleString("sv-SE")} kr
                  </p>
                </div>
                <div className="text-right text-xs text-muted-foreground space-y-1">
                  <p>Förväntat: {result.forvantad_summa?.toLocaleString("sv-SE")} kr</p>
                  <p>Fakturerat: {result.fakturerad_summa?.toLocaleString("sv-SE")} kr</p>
                </div>
              </div>

              {/* Deviation list */}
              <div className="space-y-2">
                {(result.avvikelser ?? []).map((a, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold uppercase tracking-wider bg-muted text-muted-foreground px-1.5 py-0.5 rounded">
                            {a.kod}
                          </span>
                          {a.datum && (
                            <span className="text-xs text-muted-foreground">{a.datum}</span>
                          )}
                        </div>
                        <p className="text-sm">{a.beskrivning}</p>
                      </div>
                      {a.belopp !== 0 && (
                        <span className="text-sm font-semibold text-foreground whitespace-nowrap">
                          {a.belopp > 0 ? "+" : ""}{a.belopp.toLocaleString("sv-SE")} kr
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground">
                Vi kontaktar dig inom 48 timmar för att diskutera resultatet.
              </p>
            </>
          )}

          <Button
            variant="outline"
            className="w-full"
            onClick={() => navigate("/consultant/fakturakontroll")}
          >
            Tillbaka till fakturakontroll
          </Button>
        </div>
      )}
    </div>
  );
}
