import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRates, useLocations } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import type { BenchmarkResult } from "@/hooks/useBenchmarkEngine";
import { Loader2 } from "lucide-react";

import ShareButton from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { useExitIntent } from "@/hooks/useExitIntent";
import OpportunityGap from "@/components/OpportunityGap";
import MarketInsight from "@/components/MarketInsight";
import { trackEvent } from "@/lib/trackEvent";
import { useCheckout } from "@/shared/useCheckout";
import { useTeaserData } from "@/hooks/useTeaserData";

import TeaserHeader from "@/components/teaser/TeaserHeader";
import OccupationInfo from "@/components/teaser/OccupationInfo";
import EarningsBanner from "@/components/teaser/EarningsBanner";
import GapCard from "@/components/teaser/GapCard";
import PermanentBenchmarkCard from "@/components/teaser/PermanentBenchmarkCard";
import ConsultantVerdictCard from "@/components/teaser/ConsultantVerdictCard";
import ReferralDialog from "@/components/teaser/ReferralDialog";
import ReferralCta from "@/components/teaser/ReferralCta";
import ReportPreviewList from "@/shared/ReportPreviewList";
import CheckoutButtons from "@/shared/CheckoutButtons";

/** Teaser page — orchestrator for the results preview */
export default function Teaser() {
  const navigate = useNavigate();
  const { calculate, result: pricingResult } = usePricingEngine();
  const { data: rates } = useRates();
  const { data: locations } = useLocations();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [unlocked, setUnlocked] = useState(false);
  const [partialUnlocked, setPartialUnlocked] = useState(false);
  const { checkoutLoading, handleCheckout: checkout } = useCheckout();

  const abVariant = sessionStorage.getItem("abVariant") || "A";
  const exitIntentDelay = abVariant === "B" ? 18_000 : 12_000;
  const exitIntentVisible = useExitIntent(exitIntentDelay);

  useEffect(() => {
    const raw = sessionStorage.getItem("surveyData");
    if (!raw) { navigate("/"); return; }
    const parsed = JSON.parse(raw) as SurveyData;
    setSurvey(parsed);
    trackEvent("teaser_viewed");

    const savedBenchmark = sessionStorage.getItem("benchmarkResult");
    if (savedBenchmark) setBenchmarkResult(JSON.parse(savedBenchmark) as BenchmarkResult);

    if (abVariant === "B") setPartialUnlocked(true);

    const savedTrack = (parsed as SurveyData & { track?: string }).track;
    if (parsed.yrke && parsed.kommun && parsed.employmentType && savedTrack !== "permanent") {
      calculate(parsed.yrke, parsed.kommun, parsed.employmentType as "anstalld" | "foretagare");
    }
  }, [navigate, abVariant]);

  useEffect(() => {
    const leadId = sessionStorage.getItem("leadId");
    if (!leadId) return;
    const checkReferral = async () => {
      const { data } = await supabase
        .from("referrals").select("clicked").eq("lead_id", leadId).eq("clicked", true).limit(1);
      if (data && data.length > 0) setUnlocked(true);
    };
    checkReferral();
  }, []);

  const { isPermanent, result, benchmarkMonthly, userMonthly, userHourly, isUnderpaid, diffPercent } =
    useTeaserData(survey, pricingResult, benchmarkResult);

  const onCheckout = (plan: "single" | "yearly") => {
    const leadId = sessionStorage.getItem("leadId") || "";
    const reportId = sessionStorage.getItem("reportId") || "";
    checkout(plan, { email: survey?.email || "", leadId, reportId });
  };

  if (!survey) return null;

  if (!isPermanent && !result) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  const leadId = sessionStorage.getItem("leadId") || "";
  const regionName = pricingResult?.region || survey.kommun || "";

  return (
    <div className="min-h-screen bg-background">
      <TeaserHeader kommun={survey.kommun} />

      <main className="px-4 py-8 pb-12 max-w-lg mx-auto space-y-6">
        <OccupationInfo yrke={survey.yrke} kommun={survey.kommun} />

        <EarningsBanner
          isUnderpaid={isUnderpaid}
          diffPercent={diffPercent}
          isPermanent={isPermanent}
          yrke={survey.yrke}
          kommun={survey.kommun}
        />

        <GapCard
          diffPercent={diffPercent}
          userHourly={userHourly}
          marketHigh={result?.high ?? 0}
          marketMax={undefined}
          yrke={survey.yrke}
          isPermanent={isPermanent}
          userMonthly={userMonthly}
          benchmarkP50={benchmarkMonthly?.p50}
        />

        

        {!isPermanent && isUnderpaid && result && (
          <OpportunityGap
            userHourly={userHourly}
            marketHigh={result.high}
            employmentType={survey.employmentType as "anstalld" | "foretagare"}
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

        {!isPermanent && rates && pricingResult && (
          <MarketInsight
            occupation={survey.yrke}
            currentZone={pricingResult.zon}
            rates={rates}
            employmentType={survey.employmentType as "anstalld" | "foretagare"}
            locations={locations}
            currentRegion={pricingResult.region}
          />
        )}

        {!isPermanent && result && (
          <ConsultantVerdictCard
            abVariant={abVariant}
            isUnderpaid={isUnderpaid}
            userHourly={userHourly}
            result={result}
            unlocked={unlocked}
            partialUnlocked={partialUnlocked}
            exitIntentVisible={exitIntentVisible}
            checkoutLoading={checkoutLoading}
            onCheckout={onCheckout}
            leadId={leadId}
            referrerEmail={survey.email}
            regionName={regionName}
            onPartialUnlock={() => setPartialUnlocked(true)}
          />
        )}

        <ReportPreviewList isPermanent={isPermanent} />

        <ShareButton
          title="CompCare.se – Löneanalys"
          text={`Jag kollade min lön som ${survey.yrke} i ${survey.kommun} — kolla din också!`}
          url="https://compcare.se"
          className="w-full"
        />

        <ReferralCta onOpen={() => setReferralOpen(true)} />
      </main>

      <CheckoutButtons checkoutLoading={checkoutLoading} onCheckout={onCheckout} layout="stacked" />

      <ReferralDialog
        open={referralOpen}
        onOpenChange={setReferralOpen}
        leadId={leadId}
        referrerEmail={survey.email}
        region={regionName}
      />
    </div>
  );
}
