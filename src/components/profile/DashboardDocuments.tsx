import { useEffect, useState, forwardRef, useImperativeHandle } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, Loader2, Plus, Link2 } from "lucide-react";
import { DocumentUpload } from "@/components/referly/DocumentUpload";
import ShareDocumentsDialog from "./ShareDocumentsDialog";
import DocumentNameCheck from "./DocumentNameCheck";

interface DocRow {
  id: string;
  file_name: string;
  document_type: string;
  uploaded_at: string;
}

const DOC_TYPE_LABELS: Record<string, string> = {
  cv: "CV",
  certificate: "Certifikat / Intyg",
  license: "Legitimation",
  contract: "Avtal",
  ivo: "IVO-intyg",
  hosp: "HOSP-intyg",
  other: "Övrigt",
};

export interface DashboardDocumentsHandle {
  openUpload: () => void;
}

const DashboardDocuments = forwardRef<DashboardDocumentsHandle>((_, ref) => {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);

  useImperativeHandle(ref, () => ({
    openUpload: () => setShowUpload(true),
  }));

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data: cp } = await supabase
        .from("consultant_profiles")
        .select("id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (cp) {
        const { data } = await supabase
          .from("consultant_documents")
          .select("id, file_name, document_type, uploaded_at")
          .eq("consultant_id", cp.id)
          .order("uploaded_at", { ascending: false });
        setDocs(data || []);
      }
      setLoading(false);
    };
    load();
  }, [user, showUpload]);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-primary" />
          Verifierade dokument
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-4">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : docs.length > 0 ? (
          <div className="space-y-3">
            <div className="space-y-2">
              {docs.map((d) => (
                <div key={d.id} className="flex items-center gap-3 p-3 rounded-lg bg-secondary/50">
                  <FileText className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground truncate">{d.file_name}</p>
                    <p className="text-xs text-muted-foreground">
                      {DOC_TYPE_LABELS[d.document_type] || d.document_type} · {new Date(d.uploaded_at).toLocaleDateString("sv-SE")}
                    </p>
                  </div>
                  {(d.document_type === "ivo" || d.document_type === "hosp") && (
                    <DocumentNameCheck
                      documentId={d.id}
                      documentLabel={d.document_type === "ivo" ? "IVO-utdraget" : "HOSP-utdraget"}
                    />
                  )}
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!showUpload && (
                <Button variant="outline" size="sm" className="gap-1.5 text-sm font-semibold" onClick={() => setShowUpload(true)}>
                  <Plus className="w-4 h-4" />
                  Ladda upp fler
                </Button>
              )}
              <Button
                size="sm"
                className="gap-1.5 text-sm font-semibold text-white border-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3]"
                onClick={() => setShareOpen(true)}
              >
                <Link2 className="w-4 h-4" />
                Skapa delningslänk
              </Button>
            </div>
            {showUpload && <DocumentUpload />}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-3">Inga dokument uppladdade</p>
            {!showUpload ? (
              <Button size="sm" className="gap-1.5 text-sm font-semibold" onClick={() => setShowUpload(true)}>
                <Plus className="w-4 h-4" />
                Ladda upp dokument
              </Button>
            ) : (
              <DocumentUpload />
            )}
          </div>
        )}
      </CardContent>
      <ShareDocumentsDialog open={shareOpen} onOpenChange={setShareOpen} />
    </Card>
  );
});

DashboardDocuments.displayName = "DashboardDocuments";
export default DashboardDocuments;
