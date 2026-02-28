import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRates, useLocations } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import type { BenchmarkResult } from "@/hooks/useBenchmarkEngine";
import { Card, CardContent } from "@/components/ui/card";
import { TrendingDown, Stethoscope, MapPin, Loader2 } from "lucide-react";

import SocialProofBanner from "@/components/SocialProofBanner";
import ShareButton from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { useExitIntent } from "@/hooks/useExitIntent";
import OpportunityGap from "@/components/OpportunityGap";
import MarketInsight from "@/components/MarketInsight";
import { trackEvent } from "@/lib/trackEvent";
import { useCheckout } from "@/shared/useCheckout";
import { BarRow } from "@/shared/UIComponents";
import type { BenchmarkMonthly } from "@/shared/types";

import EarningsBanner from "@/components/teaser/EarningsBanner";
import PaywallOverlay from "@/components/teaser/PaywallOverlay";
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

  const track = (survey as SurveyData & { track?: string })?.track;
  const isPermanent = track === "permanent";

  const result = pricingResult
    ? { low: pricingResult.recommended_hourly_min, high: pricingResult.recommended_hourly_max }
    : null;

  const benchmarkMonthly: BenchmarkMonthly | null = benchmarkResult ? {
    p25: benchmarkResult.percentile_25,
    p50: benchmarkResult.percentile_50,
    p75: benchmarkResult.percentile_75,
    gapPct: benchmarkResult.gap_pct ?? 0,
    category: benchmarkResult.category,
  } : null;

  const userMonthly = useMemo(() => {
    if (!survey) return 0;
    return survey.salaryType === "hourly" ? survey.currentSalary * 167 : survey.currentSalary;
  }, [survey]);

  const userHourly = useMemo(() => {
    if (!survey) return 0;
    return survey.salaryType === "hourly" ? survey.currentSalary : Math.round(survey.currentSalary / 167);
  }, [survey]);

  const isUnderpaid = isPermanent
    ? (benchmarkMonthly ? userMonthly < benchmarkMonthly.p75 : false)
    : (result ? userHourly < result.high : false);
  const diffPercent = isPermanent
    ? (benchmarkMonthly ? benchmarkMonthly.gapPct : 0)
    : (result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0);

  const onCheckout = (plan: "single" | "yearly") => {
    const leadId = sessionStorage.getItem("leadId") || "";
    const reportId = sessionStorage.getItem("reportId") || "";
    checkout(plan, { email: survey?.email || "", leadId, reportId });
  };

  if (!survey) return null;

  // Show loading while pricing engine is working (consultant track)
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
      <header className="hero-gradient py-8 px-5 text-center">
        <div className="max-w-lg mx-auto">
          <h1 className="text-2xl sm:text-3xl text-primary-foreground leading-tight">
            Din löneanalys är klar
          </h1>
          <p className="text-sm sm:text-base text-primary-foreground/80 mt-2">
            Vi har jämfört din lön med ramavtalspriserna i {survey.kommun}
          </p>
        </div>
      </header>

      <main className="px-4 py-8 pb-12 max-w-lg mx-auto space-y-6">
        {/* Persistent info */}
        <div className="flex items-center gap-3 text-sm bg-muted/50 border border-border rounded-lg px-4 py-2.5">
          <Stethoscope className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{survey.yrke}</span>
          <span className="text-muted-foreground">·</span>
          <MapPin className="w-4 h-4 text-primary shrink-0" />
          <span className="font-medium text-foreground">{survey.kommun}</span>
        </div>

        <EarningsBanner
          isUnderpaid={isUnderpaid}
          diffPercent={diffPercent}
          isPermanent={isPermanent}
          yrke={survey.yrke}
          kommun={survey.kommun}
        />

        <SocialProofBanner />

        {!isPermanent && isUnderpaid && result && (
          <OpportunityGap
            userHourly={userHourly}
            marketHigh={result.high}
            employmentType={survey.employmentType as "anstalld" | "foretagare"}
          />
        )}

        {/* Permanent track: benchmark bars */}
        {isPermanent && benchmarkMonthly && (
          <Card className="card-shadow overflow-hidden">
            <CardContent className="pt-6">
              <div className="space-y-4">
                <BarRow label="Din nuvarande månadslön" value={userMonthly} max={benchmarkMonthly.p75 + 5000} color="bg-muted-foreground/30" />
                <BarRow label="Median (P50) för din yrkesgrupp" value={benchmarkMonthly.p50} max={benchmarkMonthly.p75 + 5000} color="bg-primary" />
                <BarRow label="Övre kvartil (P75) — ditt mål" value={benchmarkMonthly.p75} max={benchmarkMonthly.p75 + 5000} color="bg-accent" blurred={!unlocked && !partialUnlocked} partialReveal={partialUnlocked && !unlocked} />
              </div>
            </CardContent>
          </Card>
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

        {/* Verdict card — consultant track */}
        {!isPermanent && result && (
          <Card className="card-shadow border-destructive/30 overflow-hidden">
            <div className="bg-destructive/10 p-4 flex items-center gap-3">
              <TrendingDown className="w-5 h-5 text-destructive" />
              <p className="font-semibold text-foreground">
                {abVariant === "B"
                  ? "Du är sannolikt underbetald enligt offentliga ramavtal."
                  : isUnderpaid
                    ? "Din lön ligger under marknadspris"
                    : "Din lön ligger nära marknadspris"}
              </p>
            </div>
            <CardContent className="pt-6">
              <PaywallOverlay
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
                abVariant={abVariant}
                isUnderpaid={isUnderpaid}
              />
            </CardContent>
          </Card>
        )}

        <ReportPreviewList isPermanent={isPermanent} />

        <ShareButton
          title="BraGig.se – Löneanalys"
          text={`Jag kollade min lön som ${survey.yrke} i ${survey.kommun} — kolla din också!`}
          url="https://bragig.se"
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
      />
    </div>
  );
}
