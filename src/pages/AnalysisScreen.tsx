import { useEffect, useState, useRef, useMemo } from "react";
import { useNavigate, useParams } from "@/lib/router-compat";
import { supabase } from "@/integrations/supabase/client";
import { trackEvent } from "@/lib/trackEvent";
import { toast } from "sonner";
import type { SurveyData } from "@/components/Survey";
import MarketDiagnosisCard from "@/components/teaser/MarketDiagnosisCard";
import SignupGate from "@/components/teaser/SignupGate";
import { fetchLead, leadToSurvey, createReport, saveEmail } from "@/services/leadService";
import { identifyLeadWithEmail } from "@/lib/identify";
import Navbar from "@/components/Navbar";
import CompcareLogo from "@/components/CompcareLogo";
import { possibleRange, shareRange } from "@/lib/pricing";

export default function AnalysisScreen() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();

  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [pendingAutoUnlockEmail, setPendingAutoUnlockEmail] = useState<string | null>(null);

  const [userZone, setUserZone] = useState<string | null>(null);
  const [userRegion, setUserRegion] = useState<string | null>(null);
  const [userZoneRate, setUserZoneRate] = useState<number>(0);
  const [loadingRates, setLoadingRates] = useState(true);

  /* ── Init: try sessionStorage, fallback to backend ── */
  useEffect(() => {
    const rid = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!rid) { navigate("/"); return; }
    setLeadId(rid);

    const raw = sessionStorage.getItem("surveyData");
    if (raw) {
      try {
        setSurvey(JSON.parse(raw) as SurveyData);
      } catch {
        sessionStorage.clear();
        navigate("/");
        return;
      }
      setReportId(sessionStorage.getItem("reportId") || "");
    } else {
      fetchLead(rid).then((res) => {
        const surveyData = leadToSurvey(res.lead);
        setSurvey(surveyData);
        if (res.report_id) {
          setReportId(res.report_id);
          sessionStorage.setItem("reportId", res.report_id);
        }
        sessionStorage.setItem("leadId", rid);
        sessionStorage.setItem("surveyData", JSON.stringify(surveyData));
      }).catch((err) => {
        console.error("[AnalysisScreen] fetchLead failed", err);
        try {
          import("@/lib/posthog").then(({ default: posthog }) => {
            posthog.capture?.("analysis_error", { phase: "fetch_lead", message: String(err?.message ?? err) });
          });
        } catch { /* silent */ }
        setLoadError("Vi kunde inte hämta din analys just nu.");
      });
    }

    // Check existing session. If user just returned from Google OAuth in the
    // SignupGate, the autoUnlock flag triggers an immediate report-unlock.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user?.email) {
        setEmail(session.user.email);
        // Redan inloggad → hoppa direkt till rapporten om vi har ett reportId.
        const existingReportId = sessionStorage.getItem("reportId");
        if (existingReportId) {
          navigate(`/rapport/${existingReportId}`, { replace: true });
          return;
        }
        if (sessionStorage.getItem("compcare:autoUnlock") === "1") {
          sessionStorage.removeItem("compcare:autoUnlock");
          setPendingAutoUnlockEmail(session.user.email);
        } else {
          // Ingen reportId ännu — trigga unlock så vi skapar en och skickar vidare.
          setPendingAutoUnlockEmail(session.user.email);
        }
      }
    });
    trackEvent("analysis_started");
    trackEvent("product_page_viewed", { product: "loneanalys" });
    trackEvent("teaser_viewed");
    import("@/lib/posthog").then(({ default: posthog }) => {
      try { posthog.isFeatureEnabled?.("teaser-proxy-probe"); } catch { /* noop */ }
    });
  }, [urlLeadId, navigate]);

  // Force light cream background on html/body so dark theme doesn't bleed through
  useEffect(() => {
    const prevHtml = document.documentElement.style.backgroundColor;
    const prevBody = document.body.style.backgroundColor;
    document.documentElement.style.backgroundColor = '#0b0c10';
    document.body.style.backgroundColor = '#0b0c10';
    return () => {
      document.documentElement.style.backgroundColor = prevHtml;
      document.body.style.backgroundColor = prevBody;
    };
  }, []);

  /* ── Fetch zone + rate when survey is ready ── */
  useEffect(() => {
    if (!survey?.kommun || !survey?.yrke) return;

    const load = async () => {
      setLoadingRates(true);

      // 1. User's zone from locations table
      const { data: locData } = await supabase
        .from("locations")
        .select("zon, region")
        .eq("kommun", survey.kommun)
        .limit(1);

      let zoneName: string | null = null;
      if (locData && locData.length > 0) {
        zoneName = locData[0].zon;
        setUserZone(zoneName);
        setUserRegion(locData[0].region);
      }

      // 2. Rate for this role + zone (exact match on rates.yrkeskategori)
      if (zoneName) {
        const { data: rateData } = await supabase
          .from("rates")
          .select("timpris_kund")
          .eq("yrkeskategori", survey.yrke)
          .eq("zon", zoneName)
          .limit(1);
        if (rateData && rateData.length > 0) {
          setUserZoneRate(rateData[0].timpris_kund);
        }
      }

      setLoadingRates(false);
    };
    load();
  }, [survey?.kommun, survey?.yrke]);

  /* ── Retry create report (background) ── */
  const retryAttempted = useRef(false);
  useEffect(() => {
    if (!leadId || !survey || reportId || retryAttempted.current) return;
    retryAttempted.current = true;
    createReport({ leadId, survey, track: (survey as SurveyData & { track?: string }).track })
      .then(({ reportId: rid }) => {
        setReportId(rid);
        sessionStorage.setItem("reportId", rid);
      })
      .catch((err) => {
        console.error("[AnalysisScreen] createReport failed", err);
        try {
          import("@/lib/posthog").then(({ default: posthog }) => {
            posthog.capture?.("analysis_error", { phase: "create_report", message: String(err?.message ?? err) });
          });
        } catch { /* silent */ }
      });
  }, [leadId, survey, reportId]);

  /* ── Unlock report after sign-up / Google sign-in ── */
  const handleAuthenticated = async (emailValue: string) => {
    const normalized = emailValue.trim().toLowerCase();
    setEmailSaving(true);
    let activeReportId = reportId;
    try {
      if (!activeReportId && leadId && survey) {
        const result = await createReport({ leadId, email: normalized, survey, track: "consultant" });
        activeReportId = result.reportId;
        setReportId(activeReportId);
        sessionStorage.setItem("reportId", activeReportId);
      }
      if (!activeReportId) {
        toast.error("Kunde inte skapa rapport, försök igen.");
        setEmailSaving(false);
        return;
      }
      const { reportAccessToken } = await saveEmail({ leadId, reportId: activeReportId, email: normalized });
      if (reportAccessToken) {
        sessionStorage.setItem(`reportAccess:${activeReportId}`, reportAccessToken);
      }
      if (survey) {
        sessionStorage.setItem("surveyData", JSON.stringify({ ...survey, email: normalized }));
      }
      setEmail(normalized);
      trackEvent("email_collected", { source: "analysis_screen" });
      identifyLeadWithEmail(leadId, normalized, {
        yrke: survey?.yrke ?? null,
        kommun: survey?.kommun ?? null,
        employment_type: survey?.employmentType ?? null,
      });
    } catch {
      toast.error("Kunde inte spara e-post, försök igen.");
      setEmailSaving(false);
      return;
    }
    setEmailSaving(false);
    trackEvent("analysis_completed");
    trackEvent("free_report_unlocked", { source: "signup_gate" });
    // Distinguish actual new-account creation from existing-account sign-in.
    // SignupGate sets this flag before initiating email signup or Google OAuth,
    // but for Google we must verify the returned user is truly new (created_at
    // within the last few minutes and ≈ last_sign_in_at) to avoid marking
    // returning Google users as fresh signups.
    const justSignedUp = sessionStorage.getItem("compcare:justSignedUp");
    if (justSignedUp) {
      sessionStorage.removeItem("compcare:justSignedUp");
      let isNew = justSignedUp === "email";
      if (justSignedUp === "google") {
        try {
          const { data: { user: authUser } } = await supabase.auth.getUser();
          const created = authUser?.created_at ? new Date(authUser.created_at).getTime() : 0;
          const lastSignIn = authUser?.last_sign_in_at ? new Date(authUser.last_sign_in_at).getTime() : 0;
          const ageMs = Date.now() - created;
          // New account: created less than 10 min ago AND first sign-in ≈ creation.
          isNew = created > 0 && ageMs < 10 * 60 * 1000 && Math.abs(lastSignIn - created) < 60 * 1000;
        } catch {
          isNew = false;
        }
      }
      if (isNew) {
        trackEvent("signup_completed", { source: "teaser_gate", method: justSignedUp });
      }
    }
    navigate(`/rapport/${activeReportId}`, { replace: true });
  };

  // Trigger auto-unlock once both survey + lead are loaded after Google return.
  useEffect(() => {
    if (!pendingAutoUnlockEmail || !leadId || !survey || emailSaving) return;
    const target = pendingAutoUnlockEmail;
    setPendingAutoUnlockEmail(null);
    handleAuthenticated(target);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingAutoUnlockEmail, leadId, survey]);

  /* ── Compensation comparison ── */
  const comparison = useMemo(() => {
    if (!survey || !userZoneRate) return null;
    const isEmployee = survey.employmentType === "anstalld";
    const role = survey.yrke || "";
    // Marginal- och arbetsgivarmodell hämtas centralt (src/lib/pricing.ts).
    const [, shareMax] = shareRange(role);
    const { min: recMin, max: recMax } = possibleRange(
      userZoneRate,
      role,
      isEmployee ? "anstalld" : "foretagare",
    );

    const isHourly = survey.salaryType === "hourly";
    const currentHourly = isHourly
      ? survey.currentSalary
      : (isEmployee ? Math.round(survey.currentSalary / 167) : survey.currentSalary);

    return { isEmployee, currentHourly, recMin, recMax, shareMax };
  }, [survey, userZoneRate]);

  // Felstate — backend kunde inte hämta lead/rapport.
  if (loadError) {
    return (
      <>
        <div className="min-h-screen flex items-center justify-center px-5" style={{ backgroundColor: "#0b0c10" }}>
          <div className="max-w-md text-center space-y-4">
            <CompcareLogo variant="full" className="!h-7 mx-auto mb-2" />
            <h1 className="font-display text-2xl font-bold text-foreground">Något gick fel</h1>
            <p className="text-sm text-foreground/70 leading-relaxed">
              {loadError} Försök igen om en stund eller kontakta oss på{" "}
              <a href="mailto:info@vardbemanning.ai" className="underline">info@vardbemanning.ai</a>.
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => { setLoadError(null); window.location.reload(); }}
                className="text-sm font-semibold px-6 py-3 rounded-xl bg-foreground text-[#0b0c10] hover:bg-foreground/90"
              >
                Försök igen
              </button>
              <button
                onClick={() => navigate("/")}
                className="text-sm font-semibold px-6 py-3 rounded-xl border border-foreground/20 text-foreground hover:bg-foreground/5"
              >
                Tillbaka till start
              </button>
            </div>
          </div>
        </div>
      </>
    );
  }

  if (!survey) return null;

  const employmentLabel = survey.employmentType === "anstalld" ? "Anställd" : "Egenföretagare";

  return (
    <>
    <div
      className="min-h-screen"
      style={{
        ['--background' as any]: '40 18% 91%',
        ['--foreground' as any]: '0 0% 4%',
        ['--card' as any]: '0 0% 100%',
        ['--card-foreground' as any]: '0 0% 4%',
        ['--popover' as any]: '0 0% 100%',
        ['--popover-foreground' as any]: '0 0% 4%',
        ['--muted' as any]: '40 18% 91%',
        ['--muted-foreground' as any]: '220 9% 46%',
        ['--secondary' as any]: '40 18% 91%',
        ['--secondary-foreground' as any]: '0 0% 4%',
        ['--accent' as any]: '40 18% 91%',
        ['--accent-foreground' as any]: '0 0% 4%',
        ['--border' as any]: '35 17% 85%',
        ['--input' as any]: '35 17% 85%',
        backgroundColor: '#0b0c10',
        color: '#ffffff',
      }}
    >
      <Navbar />

      <main className="px-5 pt-20 pb-16 mx-auto max-w-lg lg:max-w-3xl">
        <div className="mb-8">
          <CompcareLogo variant="full" className="!h-7 mb-3" />
          <p className="text-[13px] text-foreground/55 font-medium tracking-wide">
            Ersättningsanalys
          </p>
        </div>

        <div className="mb-8 pb-6 border-b border-foreground/10">
          <h1 className="font-display text-[34px] sm:text-[38px] font-extrabold tracking-tight text-foreground leading-[1.05] mb-2">
            {(() => {
              const occ = survey.yrke || "";
              const stripped = occ.replace(/^Specialistläkare\s+/i, "").trim();
              if (!stripped) return occ;
              return stripped.charAt(0).toUpperCase() + stripped.slice(1);
            })()}
          </h1>
          <p className="text-[14px] text-[#8a8c94]">
            {survey.kommun}{userRegion && <> · {userRegion}</>} · {employmentLabel}
          </p>
        </div>

        {loadingRates || !comparison ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* 3-läges-diagnos: under / inom / över möjlig ersättning */}
            <MarketDiagnosisCard
              userHourly={comparison.currentHourly}
              rangeLow={comparison.recMin}
              rangeHigh={comparison.recMax}
              consultantShareMax={comparison.shareMax}
              yrke={survey.yrke}
              kommun={survey.kommun}
            />

            {/* Signup gate — kontot krävs för att låsa upp hela rapporten */}
            {!email && (
              <div className="space-y-5">
                <div>
                  <h2 className="font-display text-xl font-bold text-foreground leading-snug">
                    Skapa konto för att låsa upp rapporten
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Snabbast med Google – annars e-post och lösenord. Kontot är gratis och sparar dina analyser.
                  </p>
                </div>
                <SignupGate
                  onAuthenticated={handleAuthenticated}
                  loading={emailSaving}
                />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
    </>
  );
}
