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
import { identifyLeadWithEmail } from "@/lib/identify";

import TeaserHeader from "@/components/teaser/TeaserHeader";
import OccupationInfo from "@/components/teaser/OccupationInfo";
import MarketDiagnosisCard from "@/components/teaser/MarketDiagnosisCard";
import SignupGate from "@/components/teaser/SignupGate";
import EmailHookMessage from "@/components/teaser/EmailHookMessage";
import ReportPreviewList from "@/components/teaser/ReportPreviewList";
import MethodologyDisclosure from "@/components/teaser/MethodologyDisclosure";
import PossibleCompensationInfo from "@/components/PossibleCompensationInfo";
import NegotiationAssistantTeaser from "@/components/teaser/NegotiationAssistantTeaser";
import { SEO } from "@/components/SEO";

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
    let activeReportId = reportId;
    try {
      if (!activeReportId && leadId && survey) {
        const result = await createReport({ leadId, email: emailValue, survey, track: "consultant" });
        activeReportId = result.reportId;
        setReportId(activeReportId);
        sessionStorage.setItem("reportId", activeReportId);
      }

      if (!activeReportId) {
        toast({ title: "Kunde inte skapa rapport, försök igen", variant: "destructive" });
        setEmailSaving(false);
        return;
      }

      const { reportAccessToken } = await saveEmail({ leadId, reportId: activeReportId, email: emailValue });
      if (reportAccessToken) {
        sessionStorage.setItem(`reportAccess:${activeReportId}`, reportAccessToken);
      }

      setEmail(emailValue);
      if (survey) {
        const updated = { ...survey, email: emailValue };
        sessionStorage.setItem("surveyData", JSON.stringify(updated));
      }
      trackEvent("email_collected", { source: "teaser" });
      identifyLeadWithEmail(leadId, emailValue, {
        yrke: survey?.yrke ?? null,
        kommun: survey?.kommun ?? null,
        employment_type: survey?.employmentType ?? null,
      });
    } catch {
      toast({ title: "Kunde inte spara e-post, försök igen", variant: "destructive" });
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

  const teaserTitle = `${survey.yrke || "Vårdkonsult"} – din löneanalys`.slice(0, 60);
  const teaserDesc = `Jämför din ersättning som ${survey.yrke || "vårdkonsult"} i ${survey.kommun || "Sverige"} mot SKR-ramavtalet.`.slice(0, 160);

  return (
    <>
      <SEO title={teaserTitle} description={teaserDesc} path={`/resultat/${urlLeadId ?? leadId}`} />
    <div
      className="min-h-screen"
      style={{
        // Cream / Anthropic-bakgrund — override globala dark-tokens på denna sida
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
        color: '#0A0A0A',
        backgroundColor: "#EEEBE4",
        backgroundImage: [
          "radial-gradient(ellipse 70% 55% at 15% 25%, hsl(196 100% 50% / 0.18) 0%, transparent 55%)",
          "radial-gradient(ellipse 55% 50% at 85% 20%, hsl(245 58% 60% / 0.14) 0%, transparent 50%)",
          "radial-gradient(ellipse 50% 60% at 55% 85%, hsl(160 60% 45% / 0.10) 0%, transparent 50%)",
        ].join(", "),
        backgroundRepeat: "no-repeat",
        backgroundAttachment: "fixed",
      }}
    >
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

        {/* Förklaring: möjlig ersättning */}
        <PossibleCompensationInfo variant="teaser" />

        {/* Account Gate — required to unlock the full report */}
        {!email && (
          <div className="space-y-5">
            <h2 className="text-xl font-bold text-foreground leading-snug">
              Skapa konto för att låsa upp rapporten
            </h2>
            <p className="text-sm text-muted-foreground -mt-3">
              Snabbast med Google – annars e-post och lösenord. Kontot är gratis och sparar dina analyser.
            </p>
            <SignupGate
              onAuthenticated={handleEmailSubmit}
              loading={emailSaving}
            />
          </div>
        )}

        {/* What's in the report */}
        <div className="rounded-xl bg-foreground/[0.02] p-5">
          <ReportPreviewList yrke={survey.yrke} />
        </div>

        {/* Negotiation assistant teaser */}
        <NegotiationAssistantTeaser />

        {/* Methodology — kollapsbar list längst ner */}
        <MethodologyDisclosure variant="teaser" />
      </main>
    </div>
    </>
  );
}
