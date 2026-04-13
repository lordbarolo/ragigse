import { useState, useCallback, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Upload, FileCheck, Loader2, CheckCircle2, ChevronRight } from "lucide-react";
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

export default function FakturakontrollNy() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [files, setFiles] = useState<Partial<Record<FileSlot, UploadedFile>>>({});
  const [uploading, setUploading] = useState(false);

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

  const handleSubmit = async () => {
    if (!user || !allUploaded) return;
    setUploading(true);

    try {
      const userId = user.id;
      const paths: Record<FileSlot, string> = {} as Record<FileSlot, string>;

      for (const slot of ["faktura", "tidrapport", "kontrakt"] as FileSlot[]) {
        const f = files[slot]!;
        const path = `${userId}/${Date.now()}_${slot}.pdf`;
        const { error } = await supabase.storage
          .from("invoice_reviews")
          .upload(path, f.file, { contentType: "application/pdf" });
        if (error) throw new Error(`Upload ${slot} failed: ${error.message}`);
        paths[slot] = path;
      }

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

      trackEvent("fakturakontroll_uploaded");

      // Trigger analyzer in background — result is for admin only
      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const { data: { session } } = await supabase.auth.getSession();
      fetch(
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

      setStep(2);
    } catch (err) {
      console.error(err);
      toast.error("Något gick fel vid uppladdningen. Försök igen.");
    } finally {
      setUploading(false);
    }
  };

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
          { n: 2, label: "Bekräftelse" },
        ].map((s, i) => (
          <div key={s.n} className="flex items-center gap-2">
            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
              step >= s.n ? "bg-primary text-primary-foreground border-primary" : "border-border text-muted-foreground"
            }`}>
              {step > s.n ? <CheckCircle2 className="w-4 h-4" /> : s.n}
            </div>
            <span className={step >= s.n ? "text-foreground" : ""}>{s.label}</span>
            {i < 1 && <ChevronRight className="w-3 h-3 text-muted-foreground/50" />}
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
              "Skicka in för granskning"
            )}
          </Button>
        </div>
      )}

      {/* Step 2: Confirmation */}
      {step === 2 && (
        <div className="text-center space-y-6 py-12">
          <CheckCircle2 className="w-12 h-12 text-primary mx-auto" />
          <div>
            <h2 className="font-display text-xl font-bold mb-2">Tack!</h2>
            <p className="text-muted-foreground text-sm max-w-md mx-auto">
              Vi har tagit emot och analyserar dina dokument. Compcare återkommer till dig inom 48 timmar.
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => navigate("/consultant/fakturakontroll")}
          >
            Tillbaka till fakturakontroll
          </Button>
        </div>
      )}
    </div>
  );
}
