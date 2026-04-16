import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ShieldCheck, FileText, Loader2, Plus, Link2, Check } from "lucide-react";
import { DocumentUpload } from "@/components/referly/DocumentUpload";
import { toast } from "sonner";

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

export default function DashboardDocuments() {
  const { user } = useAuth();
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpload, setShowUpload] = useState(false);
  const [copied, setCopied] = useState(false);

  const shareUrl = user ? `${window.location.origin}/profil/${user.id}` : "";

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopied(true);
      toast.success("Länk kopierad!");
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      // Get consultant_profile id
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
  }, [user]);

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
                </div>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {!showUpload && (
                <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setShowUpload(true)}>
                  <Plus className="w-4 h-4" />
                  Ladda upp fler
                </Button>
              )}
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleCopyLink}>
                {copied ? <Check className="w-4 h-4" /> : <Link2 className="w-4 h-4" />}
                {copied ? "Kopierad!" : "Dela profillänk"}
              </Button>
            </div>
            {showUpload && <DocumentUpload />}
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-muted-foreground text-sm mb-3">Inga dokument uppladdade</p>
            {!showUpload ? (
              <Button size="sm" className="gap-1.5" onClick={() => setShowUpload(true)}>
                <Plus className="w-4 h-4" />
                Ladda upp dokument
              </Button>
            ) : (
              <DocumentUpload />
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
