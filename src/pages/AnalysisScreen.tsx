import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import EmailGate from "@/components/teaser/EmailGate";
import type { SurveyData } from "@/components/Survey";
import { Check, ArrowRight } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";

const ANALYSIS_STEPS = [
  { label: "21 regioner", threshold: 15 },
  { label: "290 kommuner", threshold: 30 },
  { label: "Konsulter i samma specialitet", threshold: 50 },
  { label: "Beräknar din position i marknaden", threshold: 70 },
  { label: "Sammanställer din rapport", threshold: 85 },
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

  useEffect(() => {
    const resolvedLeadId = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!resolvedLeadId) { navigate("/"); return; }
    setLeadId(resolvedLeadId);
    setReportId(sessionStorage.getItem("reportId") || "");
    const raw = sessionStorage.getItem("surveyData");
    if (raw) setSurvey(JSON.parse(raw) as SurveyData);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const rid = sessionStorage.getItem("reportId");
        if (rid) navigate(`/rapport/${rid}`, { replace: true });
      }
    });
    trackEvent("analysis_started");
  }, [urlLeadId, navigate]);

  useEffect(() => {
    if (paused || completing) return;
    const duration = 4000;
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
    return () => { if (animRef.current) cancelAnimationFrame(animRef.current); };
  }, [paused, completing]);

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
        setTimeout(() => navigate(`/rapport/${activeReportId}`, { replace: true }), 400);
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

    let activeReportId = reportId;
    if (!activeReportId && leadId && survey) {
      try {
        const { data: rData, error: rErr } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId, email: emailValue, occupation: survey.yrke,
            employment_type: survey.employmentType, kommun: survey.kommun,
            current_salary: survey.currentSalary, salary_type: survey.salaryType, track: "consultant",
          },
        });
        if (!rErr && rData?.report_id) {
          activeReportId = rData.report_id;
          setReportId(activeReportId);
          sessionStorage.setItem("reportId", activeReportId);
        }
      } catch { /* fall through */ }
    }

    if (!activeReportId) {
      toast.error("Kunde inte skapa rapport, försök igen.");
      setEmailSaving(false);
      return;
    }
    setEmailSaving(false);
    completeAnalysis(activeReportId);
  };

  const activeStepIndex = ANALYSIS_STEPS.findIndex((s) => progress < s.threshold);
  const currentStepIdx = activeStepIndex === -1 ? ANALYSIS_STEPS.length - 1 : Math.max(0, activeStepIndex);

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-5 pb-3 flex justify-center">
        <CompcareLogo />
      </header>

      <main className="flex-1 flex flex-col px-5 pt-8 pb-10 sm:pt-14 max-w-md mx-auto w-full">
        <div className="w-full space-y-8">
          {/* Title */}
          <h1 className="text-2xl font-bold text-foreground tracking-tight">
            {completing ? "Färdigställer din rapport…" : paused ? "Nästan klar" : "Analyserar din ersättning"}
          </h1>

          {/* Progress bar — custom, no radix component */}
          <div className="space-y-2">
            <div className="h-2 bg-border/40 rounded-full overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-[width] duration-100 ease-linear"
                style={{ width: `${progress}%` }}
              />
            </div>
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground tabular-nums">{Math.round(progress)} %</span>
              {paused && !completing && (
                <span className="text-xs text-primary font-medium">Väntar på e-post</span>
              )}
            </div>
          </div>

          {/* Step list — minimal, one line each */}
          <div className="space-y-3">
            {ANALYSIS_STEPS.map(({ label, threshold }, i) => {
              const done = progress >= threshold;
              const active = i === currentStepIdx && !done;
              if (!done && !active) return null;

              return (
                <div
                  key={i}
                  className="flex items-center gap-3 animate-in fade-in duration-300"
                >
                  {done ? (
                    <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary" />
                    </div>
                  ) : (
                    <ArrowRight className="w-5 h-5 text-primary shrink-0 animate-pulse" />
                  )}
                  <span className={`text-sm ${done ? "text-muted-foreground" : "text-foreground font-medium"}`}>
                    {label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Email gate — seamless continuation */}
          {paused && !completing && (
            <div className="animate-in fade-in slide-in-from-bottom-3 duration-500 space-y-5">
              <div className="h-px bg-border/50" />
              <div className="space-y-4">
                <div>
                  <h2 className="text-lg font-bold text-foreground">
                    Vart ska vi skicka din rapport?
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Rapporten visas direkt. Du får även en kopia i din inkorg.
                  </p>
                </div>
                <EmailGate
                  onEmailSubmit={handleEmailSubmit}
                  loading={emailSaving}
                />
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
