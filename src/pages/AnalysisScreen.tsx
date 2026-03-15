import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import type { SurveyData } from "@/components/Survey";
import type { PricingResult } from "@/hooks/usePricingEngine";
import { Check, Mail, ArrowRight, Lock } from "lucide-react";

/* ── Steps with icons & subtitles ── */
const STEPS = [
  { icon: "📋", label: "Hämtar ramavtalsdata", sub: "SKR RS 202203983 · 2026" },
  { icon: "🗺", label: "Matchar din zon", sub: "Identifierar geografisk prissättning" },
  { icon: "👩‍⚕️", label: "Jämför med din specialitet", sub: "Filtrerar på yrkeskategori" },
  { icon: "📊", label: "Beräknar förhandlingsspann", sub: "Realistiskt · Rekommenderat · Ambitiöst" },
  { icon: "💡", label: "Genererar förhandlingstips", sub: "Anpassade till din situation" },
];

const FACTS = [
  { icon: "📋", eyebrow: "Visste du?", text: <>SKR:s ramavtal sätter <strong>takpriset</strong> som regioner betalar bemanningsföretagen – men vad konsulten får beror på avtal med förmedlaren.</>, source: "SKR RS 202203983" },
  { icon: "📊", eyebrow: "Marknadsspann", text: <>Konsultersättningen varierar med <strong>20–40 %</strong> inom samma yrkeskategori beroende på zon, erfarenhet och förhandling.</>, source: "CompCare marknadsdata 2026" },
  { icon: "💡", eyebrow: "Förhandlingstips", text: <>Konsulter som känner till det <strong>exakta kundpriset</strong> förhandlar i snitt 12 % högre ersättning.</>, source: "Branschanalys 2025" },
];

const STEP_APPEAR_AT_SEC = [0, 1.0, 2.5, 4.0, 5.5];
const STEP_DONE_AT_SEC = [2.5, 4.0, 5.5, 6.5, 7.0];

const EMAIL_PAUSE = 85;
const PHASE1_DURATION = 5000;
const PHASE2_DURATION = 3000;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type Phase = "animating" | "paused_for_email" | "finalizing" | "done";

function fmt(n: number): string {
  return Math.abs(n).toLocaleString("sv-SE");
}

export default function AnalysisScreen() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [phase, setPhase] = useState<Phase>("animating");
  const [progress, setProgress] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);
  const [emailSaving, setEmailSaving] = useState(false);
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const [pricing, setPricing] = useState<PricingResult | null>(null);
  const [factIndex, setFactIndex] = useState(0);
  const [email, setEmail] = useState("");

  const rafRef = useRef<number | null>(null);
  const startRef = useRef(Date.now());
  const emailPauseTime = useRef(0);

  /* ── Init ── */
  useEffect(() => {
    const rid = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!rid) { navigate("/"); return; }
    setLeadId(rid);
    setReportId(sessionStorage.getItem("reportId") || "");
    const raw = sessionStorage.getItem("surveyData");
    if (raw) setSurvey(JSON.parse(raw) as SurveyData);
    const pricingRaw = sessionStorage.getItem("pricingResult");
    if (pricingRaw) setPricing(JSON.parse(pricingRaw) as PricingResult);

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        const r = sessionStorage.getItem("reportId");
        if (r) navigate(`/rapport/${r}`, { replace: true });
      }
    });
    trackEvent("analysis_started");
  }, [urlLeadId, navigate]);

  /* ── Retry create report ── */
  const retryAttempted = useRef(false);
  useEffect(() => {
    if (!leadId || !survey || reportId || retryAttempted.current) return;
    retryAttempted.current = true;
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("create-report", {
          body: { lead_id: leadId, occupation: survey.yrke, employment_type: survey.employmentType, kommun: survey.kommun, current_salary: survey.currentSalary, salary_type: survey.salaryType, track: (survey as SurveyData & { track?: string }).track || "consultant" },
        });
        if (!error && data?.report_id) { setReportId(data.report_id); sessionStorage.setItem("reportId", data.report_id); }
      } catch {}
    })();
  }, [leadId, survey, reportId]);

  /* ── Fact rotation ── */
  useEffect(() => {
    if (phase !== "animating") return;
    const interval = setInterval(() => setFactIndex(i => (i + 1) % FACTS.length), 4000);
    return () => clearInterval(interval);
  }, [phase]);

  /* ── Eased progress ── */
  const ease = (t: number): number => {
    if (t <= 0) return 0;
    if (t >= 1) return EMAIL_PAUSE;
    if (t < 0.4) return (t / 0.4) * 60;
    return 60 + ((t - 0.4) / 0.6) * 25;
  };

  /* ── Phase 1: animate to 85% ── */
  useEffect(() => {
    if (phase !== "animating") return;
    startRef.current = Date.now();
    const tick = () => {
      const elapsed = Date.now() - startRef.current;
      const t = Math.min(elapsed / PHASE1_DURATION, 1);
      setProgress(ease(t));
      setElapsedSec(elapsed / 1000);
      if (t >= 1) { setPhase("paused_for_email"); trackEvent("analysis_email_pause"); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  /* ── Phase 4: finalize ── */
  const finalize = useCallback((activeReportId: string) => {
    setPhase("finalizing");
    emailPauseTime.current = elapsedSec;
    const start = Date.now();
    const tick = () => {
      const elapsed = Date.now() - start;
      const t = elapsed / PHASE2_DURATION;
      const p = EMAIL_PAUSE + t * (100 - EMAIL_PAUSE);
      setProgress(Math.min(p, 100));
      setElapsedSec(emailPauseTime.current + elapsed / 1000);
      if (p >= 100) { setPhase("done"); trackEvent("analysis_completed"); setTimeout(() => navigate(`/rapport/${activeReportId}`, { replace: true }), 500); return; }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
  }, [navigate, elapsedSec]);

  /* ── Email submit ── */
  const handleEmailSubmit = async () => {
    const emailValue = email.trim().toLowerCase();
    if (!EMAIL_REGEX.test(emailValue)) return;
    setEmailSaving(true);
    try {
      const { error } = await supabase.functions.invoke("save-email", { body: { lead_id: leadId, report_id: reportId, email: emailValue } });
      if (error) throw error;
      if (survey) { sessionStorage.setItem("surveyData", JSON.stringify({ ...survey, email: emailValue })); }
      trackEvent("email_collected", { source: "analysis_screen" });
    } catch { toast.error("Kunde inte spara e-post, försök igen."); setEmailSaving(false); return; }

    let activeReportId = reportId;
    if (!activeReportId && leadId && survey) {
      try {
        const { data, error } = await supabase.functions.invoke("create-report", { body: { lead_id: leadId, email: emailValue, occupation: survey.yrke, employment_type: survey.employmentType, kommun: survey.kommun, current_salary: survey.currentSalary, salary_type: survey.salaryType, track: "consultant" } });
        if (!error && data?.report_id) { activeReportId = data.report_id; setReportId(activeReportId); sessionStorage.setItem("reportId", activeReportId); }
      } catch {}
    }
    if (!activeReportId) { toast.error("Kunde inte skapa rapport, försök igen."); setEmailSaving(false); return; }
    setEmailSaving(false);
    finalize(activeReportId);
  };

  const getStepState = (i: number): "hidden" | "active" | "done" => {
    if (elapsedSec < STEP_APPEAR_AT_SEC[i]) return "hidden";
    if (elapsedSec >= STEP_DONE_AT_SEC[i]) return "done";
    return "active";
  };

  /* ── Derived teaser data ── */
  const teaserData = useMemo(() => {
    if (!survey || !pricing) return null;
    const userHourly = survey.salaryType === "hourly" ? survey.currentSalary : Math.round(survey.currentSalary / 167);
    const customerRate = pricing.rate_customer_sek_per_hour || 616;
    const low = pricing.recommended_hourly_min || 470;
    const high = pricing.recommended_hourly_max || 560;
    const isUnderpaid = userHourly < high;
    const roleName = survey.yrke || "Sjuksköterska";
    const zone = pricing.zon || "Zon 1";
    return { userHourly, customerRate, low, high, isUnderpaid, roleName, zone };
  }, [survey, pricing]);

  const validEmail = EMAIL_REGEX.test(email.trim());
  const showPhase1 = phase === "animating";
  const showPhase2 = phase === "paused_for_email";
  const showPhase3 = phase === "paused_for_email";
  const fact = FACTS[factIndex];

  const LOADING_MESSAGES = [
    "Hämtar prisdata för din region…",
    "Matchar mot ramavtalsdata…",
    "Jämför din ersättning med kollegor…",
    "Beräknar förhandlingsutrymme…",
    "Genererar personliga rekommendationer…",
  ];
  const loadingMsgIndex = Math.min(Math.floor(elapsedSec / 1.5), LOADING_MESSAGES.length - 1);
  const statusText = phase === "finalizing" || phase === "done"
    ? "Färdigställer rapport…"
    : phase === "paused_for_email"
      ? "Analysen klar"
      : LOADING_MESSAGES[loadingMsgIndex];

  return (
    <div className="min-h-screen bg-background relative overflow-x-hidden flex flex-col items-center">
      {/* ── Background effects ── */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0" style={{
          background: "radial-gradient(ellipse 60% 50% at 15% 20%, rgba(0,194,255,0.14) 0%, transparent 55%), radial-gradient(ellipse 50% 45% at 85% 80%, rgba(99,102,241,0.10) 0%, transparent 55%)",
        }} />
        <div className="absolute inset-0" style={{
          backgroundImage: "linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px)",
          backgroundSize: "52px 52px",
          maskImage: "radial-gradient(ellipse 80% 80% at 50% 40%, black 0%, transparent 80%)",
          WebkitMaskImage: "radial-gradient(ellipse 80% 80% at 50% 40%, black 0%, transparent 80%)",
        }} />
      </div>

      {/* ── Nav ── */}
      <nav className="relative z-10 w-full flex items-center justify-center py-5 px-6 border-b border-foreground/[0.07]">
        <span className="font-display text-lg font-extrabold tracking-tight">
          comp<span className="text-primary">care</span>
        </span>
      </nav>

      {/* ── Main ── */}
      <main className="relative z-10 w-full max-w-[480px] px-6 pt-10 pb-8 flex-1 flex flex-col">

        {/* ═══════ PHASE 1: Analysis ═══════ */}
        {showPhase1 && (
          <div className="flex flex-col gap-8 animate-fade-in">
            {/* Header */}
            <div>
              <p className="font-display text-[11px] font-semibold tracking-[0.12em] uppercase text-primary mb-2.5">
                Analyserar din data
              </p>
              <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold tracking-tight leading-[1.1]">
                Vad kommer<br />rapporten <span className="text-primary">visa?</span>
              </h1>
            </div>

            {/* Progress */}
            <div>
              <div className="h-1.5 bg-foreground/[0.08] rounded-full overflow-visible relative">
                <div
                  className="h-full rounded-full relative"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, rgba(0,194,255,0.6), hsl(var(--primary)))",
                    transition: "none",
                  }}
                >
                  <span
                    className="absolute right-0 top-1/2 w-3 h-3 rounded-full bg-primary"
                    style={{
                      transform: "translate(50%, -50%)",
                      boxShadow: "0 0 10px rgba(0,194,255,0.7)",
                    }}
                  />
                </div>
              </div>
              <div className="flex justify-between mt-2.5">
                <span className="font-display text-xs font-bold text-primary tabular-nums">
                  {Math.round(progress)} %
                </span>
                <span className="text-xs text-foreground/40">{statusText}</span>
              </div>
            </div>

            {/* Steps */}
            <div className="flex flex-col gap-2.5">
              {STEPS.map((step, i) => {
                const state = getStepState(i);
                if (state === "hidden") return (
                  <div key={i} className="flex items-center gap-3.5 px-4 py-3 rounded-[10px] bg-foreground/[0.03] border border-transparent opacity-40">
                    <div className="w-7 h-7 rounded-full bg-foreground/[0.05] border border-foreground/10 flex items-center justify-center shrink-0 text-sm">
                      {step.icon}
                    </div>
                    <div className="flex-1">
                     <div className="font-display text-[14px] font-semibold text-foreground/50">{step.label}</div>
                      <div className="text-[12px] text-foreground/35 mt-0.5">{step.sub}</div>
                    </div>
                  </div>
                );
                const isDone = state === "done";
                return (
                  <div
                    key={i}
                    className={`flex items-center gap-3.5 px-4 py-3 rounded-[10px] border transition-all duration-400 ${
                      isDone
                        ? "bg-[hsl(var(--green))]/[0.06] border-[hsl(var(--green))]/[0.18]"
                        : "bg-primary/[0.06] border-primary/20"
                    }`}
                    style={{ animation: state === "active" ? "fadeUp 0.4s ease both" : undefined }}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 text-sm ${
                      isDone
                        ? "bg-[hsl(var(--green))]/15 border border-[hsl(var(--green))]/30"
                        : "bg-primary/[0.12] border border-primary/30"
                    }`}>
                      {step.icon}
                    </div>
                    <div className="flex-1">
                      <div className={`font-display text-[14px] font-semibold ${isDone ? "text-foreground/65" : "text-foreground"}`}>{step.label}</div>
                      <div className={`text-[12px] mt-0.5 ${isDone ? "text-foreground/35" : "text-primary/60"}`}>{step.sub}</div>
                    </div>
                    {isDone ? (
                      <span className="text-[hsl(var(--green))] text-xs">✓</span>
                    ) : (
                      <div className="w-3.5 h-3.5 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Fact card */}
            <div
              key={factIndex}
              className="bg-card border border-foreground/[0.07] rounded-xl p-4 flex items-start gap-3.5 relative overflow-hidden animate-fade-in"
            >
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-primary to-primary/20" />
              <span className="text-xl shrink-0 mt-0.5">{fact.icon}</span>
              <div>
                <div className="text-[10px] font-display font-semibold tracking-[0.1em] uppercase text-primary/70 mb-1">
                  {fact.eyebrow}
                </div>
                <div className="text-[14px] text-foreground/75 leading-relaxed">
                  {fact.text}
                </div>
                <div className="text-[12px] text-foreground/35 mt-1.5 font-display">{fact.source}</div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ PHASE 2+3: Preview + Email ═══════ */}
        {showPhase2 && (
          <div className="flex flex-col gap-5 animate-fade-in">
            {/* Title */}
            <div>
              <div className="inline-flex items-center gap-2 bg-[hsl(var(--green))]/[0.08] border border-[hsl(var(--green))]/20 rounded-full px-3.5 py-1.5 mb-3">
                <Check className="w-3.5 h-3.5 text-[hsl(var(--green))]" />
                <span className="text-[11px] font-display font-semibold tracking-[0.1em] uppercase text-[hsl(var(--green))]">Analysen klar</span>
              </div>
              <h1 className="font-display text-[28px] sm:text-[32px] font-extrabold tracking-tight leading-[1.1] mb-2">
                Din analys<br />väntar på <span className="text-primary">dig</span>
              </h1>
              <p className="text-[15px] text-foreground/75 leading-relaxed">
                Förhandlingstipsen och den fullständiga analysen skickas direkt till din inkorg. Inget nyhetsbrev utan din tillåtelse.
              </p>
            </div>

            {/* Result summary */}
            {teaserData && (
              <div className="bg-primary/[0.06] border border-primary/15 rounded-[10px] px-4 py-3.5 text-[15px] text-foreground/75 leading-relaxed">
                Din ersättning på <strong className={`font-extrabold ${teaserData.isUnderpaid ? "text-[hsl(var(--amber))]" : "text-[hsl(var(--green))]"}`}>
                  {fmt(teaserData.userHourly)} kr/h
                </strong> ligger {teaserData.isUnderpaid ? "under" : "över"} marknadsspannet för {teaserData.roleName.toLowerCase()} i {teaserData.zone.toLowerCase()}.
              </div>
            )}

            {/* Locked preview card */}
            <div className="bg-card border border-primary/20 rounded-[14px] relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-primary to-indigo-500/60" />

              {/* Teaser header */}
              <div className="flex items-center justify-between px-5 py-3.5 border-b border-foreground/[0.06]">
                <span className="text-[11px] text-foreground/45 font-display font-medium tracking-[0.1em]">
                  {teaserData ? `${teaserData.roleName} · ${teaserData.zone}` : "Sjuksköterska · Zon 1"}
                </span>
                {teaserData?.isUnderpaid ? (
                  <span className="bg-[hsl(var(--amber))]/[0.12] text-[hsl(var(--amber))] border border-[hsl(var(--amber))]/25 rounded-full px-2.5 py-0.5 text-[11px] font-display font-bold">
                    Under marknad
                  </span>
                ) : (
                  <span className="bg-[hsl(var(--green))]/[0.12] text-[hsl(var(--green))] border border-[hsl(var(--green))]/25 rounded-full px-2.5 py-0.5 text-[11px] font-display font-bold">
                    Över marknad
                  </span>
                )}
              </div>

            {/* Metrics */}
              <div className="px-5 py-1">
                {[
                  { dot: "hsl(var(--primary))", label: "Regionens kundpris", val: teaserData ? `${fmt(teaserData.customerRate)} kr/h` : "616 kr/h" },
                  { dot: teaserData?.isUnderpaid ? "hsl(var(--amber))" : "hsl(var(--green))", label: "Din ersättning", val: teaserData ? `${fmt(teaserData.userHourly)} kr/h` : "558 kr/h" },
                ].map((m, i) => (
                  <div key={i} className="flex items-center justify-between py-2.5 border-b border-foreground/[0.04] last:border-b-0">
                    <div className="flex items-center gap-2.5">
                      <span className="w-[7px] h-[7px] rounded-full shrink-0" style={{ background: m.dot }} />
                      <span className="text-[14px] text-foreground/75">{m.label}</span>
                    </div>
                    <span className="font-display text-[17px] font-extrabold text-foreground">{m.val}</span>
                  </div>
                ))}
              </div>

              {/* Locked negotiation row */}
              <div
                className="mx-5 mb-4 mt-2 rounded-lg px-3.5 py-3 flex items-center justify-between cursor-pointer transition-all hover:bg-foreground/[0.04] group"
                style={{
                  background: "rgba(0,194,255,0.04)",
                  border: "1px solid rgba(0,194,255,0.15)",
                }}
                onClick={() => {
                  if (!validEmail) {
                    // Shake the email input to draw attention
                    const emailInput = document.querySelector('input[type="email"]') as HTMLElement;
                    if (emailInput) {
                      emailInput.classList.add('animate-shake');
                      emailInput.focus();
                      setTimeout(() => emailInput.classList.remove('animate-shake'), 500);
                    }
                    toast.error("Ange din e-postadress för att låsa upp förhandlingsspannet");
                  }
                }}
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="w-3.5 h-3.5 text-primary/60" />
                  <span className="text-[14px] text-foreground/75 font-display font-medium">Ditt förhandlingsutrymme</span>
                </div>
                <span className="text-[12px] text-primary font-display font-bold flex items-center gap-1 group-hover:text-primary transition-colors">
                  Lås upp
                  <ArrowRight className="w-3.5 h-3.5" />
                </span>
              </div>

              {/* Email input inside card */}
              <div className="px-5 pb-5 pt-4 flex flex-col gap-2.5">
                <div className="relative flex items-center">
                  <Mail className="absolute left-4 w-4 h-4 text-foreground/30 pointer-events-none" />
                  <input
                    type="email"
                    inputMode="email"
                    autoComplete="email"
                    placeholder="namn@exempel.se"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && validEmail && !emailSaving) handleEmailSubmit(); }}
                    className="w-full bg-background/60 border-[1.5px] border-foreground/[0.12] rounded-xl text-foreground font-body text-[16px] py-4 pl-11 pr-4 outline-none transition-all focus:border-primary focus:shadow-[0_0_0_3px_rgba(0,194,255,0.1)] placeholder:text-foreground/35"
                    autoFocus
                  />
                </div>
                <button
                  disabled={!validEmail || emailSaving}
                  onClick={handleEmailSubmit}
                  className={`w-full font-display font-bold text-base py-4 rounded-xl flex items-center justify-center gap-2 transition-all active:scale-[0.98] ${
                    validEmail && !emailSaving
                      ? "bg-primary text-primary-foreground shadow-[0_0_28px_rgba(0,194,255,0.25)] hover:-translate-y-px hover:shadow-[0_0_40px_rgba(0,194,255,0.38)]"
                      : "bg-muted text-muted-foreground cursor-not-allowed"
                  }`}
                >
                  {emailSaving ? "Skickar…" : "Visa min rapport"}
                  {!emailSaving && <ArrowRight className="w-5 h-5" />}
                </button>
                <div className="flex items-center justify-center gap-4 flex-wrap">
                  {["Visas direkt", "Ingen inloggning", "Inget nyhetsbrev"].map((t) => (
                    <span key={t} className="text-[12px] text-foreground/45 flex items-center gap-1 font-display font-medium">
                      <span className="text-[hsl(var(--green))] text-[10px] font-bold">✓</span> {t}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ═══════ FINALIZING ═══════ */}
        {(phase === "finalizing" || phase === "done") && (
          <div className="flex flex-col items-center justify-center flex-1 gap-6 animate-fade-in">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              {phase === "done" ? (
                <Check className="w-6 h-6 text-primary" />
              ) : (
                <div className="w-6 h-6 border-2 border-primary/20 border-t-primary rounded-full animate-spin" />
              )}
            </div>
            <div className="text-center">
              <h2 className="font-display text-xl font-bold mb-2">
                {phase === "done" ? "Klar!" : "Färdigställer din rapport…"}
              </h2>
              <div className="h-1.5 w-48 bg-foreground/[0.08] rounded-full overflow-hidden mx-auto">
                <div
                  className="h-full rounded-full"
                  style={{
                    width: `${progress}%`,
                    background: "linear-gradient(90deg, rgba(0,194,255,0.6), hsl(var(--primary)))",
                  }}
                />
              </div>
              <span className="font-display text-xs font-bold text-primary mt-2 inline-block tabular-nums">
                {Math.round(progress)} %
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
