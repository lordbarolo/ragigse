import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRates, useLocations } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";

import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useTeaserData } from "@/hooks/useTeaserData";

import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import { fetchLead, leadToSurvey, createReport, saveEmail } from "@/services/leadService";

import TeaserHeader from "@/components/teaser/TeaserHeader";
import OccupationInfo from "@/components/teaser/OccupationInfo";
import MarketDiagnosisCard from "@/components/teaser/MarketDiagnosisCard";
import EmailGate from "@/components/teaser/EmailGate";
import EmailHookMessage from "@/components/teaser/EmailHookMessage";
import ReportPreviewList from "@/components/teaser/ReportPreviewList";
import MethodologyDisclosure from "@/components/teaser/MethodologyDisclosure";

/** Teaser page — orchestrator for the results preview */
export default function Teaser() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { calculate, result: pricingResult } = usePricingEngine();
  const { data: rates } = useRates();
  const { data: locations } = useLocations();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is already authenticated — pre-fill email so EmailGate auto-skips
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.email) {
        setEmail(session.user.email);
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, []);

  useTimeOnPage("teaser", !!survey);
  const scrollTracked = useRef<Set<number>>(new Set());

  // Track teaser viewed on mount
  useEffect(() => {
    if (survey) {
      trackEvent("teaser_page_viewed", { role: survey.yrke, zone: survey.kommun });
    }
  }, [survey]);

  // Track scroll depth (50% and 75%)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = (scrollTop / docHeight) * 100;
      for (const threshold of [50, 75] as const) {
        if (pct >= threshold && !scrollTracked.current.has(threshold)) {
          scrollTracked.current.add(threshold);
          trackEvent("teaser_scrolled", { scroll_depth_percent: threshold });
        }
      }
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Load data: try sessionStorage first (fresh from survey), then fetch from Supabase
  useEffect(() => {
    const resolvedLeadId = urlLeadId || sessionStorage.getItem("leadId") || "";
    if (!resolvedLeadId) {
      navigate("/");
      return;
    }
    setLeadId(resolvedLeadId);

    // Try sessionStorage first (populated during survey flow)
    const raw = sessionStorage.getItem("surveyData");
    if (raw) {
      const parsed = JSON.parse(raw) as SurveyData;
      setSurvey(parsed);
      setReportId(sessionStorage.getItem("reportId") || "");
      trackEvent("teaser_viewed");

      if (parsed.yrke && parsed.kommun && parsed.employmentType) {
        calculate(parsed.yrke, parsed.kommun, parsed.employmentType as "anstalld" | "foretagare");
      }
      return;
    }

    // No sessionStorage — fetch from backend
    const loadFromBackend = async () => {
      try {
        const res = await fetchLead(resolvedLeadId);
        const surveyData = leadToSurvey(res.lead);

        setSurvey(surveyData);
        setReportId(res.report_id || "");

        // Cache in sessionStorage for subsequent navigations
        sessionStorage.setItem("leadId", resolvedLeadId);
        sessionStorage.setItem("surveyData", JSON.stringify(surveyData));
        if (res.report_id) sessionStorage.setItem("reportId", res.report_id);

        trackEvent("teaser_viewed");

        if (surveyData.yrke && surveyData.kommun && surveyData.employmentType) {
          calculate(surveyData.yrke, surveyData.kommun, surveyData.employmentType as "anstalld" | "foretagare");
        }
      } catch {
        setLoadError(true);
      }
    };

    loadFromBackend();
  }, [urlLeadId, navigate]);

  // ── Background retry: create report if missing (timeout fallback) ──
  const retryAttempted = useRef(false);
  useEffect(() => {
    if (!leadId || !survey || reportId || retryAttempted.current) return;
    retryAttempted.current = true;

    createReport({
      leadId,
      survey,
      track: (survey as SurveyData & { track?: string }).track,
    }).then(({ reportId: rid }) => {
      console.log("[Teaser] Background retry succeeded, reportId:", rid);
      setReportId(rid);
      sessionStorage.setItem("reportId", rid);
    }).catch((err) => {
      console.warn("[Teaser] Background retry failed:", err);
    });
  }, [leadId, survey, reportId]);

  const { result, userHourly, isUnderpaid, diffPercent, isAboveThreshold } =
    useTeaserData(survey, pricingResult);

  const handleEmailSubmit = async (emailValue: string) => {
    setEmailSaving(true);
    try {
      await saveEmail({ leadId, reportId, email: emailValue });

      setEmail(emailValue);
      if (survey) {
        const updated = { ...survey, email: emailValue };
        sessionStorage.setItem("surveyData", JSON.stringify(updated));
      }
      trackEvent("email_collected", { source: "teaser" });
    } catch {
      toast({ title: "Kunde inte spara e-post, försök igen", variant: "destructive" });
      setEmailSaving(false);
      return;
    }

    // Ensure we have a reportId
    let activeReportId = reportId;
    if (!activeReportId && leadId && survey) {
      try {
        const result = await createReport({ leadId, email: emailValue, survey, track: "consultant" });
        activeReportId = result.reportId;
        setReportId(activeReportId);
        sessionStorage.setItem("reportId", activeReportId);
      } catch {
        // Fall through
      }
    }

    if (!activeReportId) {
      toast({ title: "Kunde inte skapa rapport, försök igen", variant: "destructive" });
      setEmailSaving(false);
      return;
    }

    setEmailSaving(false);

    // Navigate directly to full report
    trackEvent("free_report_unlocked", { source: "email_gate" });
    navigate(`/rapport/${activeReportId}`);
  };

  // ── Compute email hook tier & props ──
  const emailHookProps = useMemo(() => {
    const kommun = survey?.kommun || "";
    const zon = pricingResult?.zon || "";
    const occupation = survey?.yrke || "";

    if (!result) return null;

    if (isAboveThreshold) {
      return {
        tier: "above_market" as const,
        hourlyGap: 0,
        monthlyGap: 0,
        kommun,
        zon,
        pctEarningMore: 10,
        currentRate: userHourly,
        occupation,
      };
    }

    if (isUnderpaid) {
      const hourlyGap = result.high - userHourly;
      const monthlyGap = hourlyGap * 167;
      return { tier: "underpaid" as const, hourlyGap, monthlyGap, kommun, currentRate: userHourly, occupation };
    }

    const ceilingHourly = result.high;
    const roomToGrow = ceilingHourly - userHourly;
    if (roomToGrow > 0) {
      return {
        tier: "at_market" as const,
        hourlyGap: roomToGrow,
        monthlyGap: roomToGrow * 167,
        kommun,
        ceilingRate: ceilingHourly,
        currentRate: userHourly,
        occupation,
      };
    }

    return {
      tier: "above_market" as const,
      hourlyGap: 0,
      monthlyGap: 0,
      kommun,
      zon,
      pctEarningMore: 10,
      currentRate: userHourly,
      occupation,
    };
  }, [survey, result, pricingResult, userHourly, isUnderpaid, isAboveThreshold]);

  // Error state
  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4 p-6 text-center">
        <h1 className="text-xl font-semibold text-foreground">Vi kunde inte hitta din analys</h1>
        <p className="text-sm text-muted-foreground">Länken kan vara ogiltig eller ha gått ut.</p>
        <Button onClick={() => navigate("/")}>Gör en ny analys</Button>
      </div>
    );
  }

  if (!survey) return null;

  if (!result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <TeaserHeader kommun={survey.kommun} />

      <main className="px-4 py-8 pb-20 max-w-lg mx-auto space-y-6">
        <OccupationInfo
          yrke={survey.yrke}
          kommun={survey.kommun}
          onChangeYrke={(newYrke) => {
            const updated = { ...survey, yrke: newYrke };
            setSurvey(updated);
            sessionStorage.setItem("surveyData", JSON.stringify(updated));
            if (newYrke && updated.kommun && updated.employmentType) {
              calculate(newYrke, updated.kommun, updated.employmentType as "anstalld" | "foretagare");
            }
          }}
          onChangeKommun={(newKommun) => {
            const updated = { ...survey, kommun: newKommun };
            setSurvey(updated);
            sessionStorage.setItem("surveyData", JSON.stringify(updated));
            if (updated.yrke && newKommun && updated.employmentType) {
              calculate(updated.yrke, newKommun, updated.employmentType as "anstalld" | "foretagare");
            }
          }}
        />

        {/* Market position — top of page */}
        <MarketDiagnosisCard
          diffPercent={diffPercent}
          yrke={survey.yrke}
          kommun={survey.kommun}
          isAboveThreshold={isAboveThreshold}
          emailProvided={false}
        />

        {/* Email Gate */}
        {!email && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-foreground leading-snug">
              Rapporten är klar — vart skickar vi den?
            </h2>
            <EmailGate
              onEmailSubmit={handleEmailSubmit}
              loading={emailSaving}
            />
          </div>
        )}

        {/* What's in the report */}
        <div className="rounded-xl bg-foreground/[0.02] p-5">
          <ReportPreviewList yrke={survey.yrke} />
        </div>

        {/* Methodology — kollapsbar list längst ner */}
        <MethodologyDisclosure variant="teaser" />
      </main>
    </div>
  );
}
