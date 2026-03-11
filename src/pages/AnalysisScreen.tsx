import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import EmailGate from "@/components/teaser/EmailGate";
import type { SurveyData } from "@/components/Survey";
import { Check } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";

/* ── Analysis steps ── */
const STEPS = [
  "21 regioner",
  "290 kommuner",
  "Konsulter i samma specialitet",
  "Beräknar din position i marknaden",
  "Sammanställer din rapport",
];

/* ── Progress thresholds: when each step STARTS being active ── */
/* 12s total: 7s to 85%, pause for email, then 5s to 100% after submit.
   Steps appear every ~3s based on elapsed time. */
const STEP_APPEAR_AT_SEC = [0, 1.5, 4.5, 7.5, 10.5]; // seconds when each step becomes active
const STEP_DONE_AT_SEC   = [4.5, 7.5, 10.5, 13.5, 15]; // seconds when each step completes

const EMAIL_PAUSE = 85;
const PHASE1_DURATION = 7000; // 7s to reach 85%
const PHASE2_DURATION = 5000; // 5s from 85→100 after email

type Phase =
  | "animating"        // bar moving, steps revealing
  | "paused_for_email" // bar paused at 85%, email visible
  | "finalizing"       // bar 85→100 after email
  | "done";            // navigating to report

export default function AnalysisScreen() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("animating");
  const [progress, setProgress] = useState(0);
  const [emailSaving, setEmailSaving] = useState(false);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");

  const rafRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());

  /* ── Init ── */
  useEffect(() => {
    const rid = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!rid) { navigate("/"); return; }
    setLeadId(rid);
    setReportId(sessionStorage.getItem("reportId") || "");
    const raw = sessionStorage.getItem("surveyData");
    if (raw) setSurvey(JSON.parse(raw) as SurveyData);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const r = sessionStorage.getItem("reportId");
        if (r) navigate(`/rapport/${r}`, { replace: true });
      }
    });
    trackEvent("analysis_started");
  }, [urlLeadId, navigate]);

  /* ── Eased progress: fast 0-60, slow 60-85 ── */
  const ease = (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return EMAIL_PAUSE;
    if (t < 0.4) return (t / 0.4) * 60;
    return 60 + ((t - 0.4) / 0.6) * 25;
  };

  /* ── Phase 1-3: animate to 85% over 7s ── */
  useEffect(() => {
    if (phase !== "animating") return;
    startRef.current = Date.now();

    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const t = Math.min(elapsed / PHASE1_DURATION, 1);
      setProgress(ease(t));
      setElapsedSec(elapsed / 1000);

      if (t >= 1) {
        setPhase("paused_for_email");
        trackEvent("analysis_email_pause");
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  /* ── Phase 4: finalize 85→100 ── */
  const finalize = useCallback((activeReportId: string) => {
    setPhase("finalizing");
    const start = Date.now();
    const dur = 1800;

    const tick = () => {
      const elapsed = Date.now() - start;
      const p = EMAIL_PAUSE + (elapsed / dur) * (100 - EMAIL_PAUSE);
      setProgress(Math.min(p, 100));
      if (p >= 100) {
        setPhase("done");
        trackEvent("analysis_completed");
        setTimeout(() => navigate(`/rapport/${activeReportId}`, { replace: true }), 500);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [navigate]);

  /* ── Email submit ── */
  const handleEmailSubmit = async (emailValue: string) => {
    setEmailSaving(true);
    try {
      const { error } = await supabase.functions.invoke("save-email", {
        body: { lead_id: leadId, report_id: reportId, email: emailValue },
      });
      if (error) throw error;
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
        const { data, error } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId, email: emailValue, occupation: survey.yrke,
            employment_type: survey.employmentType, kommun: survey.kommun,
            current_salary: survey.currentSalary, salary_type: survey.salaryType, track: "consultant",
          },
        });
        if (!error && data?.report_id) {
          activeReportId = data.report_id;
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
    finalize(activeReportId);
  };

  /* ── Derive step states ── */
  const getStepState = (i: number): "hidden" | "active" | "done" => {
    if (progress < STEP_START[i]) return "hidden";
    if (progress >= STEP_DONE[i]) return "done";
    return "active";
  };

  const headline =
    phase === "finalizing" || phase === "done"
      ? "Färdigställer din rapport…"
      : phase === "paused_for_email"
        ? "Nästan klar"
        : "Analyserar din ersättning";

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <header className="px-5 pt-5 pb-3 flex justify-center">
        <CompcareLogo />
      </header>

      <main className="flex-1 flex flex-col px-5 pt-10 pb-10 max-w-md mx-auto w-full">
        {/* Headline */}
        <h1 className="text-2xl font-bold text-foreground tracking-tight mb-8">
          {headline}
        </h1>

        {/* Progress bar */}
        <div className="mb-2">
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-[width] duration-75 ease-linear"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between mt-1.5">
            <span className="text-xs text-muted-foreground tabular-nums">
              {Math.round(progress)} %
            </span>
            {phase === "paused_for_email" && (
              <span className="text-xs text-primary font-medium">
                Väntar på e-post
              </span>
            )}
          </div>
        </div>

        {/* Step list — revealed progressively */}
        <div className="mt-6 space-y-0">
          {STEPS.map((label, i) => {
            const state = getStepState(i);
            if (state === "hidden") return null;

            return (
              <div
                key={i}
                className="flex items-center gap-3 py-2.5 animate-in fade-in slide-in-from-bottom-2 duration-500"
                style={{ animationDelay: "0ms", animationFillMode: "both" }}
              >
                {state === "done" ? (
                  <div className="w-5 h-5 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary" />
                  </div>
                ) : (
                  <span className="relative flex w-5 h-5 items-center justify-center shrink-0">
                    <span className="absolute inline-flex h-3 w-3 rounded-full bg-primary/30 animate-ping" />
                    <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
                  </span>
                )}
                <span
                  className={`text-sm transition-colors duration-300 ${
                    state === "done"
                      ? "text-muted-foreground"
                      : "text-foreground font-medium"
                  }`}
                >
                  {label}
                </span>
              </div>
            );
          })}
        </div>

        {/* Email gate — only when paused */}
        {phase === "paused_for_email" && (
          <div className="mt-8 animate-in fade-in slide-in-from-bottom-4 duration-600">
            <div className="h-px bg-border/50 mb-6" />
            <h2 className="text-lg font-bold text-foreground">
              Vart ska vi skicka din rapport?
            </h2>
            <p className="text-sm text-muted-foreground mt-1 mb-4">
              Rapporten visas direkt. Du får även en kopia i din inkorg.
            </p>
            <EmailGate onEmailSubmit={handleEmailSubmit} loading={emailSaving} />
          </div>
        )}
      </main>
    </div>
  );
}
