import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRates, useLocations } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import type { BenchmarkResult } from "@/hooks/useBenchmarkEngine";
import { Loader2 } from "lucide-react";

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
import PermanentBenchmarkCard from "@/components/teaser/PermanentBenchmarkCard";
import ConsultantVerdictCard from "@/components/teaser/ConsultantVerdictCard";
import ReportPreviewList from "@/shared/ReportPreviewList";
import CheckoutButtons from "@/shared/CheckoutButtons";
import StickyCheckoutBar from "@/shared/StickyCheckoutBar";
import InlineCtaLink from "@/shared/InlineCtaLink";
import ReferralBottomSheet from "@/components/teaser/ReferralBottomSheet";
import HighEarnerCard from "@/components/teaser/HighEarnerCard";

/** Teaser page — orchestrator for the results preview */
export default function Teaser() {
  const navigate = useNavigate();
  const { calculate, result: pricingResult } = usePricingEngine();
  const { data: rates } = useRates();
  const { data: locations } = useLocations();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);
  const { checkoutLoading, handleCheckout: checkout } = useCheckout();
  const [unlocked, setUnlocked] = useState(false);
  const [partialUnlocked, setPartialUnlocked] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);

  const abVariant = sessionStorage.getItem("abVariant") || "A";
  const exitIntentDelay = abVariant === "B" ? 28_000 : 22_000;
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

  const { isPermanent, result, noisedResult, benchmarkMonthly, userMonthly, userHourly, isUnderpaid, diffPercent, isAboveThreshold } =
    useTeaserData(survey, pricingResult, benchmarkResult);

  // Find nearest kommun with higher zone price (for Variant 2 messaging)
  const nearestHigherKommun = useMemo(() => {
    if (isPermanent || !pricingResult || !rates || !locations) return null;

    const currentRate = pricingResult.rate_customer_sek_per_hour;
    const currentZon = pricingResult.zon;

    // Identify matched yrkeskategori by exact rate + zone match
    const matchedRate = rates.find(
      (r) => r.zon === currentZon && r.timpris_kund === currentRate,
    );
    if (!matchedRate) return null;

    // Find same yrkeskategori + typ in higher-priced zones
    const higherRates = rates
      .filter(
        (r) =>
          r.yrkeskategori === matchedRate.yrkeskategori &&
          r.typ === matchedRate.typ &&
          r.timpris_kund > currentRate &&
          r.zon !== currentZon,
      )
      .sort((a, b) => a.timpris_kund - b.timpris_kund);

    if (!higherRates.length) return null;

    const higherZon = higherRates[0].zon;
    const higherLoc = locations.find((l) => l.zon === higherZon);
    return higherLoc?.kommun || null;
  }, [isPermanent, pricingResult, rates, locations]);

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
      <TeaserHeader kommun={survey.kommun} employmentType={survey.employmentType} />

      <main className="px-4 py-8 pb-40 max-w-lg mx-auto space-y-6">
        <OccupationInfo yrke={survey.yrke} kommun={survey.kommun} />

        <EarningsBanner
          isUnderpaid={isUnderpaid}
          diffPercent={diffPercent}
          isPermanent={isPermanent}
          yrke={survey.yrke}
          kommun={survey.kommun}
          employmentType={survey.employmentType}
          nearestHigherKommun={nearestHigherKommun}
          isAboveThreshold={isAboveThreshold}
        />

        {!isPermanent && isAboveThreshold && (
          <HighEarnerCard
            kommun={survey.kommun}
            nearestHigherKommun={nearestHigherKommun}
          />
        )}

        {!isPermanent && isUnderpaid && !isAboveThreshold && result && (
          <OpportunityGap
            userHourly={userHourly}
            marketHigh={noisedResult?.high ?? result.high}
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

        {!isPermanent && result && (
          <ConsultantVerdictCard
            abVariant={abVariant}
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

        {/* Inline CTA after bars/verdict */}
        <InlineCtaLink checkoutLoading={checkoutLoading} onCheckout={onCheckout} />

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

        <ReportPreviewList isPermanent={isPermanent} />

        <div ref={checkoutRef}>
          <CheckoutButtons checkoutLoading={checkoutLoading} onCheckout={onCheckout} layout="stacked" />
        </div>
      </main>

      <StickyCheckoutBar checkoutLoading={checkoutLoading} onCheckout={onCheckout} />

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
