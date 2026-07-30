import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Loader2, ShieldCheck, AlertTriangle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Props {
  documentId: string;
  documentLabel: string;
  documentType?: "ivo" | "hosp" | string;
  onProfileUpdated?: (newName: string) => void;
}

interface CheckResult {
  match: boolean;
  extracted_name: string | null;
  profile_name: string;
  status: "match" | "mismatch" | "no_name_found";
  confidence?: string;
}

export default function DocumentNameCheck({
  documentId,
  documentLabel,
  documentType,
  onProfileUpdated,
}: Props) {
  const { user } = useAuth();
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const runCheck = async () => {
    if (!user) return;
    setRunning(true);
    try {
      const { data, error } = await supabase.functions.invoke(
        "verify-document-name",
        { body: { document_id: documentId } },
      );
      if (error) throw error;
      const res = data as CheckResult;
      setResult(res);
      if (res.status === "match") {
        toast.success("Namnet matchar profilen");
      } else {
        setOpen(true);
      }
    } catch (err: any) {
      console.error(err);
      toast.error("Kunde inte kontrollera namnet", {
        description: err?.message || "Försök igen senare.",
      });
    } finally {
      setRunning(false);
    }
  };

  const useExtractedName = async () => {
    if (!result?.extracted_name || !user) return;
    setSaving(true);
    try {
      const newName = result.extracted_name;
      const oldName = result.profile_name || "";
      const { error: e1 } = await supabase
        .from("ref_profiles")
        .update({ full_name: newName })
        .eq("id", user.id);
      if (e1) throw e1;

      // Logga till revisionslogg
      await supabase.from("profile_audit_log").insert({
        user_id: user.id,
        field_name: "full_name",
        old_value: oldName,
        new_value: newName,
        source: documentType === "hosp" ? "hosp" : documentType === "ivo" ? "ivo" : "manual",
        source_document_id: documentId,
      });

      toast.success("Profilnamn uppdaterat");
      onProfileUpdated?.(newName);
      setOpen(false);
    } catch (err: any) {
      toast.error("Kunde inte uppdatera profilen", {
        description: err?.message || "Försök igen.",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <Button
        size="sm"
        variant="outline"
        onClick={runCheck}
        disabled={running}
        className="gap-1.5 text-xs font-semibold"
      >
        {running ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ShieldCheck className="w-3.5 h-3.5" />
        )}
        Kontrollera namn
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center mb-2">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <DialogTitle>Namnet stämmer inte överens</DialogTitle>
            <DialogDescription>
              {result?.status === "no_name_found"
                ? `Vi kunde inte läsa något namn från ${documentLabel}. Kontrollera att rätt fil är uppladdad.`
                : `Namnet på din profil och namnet på ${documentLabel} skiljer sig åt.`}
            </DialogDescription>
          </DialogHeader>

          {result?.status === "mismatch" && (
            <div className="space-y-3 py-2">
              <div className="rounded-lg border border-slate-200 p-3">
                <p className="text-[11px] uppercase tracking-wider text-slate-500">
                  På din profil
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {result.profile_name || "(saknas)"}
                </p>
              </div>
              <div className="rounded-lg border border-violet-200 bg-violet-50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-violet-700">
                  På intyget
                </p>
                <p className="text-sm font-medium text-slate-900">
                  {result.extracted_name}
                </p>
              </div>
            </div>
          )}

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setOpen(false)}
              className="text-sm font-semibold"
            >
              Avbryt
            </Button>
            {result?.status === "mismatch" && (
              <Button
                size="sm"
                onClick={useExtractedName}
                disabled={saving}
                className="gap-1.5 text-sm font-semibold text-white border-0 bg-gradient-to-r from-[#8b5cf6] to-[#d946ef] hover:from-[#7c3aed] hover:to-[#c026d3]"
              >
                {saving ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <CheckCircle2 className="w-3.5 h-3.5" />
                )}
                Använd intygets namn
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
