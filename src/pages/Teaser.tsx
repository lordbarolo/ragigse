import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRates, useLocations } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import type { BenchmarkResult } from "@/hooks/useBenchmarkEngine";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

import { supabase } from "@/integrations/supabase/client";
import { useExitIntent } from "@/hooks/useExitIntent";
import OpportunityGap from "@/components/OpportunityGap";

import { trackEvent } from "@/lib/trackEvent";
import { useCheckout } from "@/shared/useCheckout";
import { useTeaserData } from "@/hooks/useTeaserData";

import TeaserHeader from "@/components/teaser/TeaserHeader";
import OccupationInfo from "@/components/teaser/OccupationInfo";
import EarningsBanner from "@/components/teaser/EarningsBanner";
import PermanentBenchmarkCard from "@/components/teaser/PermanentBenchmarkCard";
import ConsultantVerdictCard from "@/components/teaser/ConsultantVerdictCard";
import ReportPreviewList from "@/shared/ReportPreviewList";
import CheckoutCTA from "@/shared/CheckoutCTA";
import ReferralBottomSheet from "@/components/teaser/ReferralBottomSheet";
import HighEarnerCard from "@/components/teaser/HighEarnerCard";

/** Teaser page — orchestrator for the results preview */
export default function Teaser() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const navigate = useNavigate();
  const { calculate, result: pricingResult } = usePricingEngine();
  const { data: rates } = useRates();
  const { data: locations } = useLocations();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const { checkoutLoading, handleCheckout: checkout } = useCheckout();
  const [unlocked, setUnlocked] = useState(false);
  const [partialUnlocked, setPartialUnlocked] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [leadId, setLeadId] = useState("");
  const [reportId, setReportId] = useState("");
  const checkoutRef = useRef<HTMLDivElement>(null);

  const exitIntentVisible = useExitIntent(28_000);

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

      const savedBenchmark = sessionStorage.getItem("benchmarkResult");
      if (savedBenchmark) setBenchmarkResult(JSON.parse(savedBenchmark) as BenchmarkResult);

      const savedTrack = (parsed as SurveyData & { track?: string }).track;
      if (parsed.yrke && parsed.kommun && parsed.employmentType && savedTrack !== "permanent") {
        calculate(parsed.yrke, parsed.kommun, parsed.employmentType as "anstalld" | "foretagare");
      }
      return;
    }

    // No sessionStorage — fetch from Supabase
    const fetchLead = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("get-lead", {
          body: { lead_id: resolvedLeadId },
        });

        if (error || !data?.lead) {
          setLoadError(true);
          return;
        }

        const lead = data.lead;
        const surveyData: SurveyData & { track?: string } = {
          email: lead.email,
          employmentType: lead.employment_type as "anstalld" | "foretagare",
          yrke: lead.yrke || "",
          kommun: lead.kommun || "",
          experience: lead.experience || 0,
          salaryType: (lead.salary_type as "hourly" | "monthly") || "hourly",
          currentSalary: lead.current_salary || 0,
          track: "consultant",
        };

        setSurvey(surveyData);
        setReportId(data.report_id || "");
        if (data.unlocked_by_referral) setUnlocked(true);

        // Store in sessionStorage for subsequent navigations within this session
        sessionStorage.setItem("leadId", resolvedLeadId);
        sessionStorage.setItem("surveyData", JSON.stringify(surveyData));
        if (data.report_id) sessionStorage.setItem("reportId", data.report_id);

        trackEvent("teaser_viewed");

        if (surveyData.yrke && surveyData.kommun && surveyData.employmentType && surveyData.track !== "permanent") {
          calculate(surveyData.yrke, surveyData.kommun, surveyData.employmentType as "anstalld" | "foretagare");
        }
      } catch {
        setLoadError(true);
      }
    };

    fetchLead();
  }, [urlLeadId, navigate]);

  // Check referral unlock status
  useEffect(() => {
    if (!leadId) return;
    const checkReferral = async () => {
      const { data } = await supabase
        .from("referrals").select("clicked").eq("lead_id", leadId).eq("clicked", true).limit(1);
      if (data && data.length > 0) setUnlocked(true);
    };
    checkReferral();
  }, [leadId]);

  const { isPermanent, result, noisedResult, benchmarkMonthly, userMonthly, userHourly, isUnderpaid, diffPercent, isAboveThreshold } =
    useTeaserData(survey, pricingResult, benchmarkResult);

  // Find geographically nearest kommun in a higher-paying zone (haversine distance)
  const nearestHigherKommun = useMemo(() => {
    if (isPermanent || !pricingResult || !rates || !locations) return null;

    const currentRate = pricingResult.rate_customer_sek_per_hour;
    const currentZon = pricingResult.zon;
    const currentKommun = survey?.kommun || "";

    const matchedRate = rates.find(
      (r) => r.zon === currentZon && r.timpris_kund === currentRate,
    );
    if (!matchedRate) return null;

    const higherRates = rates.filter(
      (r) =>
        r.yrkeskategori === matchedRate.yrkeskategori &&
        r.typ === matchedRate.typ &&
        r.timpris_kund > currentRate &&
        r.zon !== currentZon,
    );
    if (!higherRates.length) return null;

    const higherZones = new Set(higherRates.map((r) => r.zon));
    const userLocation = locations.find((l) => l.kommun === currentKommun);
    if (!userLocation?.lat || !userLocation?.lng) return null;

    const candidates = locations.filter(
      (l) => higherZones.has(l.zon) && l.kommun !== currentKommun && l.lat && l.lng,
    );
    if (!candidates.length) return null;

    // Haversine distance in km
    const toRad = (deg: number) => (deg * Math.PI) / 180;
    const haversine = (lat1: number, lng1: number, lat2: number, lng2: number) => {
      const dLat = toRad(lat2 - lat1);
      const dLng = toRad(lng2 - lng1);
      const a =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
      return 6371 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    };

    let nearest = candidates[0];
    let minDist = haversine(userLocation.lat, userLocation.lng, nearest.lat!, nearest.lng!);

    for (let i = 1; i < candidates.length; i++) {
      const d = haversine(userLocation.lat, userLocation.lng, candidates[i].lat!, candidates[i].lng!);
      if (d < minDist) {
        minDist = d;
        nearest = candidates[i];
      }
    }

    return nearest.kommun;
  }, [isPermanent, pricingResult, rates, locations, survey?.kommun]);

  const onCheckout = (plan: "single" | "yearly") => {
    checkout(plan, { email: survey?.email || "", leadId, reportId });
  };

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

  if (!isPermanent && !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const regionName = pricingResult?.region || survey.kommun || "";

  return (
    <div className="min-h-screen bg-background">
      <TeaserHeader kommun={survey.kommun} />

      <main className="px-4 py-8 pb-40 max-w-lg mx-auto space-y-6">
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

        <EarningsBanner
          isUnderpaid={isUnderpaid}
          diffPercent={diffPercent}
          isPermanent={isPermanent}
          yrke={survey.yrke}
          kommun={survey.kommun}
          nearestHigherKommun={nearestHigherKommun}
          isAboveThreshold={isAboveThreshold}
        />

        {!isPermanent && isAboveThreshold && (
          <HighEarnerCard
            kommun={survey.kommun}
            nearestHigherKommun={nearestHigherKommun}
          />
        )}

        {!isPermanent && !isAboveThreshold && result && (
          <OpportunityGap
            userHourly={userHourly}
            marketHigh={noisedResult?.high ?? result.high}
            employmentType={survey.employmentType as "anstalld" | "foretagare"}
            nearestHigherKommun={nearestHigherKommun}
          />
        )}

        {isPermanent && benchmarkMonthly && (
          <PermanentBenchmarkCard
            userMonthly={userMonthly}
            benchmarkMonthly={benchmarkMonthly}
            unlocked={unlocked}
            partialUnlocked={partialUnlocked}
          />
        )}

        {!isPermanent && result && (
          <ConsultantVerdictCard
            isUnderpaid={isUnderpaid}
            userHourly={userHourly}
            result={noisedResult ?? result}
            unlocked={unlocked}
            partialUnlocked={partialUnlocked}
            exitIntentVisible={exitIntentVisible}
            checkoutLoading={checkoutLoading}
            onCheckout={onCheckout}
            leadId={leadId}
            referrerEmail={survey.email}
            regionName={regionName}
            onPartialUnlock={() => setPartialUnlocked(true)}
            employmentType={survey.employmentType}
          />
        )}

        <div ref={checkoutRef}>
          <CheckoutCTA checkoutLoading={checkoutLoading} onCheckout={onCheckout} variant="inline" />
        </div>

        <ReportPreviewList isPermanent={isPermanent} />
      </main>

      <CheckoutCTA checkoutLoading={checkoutLoading} onCheckout={onCheckout} variant="sticky" />

      <ReferralBottomSheet
        ctaRef={checkoutRef}
        leadId={leadId}
        referrerEmail={survey.email}
        region={regionName}
        onCheckout={onCheckout}
      />
    </div>
  );
}
