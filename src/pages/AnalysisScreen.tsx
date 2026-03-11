import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import EmailGate from "@/components/teaser/EmailGate";
import type { SurveyData } from "@/components/Survey";
import {
  BarChart3, MapPin, TrendingUp, Search, FileText, CheckCircle2,
} from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";

const ANALYSIS_STEPS = [
  { icon: Search, label: "Hämtar ramavtalspriser…", threshold: 10 },
  { icon: MapPin, label: "Identifierar din zon…", threshold: 25 },
  { icon: BarChart3, label: "Jämför med marknaden…", threshold: 40 },
  { icon: TrendingUp, label: "Beräknar förhandlingsutrymme…", threshold: 55 },
  { icon: FileText, label: "Sammanställer din rapport…", threshold: 70 },
];

const EMAIL_PAUSE_AT = 85;
const FINAL_TARGET = 100;

export default function AnalysisScreen() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const [progress, setProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [emailSaving, setEmailSaving] = useState(false);
  const [completing, setCompleting] = useState(false);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const animRef = useRef<number | null>(null);
  const startTime = useRef(Date.now());
  const emailPauseShown = useRef(false);

  // Load survey data from sessionStorage
  useEffect(() => {
    const resolvedLeadId = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!resolvedLeadId) {
      navigate("/");
      return;
    }
    setLeadId(resolvedLeadId);
    setReportId(sessionStorage.getItem("reportId") || "");

    const raw = sessionStorage.getItem("surveyData");
    if (raw) {
      setSurvey(JSON.parse(raw) as SurveyData);
    }

    // Check if already authenticated → skip to report
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const rid = sessionStorage.getItem("reportId");
        if (rid) {
          navigate(`/rapport/${rid}`, { replace: true });
        }
      }
    });

    trackEvent("analysis_started");
  }, [urlLeadId, navigate]);

  // Animate progress 0 → EMAIL_PAUSE_AT over ~4 seconds
  useEffect(() => {
    if (paused || completing) return;

    const duration = 4000; // 4s to reach 85%
    const tick = () => {
      const elapsed = Date.now() - startTime.current;
      const pct = Math.min((elapsed / duration) * EMAIL_PAUSE_AT, EMAIL_PAUSE_AT);
      setProgress(pct);

      if (pct >= EMAIL_PAUSE_AT) {
        setPaused(true);
        emailPauseShown.current = true;
        trackEvent("analysis_email_pause");
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [paused, completing]);

  // After email: animate 85 → 100 over 1.5s then navigate
  const completeAnalysis = useCallback((activeReportId: string) => {
    setCompleting(true);
    const completeStart = Date.now();
    const completeDuration = 1500;

    const tick = () => {
      const elapsed = Date.now() - completeStart;
      const pct = EMAIL_PAUSE_AT + (elapsed / completeDuration) * (FINAL_TARGET - EMAIL_PAUSE_AT);
      setProgress(Math.min(pct, FINAL_TARGET));

      if (pct >= FINAL_TARGET) {
        trackEvent("analysis_completed");
        setTimeout(() => {
          navigate(`/rapport/${activeReportId}`, { replace: true });
        }, 400);
        return;
      }
      animRef.current = requestAnimationFrame(tick);
    };
    animRef.current = requestAnimationFrame(tick);
  }, [navigate]);

  const handleEmailSubmit = async (emailValue: string) => {
    setEmailSaving(true);
    try {
      const { error: saveErr } = await supabase.functions.invoke("save-email", {
        body: { lead_id: leadId, report_id: reportId, email: emailValue },
      });
      if (saveErr) throw saveErr;

      if (survey) {
        const updated = { ...survey, email: emailValue };
        sessionStorage.setItem("surveyData", JSON.stringify(updated));
      }
      trackEvent("email_collected", { source: "analysis_screen" });
    } catch {
      toast.error("Kunde inte spara e-post, försök igen.");
      setEmailSaving(false);
      return;
    }

    // Ensure we have a reportId
    let activeReportId = reportId;
    if (!activeReportId && leadId && survey) {
      try {
        const { data: rData, error: rErr } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId,
            email: emailValue,
            occupation: survey.yrke,
            employment_type: survey.employmentType,
            kommun: survey.kommun,
            current_salary: survey.currentSalary,
            salary_type: survey.salaryType,
            track: "consultant",
          },
        });
        if (!rErr && rData?.report_id) {
          activeReportId = rData.report_id;
          setReportId(activeReportId);
          sessionStorage.setItem("reportId", activeReportId);
        }
      } catch {
        // Fall through
      }
    }

    if (!activeReportId) {
      toast.error("Kunde inte skapa rapport, försök igen.");
      setEmailSaving(false);
      return;
    }

    setEmailSaving(false);
    completeAnalysis(activeReportId);
  };

  // Determine which step is "active"
  const activeStepIndex = ANALYSIS_STEPS.findIndex((s) => progress < s.threshold);
  const currentStepIdx = activeStepIndex === -1 ? ANALYSIS_STEPS.length - 1 : Math.max(0, activeStepIndex);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="px-4 pt-5 pb-2 flex justify-center">
        <CompcareLogo />
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-5 py-8 max-w-md mx-auto w-full">
        {/* Progress section */}
        <div className="w-full space-y-6">
          <div className="text-center space-y-2">
            <h1 className="text-xl font-bold text-foreground">
              {completing ? "Färdigställer din rapport…" : paused ? "Nästan klar!" : "Analyserar din ersättning…"}
            </h1>
            <p className="text-sm text-muted-foreground">
              {completing
                ? "Bara ett ögonblick till"
                : paused
                  ? "Vi behöver din e-post för att slutföra analysen"
                  : "Vi jämför dina uppgifter med aktuella ramavtalspriser"}
            </p>
          </div>

          {/* Progress bar */}
          <div className="space-y-2">
            <Progress value={progress} className="h-2.5" />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{Math.round(progress)}%</span>
              {paused && !completing && (
                <span className="text-primary font-medium animate-pulse">Väntar på e-post</span>
              )}
            </div>
          </div>

          {/* Dynamic step list */}
          <div className="space-y-2.5">
            {ANALYSIS_STEPS.map(({ icon: Icon, label, threshold }, i) => {
              const done = progress >= threshold;
              const active = i === currentStepIdx && !done;

              return (
                <div
                  key={i}
                  className={`flex items-center gap-3 py-2 px-3 rounded-lg transition-all duration-500 ${
                    done
                      ? "opacity-100"
                      : active
                        ? "opacity-100 bg-primary/5"
                        : "opacity-30"
                  }`}
                >
                  <div className={`p-1.5 rounded-md shrink-0 transition-colors duration-300 ${
                    done ? "bg-primary/15 text-primary" : active ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
                  }`}>
                    {done ? (
                      <CheckCircle2 className="w-4 h-4" />
                    ) : (
                      <Icon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-sm transition-colors duration-300 ${
                    done ? "text-foreground font-medium" : active ? "text-foreground" : "text-muted-foreground"
                  }`}>
                    {done ? label.replace("…", " ✓") : label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Email gate — appears when paused at 85% */}
          {paused && !completing && (
            <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 mt-4 rounded-xl border border-primary/30 bg-card p-5 space-y-4">
              <EmailGate
                onEmailSubmit={handleEmailSubmit}
                loading={emailSaving}
              />
              <p className="text-[11px] text-muted-foreground text-center">
                Rapporten genereras direkt i appen. Du får även en kopia på e-post.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
