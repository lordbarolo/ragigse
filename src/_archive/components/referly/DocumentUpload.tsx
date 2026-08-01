import { useState, useRef, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload, Loader2, FileText, X, Paperclip, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface UploadedDoc {
  id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
  file_url: string;
}


const DOC_TYPES = [
  { value: "cv", label: "CV" },
  { value: "certificate", label: "Certifikat / Intyg" },
  { value: "license", label: "Legitimation" },
  { value: "contract", label: "Avtal" },
  { value: "other", label: "Övrigt" },
];

export function DocumentUpload() {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const [documents, setDocuments] = useState<UploadedDoc[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedType, setSelectedType] = useState("cv");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resolveConsultantId = async () => {
    if (!user) return null;
    const { data } = await supabase
      .from("consultant_profiles")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle();
    if (data) {
      setConsultantId(data.id);
      return data.id;
    }
    return null;
  };

  const loadDocuments = async () => {
    if (!user) return;
    const cpId = consultantId || (await resolveConsultantId());
    if (!cpId) {
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("consultant_documents")
      .select("id, file_name, document_type, uploaded_at, file_url")
      .eq("consultant_id", cpId)
      .order("uploaded_at", { ascending: false });
    setDocuments(data || []);
    setLoaded(true);
  };

  useEffect(() => {
    if (user && !loaded) loadDocuments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tillåtna filtyper: PDF, PNG, JPG");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Filen är för stor (max 10 MB)");
      return;
    }
    setPendingFile(file);
  };

  const handleSave = async () => {
    if (!pendingFile || !user) return;
    setUploading(true);
    try {
      const cpId = consultantId || (await resolveConsultantId());
      if (!cpId) throw new Error("Ingen konsultprofil hittades. Skapa din profil först.");

      const safeName = pendingFile.name
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9._-]+/g, "_")
        .replace(/_+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 120) || "file";

      const filePath = `${user.id}/${selectedType}_${Date.now()}_${safeName}`;
      const { error: storageError } = await supabase.storage
        .from("verifications")
        .upload(filePath, pendingFile, {
          contentType: pendingFile.type || "application/octet-stream",
          upsert: false,
        });
      if (storageError) throw storageError;

      const { error: dbError } = await supabase.from("consultant_documents").insert({
        consultant_id: cpId,
        document_type: selectedType,
        file_name: pendingFile.name,
        file_url: filePath,
      });
      if (dbError) throw dbError;

      toast.success("Dokument sparat");
      setPendingFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
      loadDocuments();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Uppladdningen misslyckades", {
        description: err?.message || "Okänt fel. Försök igen.",
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (doc: UploadedDoc) => {
    if (!user) return;
    try {
      // Remove the storage object first so the file doesn't outlive the DB row.
      // RLS on storage.objects + namespaced path ensures only the owner can do this.
      if (doc.file_url) {
        await supabase.storage.from("verifications").remove([doc.file_url]);
      }
      await supabase.from("consultant_documents").delete().eq("id", doc.id);
      toast.success("Dokument borttaget");
      loadDocuments();
    } catch {
      toast.error("Kunde inte ta bort dokumentet");
    }
  };


  const typeLabel = (t: string) => DOC_TYPES.find((d) => d.value === t)?.label || t;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-semibold text-slate-900">Lägg till dokument</h3>
        <span className="text-[11px] text-slate-500">PDF, PNG, JPG · max 10 MB</span>
      </div>

      {/* Upload row */}
      <div className="flex flex-col sm:flex-row gap-2 mb-3">
        <Select value={selectedType} onValueChange={setSelectedType}>
          <SelectTrigger className="w-full sm:w-[200px] h-10 bg-white border-slate-200 text-slate-900">
            <SelectValue placeholder="Välj dokumenttyp" />
          </SelectTrigger>
          <SelectContent className="bg-white">
            {DOC_TYPES.map((t) => (
              <SelectItem key={t.value} value={t.value}>
                {t.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,.png,.jpg,.jpeg"
          onChange={handleFilePick}
          className="hidden"
        />
        <Button
          size="sm"
          variant="outline"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="gap-1.5 h-10 border-slate-200 text-slate-700 hover:bg-slate-50"
        >
          <Paperclip className="h-3.5 w-3.5" />
          {pendingFile ? "Byt fil" : "Välj fil"}
        </Button>

        <Button
          size="sm"
          onClick={handleSave}
          disabled={!pendingFile || uploading}
          className="gap-1.5 h-10 text-white border-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3] disabled:opacity-50 disabled:from-slate-300 disabled:to-slate-300"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          {uploading ? "Sparar…" : "Spara"}
        </Button>
      </div>

      {/* Pending file preview */}
      {pendingFile && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-violet-50 border border-violet-100 mb-3">
          <FileText className="w-4 h-4 text-[#8b5cf6] shrink-0" />
          <span className="text-sm text-slate-700 truncate flex-1">{pendingFile.name}</span>
          <button
            onClick={() => {
              setPendingFile(null);
              if (fileInputRef.current) fileInputRef.current.value = "";
            }}
            className="text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Ta bort vald fil"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Document list */}
      {documents.length === 0 ? (
        <div className="text-center py-6 text-slate-500 text-sm border border-dashed border-slate-200 rounded-xl">
          <Upload className="w-5 h-5 mx-auto mb-2 opacity-60" />
          <p>Inga dokument uppladdade ännu</p>
          <p className="text-xs mt-1">Välj typ, ladda upp en fil och klicka Spara.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {documents.map((doc) => (
            <div
              key={doc.id}
              className="flex items-center gap-3 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2.5"
            >
              <FileText className="w-4 h-4 text-[#8b5cf6] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900 truncate">{doc.file_name}</p>
                <p className="text-xs text-slate-500">
                  {typeLabel(doc.document_type)} · {new Date(doc.uploaded_at).toLocaleDateString("sv-SE")}
                </p>
              </div>
              <button
                onClick={() => handleDelete(doc)}
                className="text-slate-400 hover:text-rose-500 transition-colors"
                aria-label="Ta bort dokument"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
