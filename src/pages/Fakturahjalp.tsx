import { useEffect, useRef, useState } from "react";
import { ArrowLeft, CheckCircle2, FileSearch, Loader2, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { Link } from "@/lib/router-compat";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";
import { roleLabel5c } from "@/components/startsida5c/roleLabels5c";
import { trackEvent } from "@/lib/trackEvent";

const MAX_FILE_BYTES = 10 * 1024 * 1024;

/**
 * /consultant/fakturahjalp
 * Dedikerad vy för Fakturahjälpen — konsulten laddar upp tidrapporter och
 * fakturor för granskning mot ramavtalets ersättningsnivåer.
 */
export default function Fakturahjalp() {
  const { user } = useAuth();
  const { context } = useProfileContext(user?.id);
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    trackEvent("fakturahjalp_page_viewed");
  }, []);

  function addFiles(selected: FileList | null) {
    if (!selected) return;
    const next: File[] = [];
    for (const file of Array.from(selected)) {
      if (file.size > MAX_FILE_BYTES) {
        toast.error(`${file.name} är för stor (max 10 MB).`);
        continue;
      }
      next.push(file);
    }
    setFiles((prev) => [...prev, ...next].slice(0, 10));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (files.length === 0) {
      toast.error("Ladda upp minst en tidrapport eller faktura.");
      return;
    }
    setSubmitting(true);
    try {
      const paths: string[] = [];
      for (const file of files) {
        const ext = file.name.split(".").pop() ?? "pdf";
        const path = `${user.id}/faktura-${Date.now()}-${paths.length}.${ext}`;
        const { error } = await supabase.storage.from("verifications").upload(path, file);
        if (error) throw error;
        paths.push(path);
      }

      const details = [
        context?.role ? `Roll: ${roleLabel5c(context.role)}` : null,
        context?.kommun ? `Ort: ${context.kommun}` : null,
        context?.hourlyRate ? `Ersättning: ${context.hourlyRate} kr/timme` : null,
        message.trim() ? `Meddelande: ${message.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");

      const { error: dbError } = await supabase.from("invoice_submissions").insert({
        email: user.email ?? "",
        file_paths: paths,
        message: details || null,
      });
      if (dbError) throw dbError;

      trackEvent("fakturakontroll_uploaded", { files: paths.length });
      setSubmitted(true);
    } catch (err) {
      console.error("[Fakturahjalp] submit failed", err);
      toast.error("Vi kunde inte skicka in underlaget. Försök igen om en stund.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0b0c10] text-white">
      <div className="mx-auto max-w-[1200px] px-5 py-8 sm:py-12">
        <Link
          to="/consultant/profil"
          className="inline-flex items-center gap-2 text-sm text-white/50 transition-colors hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Tillbaka till profilen
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[1fr_1.4fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">
              Fakturahjälpen
            </p>
            <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">
              Granska dina underlag
            </h1>
            <p className="mt-4 max-w-md text-sm leading-relaxed text-white/55">
              Ladda upp dina tidrapporter och fakturor. Underlaget jämförs mot
              ramavtalets ersättningsnivåer för din roll och ort, och granskas
              manuellt innan du får ett svar.
            </p>
            <ul className="mt-6 space-y-2 text-sm text-white/50">
              <li>Ingen kostnad om inget avviker.</li>
              <li>25 % + moms av det belopp som faktiskt återförs.</li>
              <li>Underlagen lagras krypterat och delas aldrig vidare.</li>
            </ul>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-5 sm:p-6">
            {submitted ? (
              <div className="py-10 text-center">
                <CheckCircle2 className="mx-auto h-10 w-10 text-white" />
                <h2 className="mt-4 text-xl font-semibold">Underlaget är inskickat</h2>
                <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-white/55">
                  Vi granskar dina filer och återkommer till{" "}
                  <span className="text-white">{user?.email}</span> när granskningen är
                  klar.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
                    <FileSearch className="h-4 w-4 text-white" />
                  </span>
                  <p className="text-sm font-medium text-white">
                    Tidrapporter och fakturor
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => inputRef.current?.click()}
                  className="flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.02] px-4 py-8 text-center transition-colors hover:border-white/30 hover:bg-white/[0.04]"
                >
                  <Upload className="h-5 w-5 text-white/60" />
                  <span className="text-sm text-white">Välj filer</span>
                  <span className="text-xs text-white/40">
                    PDF, PNG eller JPG. Max 10 MB per fil.
                  </span>
                </button>
                <input
                  ref={inputRef}
                  type="file"
                  multiple
                  accept=".pdf,.png,.jpg,.jpeg"
                  className="hidden"
                  onChange={(e) => {
                    addFiles(e.target.files);
                    e.target.value = "";
                  }}
                />

                {files.length > 0 && (
                  <ul className="space-y-2">
                    {files.map((f, i) => (
                      <li
                        key={`${f.name}-${i}`}
                        className="flex items-center justify-between gap-3 rounded-xl border border-white/10 bg-white/[0.02] px-4 py-2.5"
                      >
                        <span className="truncate text-sm text-white/80">{f.name}</span>
                        <button
                          type="button"
                          aria-label={`Ta bort ${f.name}`}
                          onClick={() => setFiles((prev) => prev.filter((_, j) => j !== i))}
                          className="text-white/40 transition-colors hover:text-white"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="space-y-2">
                  <label
                    htmlFor="faktura-meddelande"
                    className="text-sm text-white/70"
                  >
                    Något vi bör veta? (valfritt)
                  </label>
                  <textarea
                    id="faktura-meddelande"
                    rows={3}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="T.ex. vilken period underlagen gäller eller vad du undrar över."
                    className="w-full resize-none rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-white/20"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="text-sm font-semibold px-6 py-3"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Skickar in…
                    </>
                  ) : (
                    "Skicka in för granskning"
                  )}
                </Button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
