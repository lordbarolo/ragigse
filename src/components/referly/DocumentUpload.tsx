import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload, Loader2, FileText, X, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface UploadedDoc {
  id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
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
  const [consultantId, setConsultantId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Resolve consultant_profiles.id (FK target) from auth user
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

  // Load existing documents
  const loadDocuments = async () => {
    if (!user) return;
    const cpId = consultantId || (await resolveConsultantId());
    if (!cpId) { setLoaded(true); return; }
    const { data } = await supabase
      .from("consultant_documents")
      .select("id, file_name, document_type, uploaded_at")
      .eq("consultant_id", cpId)
      .order("uploaded_at", { ascending: false });
    setDocuments(data || []);
    setLoaded(true);
  };

  if (!loaded && user) {
    loadDocuments();
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const allowedTypes = ["application/pdf", "image/png", "image/jpeg", "image/jpg"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Tillåtna filtyper: PDF, PNG, JPG");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Filen är för stor (max 10 MB)");
      return;
    }

    setUploading(true);
    try {
      const filePath = `${user.id}/${selectedType}_${Date.now()}_${file.name}`;
      const { error: storageError } = await supabase.storage
        .from("verifications")
        .upload(filePath, file);

      if (storageError) throw storageError;

      const { data: urlData } = supabase.storage
        .from("verifications")
        .getPublicUrl(filePath);

      const { error: dbError } = await supabase.from("consultant_documents").insert({
        consultant_id: user.id,
        document_type: selectedType,
        file_name: file.name,
        file_url: filePath,
      });

      if (dbError) throw dbError;

      toast.success("Dokument uppladdat!");
      loadDocuments();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Uppladdningen misslyckades", { description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDelete = async (doc: UploadedDoc) => {
    if (!user) return;
    try {
      await supabase.from("consultant_documents").delete().eq("id", doc.id);
      toast.success("Dokument borttaget");
      loadDocuments();
    } catch {
      toast.error("Kunde inte ta bort dokumentet");
    }
  };

  const typeLabel = (t: string) => DOC_TYPES.find((d) => d.value === t)?.label || t;

  return (
    <Card className="border-border/50 bg-card/80">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">Dokument</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Upload area */}
        <div className="flex items-center gap-2">
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary/40"
          >
            {DOC_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
          <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={handleUpload} className="hidden" />
          <Button
            size="sm"
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="gap-1.5 text-xs"
          >
            {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            {uploading ? "Laddar upp…" : "Ladda upp"}
          </Button>
        </div>

        {/* Document list */}
        {documents.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground text-sm">
            <Upload className="w-6 h-6 mx-auto mb-2 opacity-50" />
            <p>Inga dokument uppladdade ännu</p>
            <p className="text-xs mt-1">Ladda upp CV, certifikat eller andra dokument</p>
          </div>
        ) : (
          <div className="space-y-2">
            {documents.map((doc) => (
              <div key={doc.id} className="flex items-center gap-3 bg-secondary/50 rounded-lg px-3 py-2.5">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">{doc.file_name}</p>
                  <p className="text-xs text-muted-foreground">
                    {typeLabel(doc.document_type)} · {new Date(doc.uploaded_at).toLocaleDateString("sv-SE")}
                  </p>
                </div>
                <button onClick={() => handleDelete(doc)} className="text-muted-foreground hover:text-destructive transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
