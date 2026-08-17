import { useEffect, useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { btnPrimary } from "./buttonStyles";

const REQUIRED_DOCS = ["legitimation", "hosp", "ivo", "cv", "belastningsregister"] as const;

interface Props {
  userId: string;
  /** Har användaren besvarat profilfrågorna? */
  contextComplete: boolean;
}

/**
 * Statusblock högst upp på profilsidan: visar hur nära agenten är att kunna
 * arbeta åt användaren. Inga exempelvärden — endast användarens egen status.
 */
export default function AgentStatusCard({ userId, contextComplete }: Props) {
  const [count, setCount] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("consultant_documents")
        .select("doc_type")
        .eq("user_id", userId);
      if (cancelled) return;
      const uploaded = new Set((data ?? []).map((d) => d.doc_type));
      setCount(REQUIRED_DOCS.filter((d) => uploaded.has(d)).length);
    })();
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const total = REQUIRED_DOCS.length;
  const done = count ?? 0;
  const allDocs = done === total;
  const running = allDocs && contextComplete;

  const cta = !contextComplete
    ? { href: "#assistent", label: "Besvara profilfrågorna" }
    : { href: "#dokument", label: allDocs ? "Se dina dokument" : "Ladda upp dokument" };

  return (
    <div className="rounded-2xl border border-white/10 bg-[#121319] p-6 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Status</p>
          <h2 className="mt-2 text-lg font-medium text-white sm:text-xl">
            {count === null ? (
              <span className="inline-flex items-center gap-2 text-white/60">
                <Loader2 className="h-4 w-4 animate-spin" /> Hämtar din status
              </span>
            ) : running ? (
              "Din agent är igång"
            ) : (
              "Din agent är inte igång ännu"
            )}
          </h2>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-white/55">
            {!contextComplete
              ? "Assistenten behöver dina fyra profilsvar innan den kan arbeta med dina uppgifter."
              : allDocs
                ? "Alla handlingar är uppladdade. Funktionen aktiveras efter manuell granskning."
                : "Handlingarna nedan låser upp agentens uppdragsfunktion."}
          </p>
        </div>
        <a
          href={cta.href}
          className={btnPrimary}
        >
          {cta.label} <ArrowRight className="h-3.5 w-3.5" />
        </a>
      </div>

      <div className="mt-6 h-1 w-full overflow-hidden rounded-full bg-white/10">
        <div
          className="h-full rounded-full bg-white transition-all duration-500"
          style={{ width: `${(done / total) * 100}%` }}
        />
      </div>
      <p className="mt-2.5 text-xs text-white/45">
        {done} av {total} dokument klara
        {contextComplete ? "" : " · profilfrågorna ej besvarade"}
      </p>
    </div>
  );
}
