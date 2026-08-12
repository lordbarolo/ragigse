import { useEffect, useRef, useState } from "react";
import { useNavigate } from "@/lib/router-compat";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";
import { createReport } from "@/services/leadService";
import type { SurveyData } from "@/components/Survey";

/**
 * /consultant/loneanalys
 * Öppnar den kompletta rapporten (samma mall som efter enkäten) utifrån
 * användarens sparade profil. Finns redan en rapport återanvänds den.
 */
export default function SalaryAnalysis() {
  const { user, loading: authLoading } = useAuth();
  const { context, loading: profileLoading, complete } = useProfileContext(user?.id);
  const navigate = useNavigate();
  const [error, setError] = useState<string | null>(null);
  const startedRef = useRef(false);

  useEffect(() => {
    if (authLoading || profileLoading || !user) return;
    if (startedRef.current) return;
    if (!complete || !context?.role || !context?.kommun) return;
    startedRef.current = true;

    const run = async () => {
      try {
        const { data: existing } = await supabase
          .from("reports")
          .select("id")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false })
          .limit(1);

        if (existing && existing.length > 0) {
          navigate(`/rapport/${existing[0].id}`, { replace: true });
          return;
        }

        const survey: SurveyData = {
          email: user.email ?? "",
          employmentType: (context.employmentType === "anstalld" ? "anstalld" : "foretagare"),
          yrke: context.role!,
          kommun: context.kommun!,
          experience: 0,
          salaryType: "hourly",
          currentSalary: context.hourlyRate ?? 0,
          obShare: "",
        };

        const { reportId } = await createReport({ leadId: "", survey, track: "consultant" });
        navigate(`/rapport/${reportId}`, { replace: true });
      } catch (e) {
        console.error("[SalaryAnalysis]", e);
        setError("Vi kunde inte skapa din löneanalys just nu. Försök igen om en stund.");
      }
    };
    run();
  }, [authLoading, profileLoading, user, complete, context, navigate]);

  if (authLoading || profileLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0b0c10]">
        <Loader2 className="h-5 w-5 animate-spin text-white/60" />
      </div>
    );
  }

  if (!complete) {
    return (
      <div className="min-h-screen bg-[#0b0c10] px-5 py-20 text-white">
        <div className="mx-auto max-w-xl">
          <p className="text-[11px] uppercase tracking-[0.16em] text-white/40">Löneanalys</p>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight">Komplettera din profil först</h1>
          <p className="mt-4 text-sm leading-relaxed text-white/60">
            För att kunna visa din kompletta rapport behöver vi veta din roll, kommun, om du är
            anställd eller företagare samt din nuvarande timersättning. Svara på frågorna i
            assistenten på profilsidan.
          </p>
          <button
            type="button"
            onClick={() => navigate("/consultant/profil")}
            className="mt-7 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0b0c10] transition-colors hover:bg-white/90"
          >
            Till profilen
          </button>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0b0c10] px-5 py-20 text-white">
        <div className="mx-auto max-w-xl">
          <h1 className="text-2xl font-semibold tracking-tight">Något gick fel</h1>
          <p className="mt-3 text-sm leading-relaxed text-white/60">{error}</p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-[#0b0c10] hover:bg-white/90"
          >
            Försök igen
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0b0c10]">
      <div className="flex items-center gap-3 text-sm text-white/60">
        <Loader2 className="h-4 w-4 animate-spin" />
        Förbereder din rapport…
      </div>
    </div>
  );
}
