import { useState, useRef } from "react";
import { Upload, X, FileText, Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MAX_FILES = 5;
const MAX_SIZE_MB = 10;

export default function InvoiceUploadForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    const valid = selected.filter((f) => f.size <= MAX_SIZE_MB * 1024 * 1024);
    if (valid.length < selected.length) {
      toast({ title: "Filer större än 10 MB filtrerades bort", variant: "destructive" });
    }
    setFiles((prev) => [...prev, ...valid].slice(0, MAX_FILES));
    if (fileRef.current) fileRef.current.value = "";
  };

  const removeFile = (idx: number) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || files.length === 0) {
      toast({ title: "Ange e-post och ladda upp minst en faktura", variant: "destructive" });
      return;
    }

    setUploading(true);
    try {
      const filePaths: string[] = [];
      const ts = Date.now();

      for (const file of files) {
        const path = `invoices/${ts}_${file.name}`;
        const { error } = await supabase.storage.from("imports").upload(path, file);
        if (error) throw error;
        filePaths.push(path);
      }

      const { error: dbError } = await supabase.from("invoice_submissions").insert({
        email,
        file_paths: filePaths,
        message: message || null,
      });
      if (dbError) throw dbError;

      setSubmitted(true);
    } catch (err: any) {
      toast({ title: "Något gick fel", description: err.message, variant: "destructive" });
    } finally {
      setUploading(false);
    }
  };

  if (submitted) {
    return (
      <div className="text-center py-12 space-y-4">
        <CheckCircle className="w-12 h-12 text-primary mx-auto" />
        <h3 className="font-display text-2xl font-bold">Tack!</h3>
        <p className="text-muted-foreground max-w-md mx-auto">
          Vi har tagit emot dina fakturor och återkommer till <span className="font-medium text-foreground">{email}</span> inom 48 timmar med resultatet.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Email */}
      <div className="space-y-2">
        <label htmlFor="invoice-email" className="text-sm font-medium text-foreground">
          E-postadress
        </label>
        <input
          id="invoice-email"
          type="email"
          required
          placeholder="din@email.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
        />
      </div>

      {/* File upload */}
      <div className="space-y-2">
        <label className="text-sm font-medium text-foreground">
          Fakturor (max {MAX_FILES} filer, {MAX_SIZE_MB} MB per fil)
        </label>
        <div
          onClick={() => fileRef.current?.click()}
          className="border-2 border-dashed border-border rounded-2xl p-8 text-center cursor-pointer hover:border-primary/40 transition-colors"
        >
          <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Klicka för att välja filer eller dra och släpp
          </p>
          <p className="text-xs text-muted-foreground/60 mt-1">
            PDF, bilder eller Excel
          </p>
        </div>
        <input
          ref={fileRef}
          type="file"
          multiple
          accept=".pdf,.png,.jpg,.jpeg,.xlsx,.xls,.csv"
          onChange={handleFiles}
          className="hidden"
        />

        {files.length > 0 && (
          <div className="space-y-2 mt-3">
            {files.map((f, i) => (
              <div key={i} className="flex items-center gap-3 bg-card border border-border rounded-xl px-4 py-3">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="text-sm text-foreground truncate flex-1">{f.name}</span>
                <span className="text-xs text-muted-foreground">{(f.size / 1024 / 1024).toFixed(1)} MB</span>
                <button type="button" onClick={() => removeFile(i)} className="text-muted-foreground hover:text-destructive">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message */}
      <div className="space-y-2">
        <label htmlFor="invoice-message" className="text-sm font-medium text-foreground">
          Meddelande <span className="text-muted-foreground font-normal">(valfritt)</span>
        </label>
        <textarea
          id="invoice-message"
          rows={3}
          placeholder="T.ex. vilken region du arbetar i, bemanningsföretag, eller andra detaljer"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          className="w-full rounded-xl border border-border bg-background px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/40 resize-none"
        />
      </div>

      <Button type="submit" size="lg" className="w-full text-base font-bold py-6" disabled={uploading}>
        {uploading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Laddar upp...
          </>
        ) : (
          "Skicka in fakturor för granskning"
        )}
      </Button>

      <p className="text-xs text-muted-foreground text-center">
        Vi behöver inga personuppgifter om patienter — bara fakturaraderna.
      </p>
    </form>
  );
}
