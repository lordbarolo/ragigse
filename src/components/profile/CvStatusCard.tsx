import { useEffect, useState } from "react";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { btnPrimary } from "./buttonStyles";

/** Litet CV-kort på profilsidan — själva arbetsflödet ligger på /consultant/cv. */
export default function CvStatusCard() {
  const [status, setStatus] = useState<{ pending: number; hasDraft: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("cv_optimizations")
        .select("questions, cv_markdown")
        .order("updated_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (cancelled) return;
      setStatus({
        pending: Array.isArray(data?.questions) ? data.questions.length : 0,
        hasDraft: Boolean(data?.cv_markdown),
      });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const label = !status?.hasDraft
    ? "Bygg ditt CV med assistenten"
    : status.pending > 0
      ? `${status.pending} ${status.pending === 1 ? "fråga väntar" : "frågor väntar"} på svar`
      : "Ditt utkast är klart att ladda ner";

  return (
    <div id="cv" className="scroll-mt-24 rounded-2xl border border-white/10 bg-[#121319] p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="grid h-9 w-9 place-items-center rounded-xl border border-white/10 bg-white/5">
            <Sparkles className="h-4 w-4 text-white" />
          </span>
          <h3 className="mt-4 text-lg font-medium text-white">CV</h3>
          <p className="mt-2 text-sm text-white/55">{label}</p>
        </div>
        <Link
          to="/consultant/cv"
          className={`shrink-0 ${btnPrimary}`}
        >
          Öppna <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </div>
  );
}
