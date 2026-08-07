import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "@/lib/router-compat";
import { Loader2 } from "lucide-react";
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";
import { useAuth } from "@/hooks/useAuth";
import { useProfileContext } from "@/hooks/useProfileContext";
import { saveProfileContext } from "@/lib/profileContext";
import { sanitizeRedirect } from "@/lib/authIntent";
import { toast } from "sonner";

/**
 * Obligatorisk onboarding efter inloggning/registrering.
 * Saknar användaren roll, ort, kontraktsform eller ersättning visas enkäten.
 * Är profilen komplett skickas användaren vidare direkt.
 */
export default function Onboarding() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user, loading: authLoading } = useAuth();
  const { complete, loading: profileLoading, refresh } = useProfileContext(user?.id);
  const [saving, setSaving] = useState(false);

  const target = sanitizeRedirect(searchParams.get("redirect")) ?? "/consultant/profil";

  useEffect(() => {
    if (!authLoading && !user) navigate("/logga-in");
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!authLoading && user && !profileLoading && complete && !saving) {
      navigate(target);
    }
  }, [authLoading, user, profileLoading, complete, saving, navigate, target]);

  const handleComplete = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const raw = sessionStorage.getItem("surveyData");
      const data = raw ? JSON.parse(raw) : null;
      if (data?.yrke && data?.kommun) {
        await saveProfileContext(user.id, {
          role: data.yrke,
          kommun: data.kommun,
          employmentType: data.employmentType || "",
          hourlyRate: Number(data.currentSalary) || 0,
        });
        await refresh();
      }
      navigate(target);
    } catch (err) {
      console.error("[Onboarding] save failed", err);
      toast.error("Kunde inte spara dina uppgifter. Försök igen.");
      setSaving(false);
    }
  };

  if (authLoading || profileLoading || complete) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "#0e1016" }}>
        <Loader2 className="w-5 h-5 animate-spin text-white/70" />
      </div>
    );
  }

  return (
    <div className="min-h-screen px-4 py-12" style={{ background: "#0e1016" }}>
      <div className="mx-auto w-full max-w-xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-2xl font-semibold text-white">Kom igång</h1>
          <p className="text-sm text-white/60">
            Vi behöver fyra uppgifter innan du kan använda assistenten.
          </p>
        </div>
        <InlineTerminalSurvey variant="dark" onComplete={handleComplete} />
      </div>
    </div>
  );
}
