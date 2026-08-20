import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, FileUp, Loader2, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CvStatusCard from "./CvStatusCard";
import RegistryExtractCard from "./RegistryExtractCard";

const DOC_TYPES = [
  { id: "legitimation", label: "Legitimation", desc: "Socialstyrelsens legitimationsbevis.", link: null },
  {
    id: "hosp",
    label: "HOSP-utdrag",
    desc: "Utdrag ur registret över legitimerad personal.",
    link: {
      href: "https://legitimation.socialstyrelsen.se/ansok-om-intyg/legitimationskontroll-for-arbete-eller-studier-inom-sverige/",
      label: "Socialstyrelsen",
    },
  },
  {
    id: "ivo",
    label: "IVO-utdrag",
    desc: "Utdrag från Inspektionen för vård och omsorg.",
    link: { href: "https://www.ivo.se/kontakt/ta-del-av-handlingar/", label: "IVO" },
  },
  { id: "cv", label: "CV", desc: "Aktuellt CV med uppdrag och kompetens.", link: null },
  {
    id: "belastningsregister",
    label: "Utdrag från belastningsregistret",
    desc: "Begärs hos Polisen — krävs för arbete inom vård och omsorg.",
    link: { href: "https://polisen.se/tjanster-tillstand/belastningsregistret/", label: "Polisen" },
  },
] as const;

type DocRow = { id: string; doc_type: string; file_name: string; status: string };

interface Props {
  userId: string;
}

/** Sektion 3: dokumentuppladdning som låser upp agentens uppdragsfunktion. */
export default function ProfileDocumentsSection({ userId }: Props) {
  const [docs, setDocs] = useState<DocRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState<string | null>(null);

  const load = useCallback(async () => {
    const { data, error } = await supabase
      .from("consultant_documents")
      .select("id, doc_type, file_name, status")
      .eq("user_id", userId);
    if (error) {
      console.error("[ProfileDocuments] load failed", error);
    } else {
      setDocs(data ?? []);
    }
    setLoading(false);
  }, [userId]);

  useEffect(() => {
    void load();
  }, [load]);

  async function upload(docType: string, file: File) {
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Filen är för stor (max 10 MB).");
      return;
    }
    setUploading(docType);
    try {
      const ext = file.name.split(".").pop() ?? "pdf";
      const path = `${userId}/${docType}-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("verifications").upload(path, file);
      if (upErr) throw upErr;
      const { error: dbErr } = await supabase.from("consultant_documents").upsert(
        { user_id: userId, doc_type: docType, file_path: path, file_name: file.name, status: "pending" },
        { onConflict: "user_id,doc_type" },
      );
      if (dbErr) throw dbErr;
      toast.success("Dokumentet är uppladdat.");
      await load();
    } catch (err) {
      console.error("[ProfileDocuments] upload failed", err);
      toast.error("Kunde inte ladda upp dokumentet. Försök igen.");
    } finally {
      setUploading(null);
    }
  }

  const uploaded = new Set(docs.map((d) => d.doc_type));
  const unlocked = DOC_TYPES.every((d) => uploaded.has(d.id));

  // Dold tillsvidare — dokumentuppladdningen är inte redo för produktion.
  return null;
}
