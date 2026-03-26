import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";
import { Upload, Loader2 } from "lucide-react";

interface VerificationUploadProps {
  type: "ivo" | "hosp";
  label: string;
  onSuccess: () => void;
}

export function VerificationUpload({ type, label, onSuccess }: VerificationUploadProps) {
  const { user } = useAuth();
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.type !== "application/pdf") {
      toast.error("Endast PDF-filer accepteras");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("Filen är för stor (max 10 MB)");
      return;
    }

    setUploading(true);
    try {
      // Upload file to storage
      const filePath = `${user.id}/${type}_${Date.now()}_${file.name}`;
      const { error: uploadError } = await supabase.storage
        .from("verifications")
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Record in database
      const { error: dbError } = await supabase.from("ref_verifications").insert({
        profile_id: user.id,
        type,
        result: "clear",
        notes: `Uppladdad fil: ${file.name}`,
      });

      if (dbError) throw dbError;

      toast.success(`${label}-utdrag registrerat!`);
      onSuccess();
    } catch (err: any) {
      console.error("Upload error:", err);
      toast.error("Registreringen misslyckades", { description: err.message });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <>
      <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleUpload} className="hidden" />
      <button onClick={() => fileInputRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:text-primary/80 transition-colors disabled:opacity-50">
        {uploading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Upload className="h-3 w-3" />}
        {uploading ? "Laddar…" : "Ladda upp"}
      </button>
    </>
  );
}
