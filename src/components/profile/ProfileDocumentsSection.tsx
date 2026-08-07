import { useCallback, useEffect, useState } from "react";
import { Check, ExternalLink, FileUp, Loader2, Lock, Unlock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import CvAssistantCard from "./CvAssistantCard";
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

  return (
    <section className="border-t border-white/10 py-14 sm:py-16">
      <div className="mx-auto grid w-full max-w-[1200px] gap-8 px-5 lg:grid-cols-[1fr_0.85fr] lg:gap-14">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Dokument</p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white sm:text-3xl">
            Ladda upp dina handlingar
          </h2>
          <p className="mt-3 max-w-lg text-sm leading-relaxed text-white/50">
            Dina dokument lagras krypterat och är endast synliga för dig. De granskas manuellt innan de
            markeras som verifierade.
          </p>

          <div className="mt-7 space-y-2">
            {loading ? (
              <div className="flex items-center gap-2 text-sm text-white/45">
                <Loader2 className="h-4 w-4 animate-spin" /> Hämtar dina dokument…
              </div>
            ) : (
              DOC_TYPES.map((d) => {
                const has = uploaded.has(d.id);
                return (
                  <div
                    key={d.id}
                    className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 rounded-2xl border border-white/10 bg-white/[0.02] px-4 py-3.5"
                  >
                    <div className="min-w-0">
                      <p className="flex items-center gap-2 truncate text-sm font-medium text-white">
                        {has && <Check className="h-3.5 w-3.5 shrink-0 text-white/70" />}
                        {d.label}
                      </p>
                      <p className="mt-0.5 truncate text-xs text-white/45">
                        {has ? docs.find((x) => x.doc_type === d.id)?.file_name : d.desc}
                      </p>
                    </div>
                    <label className="inline-flex shrink-0 cursor-pointer items-center gap-1.5 rounded-full border border-white/20 px-3.5 py-1.5 text-xs font-medium text-white/85 transition-colors hover:bg-white/10">
                      {uploading === d.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <FileUp className="h-3.5 w-3.5" />
                      )}
                      {has ? "Byt fil" : "Ladda upp"}
                      <input
                        type="file"
                        accept="application/pdf,image/png,image/jpeg"
                        className="hidden"
                        disabled={uploading !== null}
                        onChange={(e) => {
                          const f = e.target.files?.[0];
                          e.target.value = "";
                          if (f) void upload(d.id, f);
                        }}
                      />
                    </label>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Upplåsningskort */}
        <div className="rounded-2xl border border-white/10 bg-[#121319] p-6">
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
            {unlocked ? <Unlock className="h-4 w-4 text-white" /> : <Lock className="h-4 w-4 text-white/70" />}
          </span>
          <h3 className="mt-4 text-lg font-medium text-white">Agenten söker och förhandlar uppdrag</h3>
          <p className="mt-2 text-sm leading-relaxed text-white/55">
            Med samtliga dokument på plats får du se konsultuppdrag i förväg. Din personliga agent ansöker
            utifrån dina krav och förhandlar ersättningen till dess att den ligger på din nivå.
          </p>
          <div className="mt-5 h-1 w-full overflow-hidden rounded-full bg-white/10">
            <div
              className="h-full rounded-full bg-white transition-all duration-500"
              style={{ width: `${(uploaded.size / DOC_TYPES.length) * 100}%` }}
            />
          </div>
          <p className="mt-2.5 text-xs text-white/45">
            {unlocked
              ? "Alla dokument uppladdade — funktionen aktiveras efter manuell granskning."
              : `${uploaded.size} av ${DOC_TYPES.length} dokument uppladdade.`}
          </p>
        </div>
      </div>
    </section>
  );
}
