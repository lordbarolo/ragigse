import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useRates, useLocations } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import type { BenchmarkResult } from "@/hooks/useBenchmarkEngine";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useExitIntent } from "@/hooks/useExitIntent";
import { useTeaserData } from "@/hooks/useTeaserData";

import { trackEvent } from "@/lib/trackEvent";
import { useTimeOnPage } from "@/hooks/useTimeOnPage";
import { useCheckout } from "@/shared/useCheckout";

import TeaserHeader from "@/components/teaser/TeaserHeader";
import OccupationInfo from "@/components/teaser/OccupationInfo";
import WowHero from "@/components/teaser/WowHero";
import MarketDiagnosisCard from "@/components/teaser/MarketDiagnosisCard";
import EmailGate from "@/components/teaser/EmailGate";
import EmailHookMessage from "@/components/teaser/EmailHookMessage";
import ReportPreviewList from "@/components/teaser/ReportPreviewList";

/** Teaser page — orchestrator for the results preview */
export default function Teaser() {
  const { leadId: urlLeadId } = useParams<{ leadId: string }>();
  const [searchParams] = useSearchParams();
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
  const [email, setEmail] = useState("");
  const [emailSaving, setEmailSaving] = useState(false);
  const checkoutRef = useRef<HTMLDivElement>(null);
  const [couponDiscount, setCouponDiscount] = useState<{ discount_type: "percent" | "fixed" | "free"; discount_value: number } | null>(null);
  const couponRedeemed = useRef(false);
  const [authChecked, setAuthChecked] = useState(false);

  // Check if user is already authenticated — skip EmailGate and redirect to full report
  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // User is authenticated — find their report and redirect
        const rid = sessionStorage.getItem("reportId");
        if (rid) {
          navigate(`/rapport/${rid}`, { replace: true });
          return;
        }
        // If no reportId in session, set email so EmailGate is skipped
        setEmail(session.user.email || "");
      }
      setAuthChecked(true);
    };
    checkAuth();
  }, [navigate]);

  const exitIntentVisible = useExitIntent(28_000);
  useTimeOnPage("teaser", !!survey);
  const scrollTracked = useRef<Set<number>>(new Set());
  const paywallViewedRef = useRef(false);

  // Track paywall_viewed on mount
  useEffect(() => {
    if (survey && !paywallViewedRef.current) {
      paywallViewedRef.current = true;
      trackEvent("paywall_viewed", { role: survey.yrke, zone: survey.kommun });
      // Store paywall entry time for payment_completed
      sessionStorage.setItem("paywallEnteredAt", String(Date.now()));
    }
  }, [survey]);

  // Track paywall scroll depth (50% and 75%)
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      const pct = (scrollTop / docHeight) * 100;
      for (const threshold of [50, 75] as const) {
        if (pct >= threshold && !scrollTracked.current.has(threshold)) {
          scrollTracked.current.add(threshold);
          trackEvent("paywall_scrolled", { scroll_depth_percent: threshold });
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
          obShare: "",
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

  // ── Background retry: create report if missing (timeout fallback) ──
  const retryAttempted = useRef(false);
  useEffect(() => {
    if (!leadId || !survey || reportId || retryAttempted.current) return;
    retryAttempted.current = true;

    const retryCreateReport = async () => {
      console.log("[Teaser] reportId missing — retrying create-report in background");
      try {
        const { data, error } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId,
            occupation: survey.yrke,
            employment_type: survey.employmentType,
            kommun: survey.kommun,
            current_salary: survey.currentSalary,
            salary_type: survey.salaryType,
            track: (survey as SurveyData & { track?: string }).track || "consultant",
          },
        });
        if (!error && data?.report_id) {
          console.log("[Teaser] Background retry succeeded, reportId:", data.report_id);
          setReportId(data.report_id);
          sessionStorage.setItem("reportId", data.report_id);
        } else {
          console.warn("[Teaser] Background retry failed:", error || data);
        }
      } catch (err) {
        console.warn("[Teaser] Background retry error:", err);
      }
    };
    retryCreateReport();
  }, [leadId, survey, reportId]);

  // Check referral unlock status
  useEffect(() => {
    if (!leadId) return;
    const checkReferral = async () => {
      // Check unlock status via the report itself (referrals table is now locked down)
      const { data } = await supabase
        .from("reports").select("unlocked_by_referral").eq("lead_id", leadId).eq("unlocked_by_referral", true).limit(1);
      if (data && data.length > 0) setUnlocked(true);
    };
    checkReferral();
  }, [leadId]);

  // Validate coupon (without redeeming) to show correct UI
  useEffect(() => {
    const couponCode = searchParams.get("coupon") || sessionStorage.getItem("couponCode");
    if (!couponCode || couponRedeemed.current) return;
    couponRedeemed.current = true;

    const validateCoupon = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("validate-coupon", {
          body: { code: couponCode },
        });

        if (error || !data?.valid) {
          const errorMsg = data?.error || "Ogiltig kupongkod";
          toast({ title: errorMsg, variant: "destructive" });
          return;
        }

        setCouponDiscount({ discount_type: data.discount_type, discount_value: data.discount_value });
        toast({ title: "Kupong tillämpad!" });
      } catch {
        toast({ title: "Kunde inte verifiera kupongkoden", variant: "destructive" });
      }
    };

    validateCoupon();
  }, [searchParams]);

  const { isPermanent, result, noisedResult, benchmarkMonthly, userMonthly, userHourly, isUnderpaid, diffPercent, isAboveThreshold } =
    useTeaserData(survey, pricingResult, benchmarkResult);

  // Price A/B test: read variant from sessionStorage (set by create-report)
  const abVariant = sessionStorage.getItem("abVariant") || "price_49";
  const priceKr = abVariant === "price_29" ? 29 : 49;

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

  const isFree = couponDiscount?.discount_type === "free" ||
    (couponDiscount?.discount_type === "percent" && couponDiscount.discount_value >= 100);

  const unlockFreeReport = useCallback(async (activeReportId: string) => {
    try {
      const couponCode = searchParams.get("coupon") || sessionStorage.getItem("couponCode");
      if (couponCode) {
        const { data, error } = await supabase.functions.invoke("redeem-coupon", {
          body: { code: couponCode, report_id: activeReportId },
        });
        // 409 = already redeemed for this email — report is already unlocked, just navigate
        if (error && !data) {
          // Try to parse error context for known "already used" case
          try {
            const errBody = await (error as any)?.context?.json?.();
            if (errBody?.error?.includes("redan använt")) {
              trackEvent("free_report_unlocked", { coupon_code: couponCode, already_redeemed: true });
              navigate(`/rapport/${activeReportId}`);
              return;
            }
          } catch { /* fall through to generic error */ }
          throw error;
        }
        if (data?.error) throw new Error(data.error);
      }
      trackEvent("free_report_unlocked", { coupon_code: couponCode });
      navigate(`/rapport/${activeReportId}`);
    } catch (err: any) {
      toast({ title: err?.message || "Kunde inte öppna rapporten", variant: "destructive" });
    }
  }, [navigate, searchParams]);

  const handleEmailSubmit = async (emailValue: string) => {
    setEmailSaving(true);
    try {
      // Save email to lead + report (also creates auth user + consultant profile)
      const { error: saveErr } = await supabase.functions.invoke("save-email", {
        body: { lead_id: leadId, report_id: reportId, email: emailValue },
      });
      if (saveErr) throw saveErr;

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
        const { data: rData, error: rErr } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId,
            email: emailValue,
            occupation: survey.yrke,
            employment_type: survey.employmentType,
            kommun: survey.kommun,
            current_salary: survey.currentSalary,
            salary_type: survey.salaryType,
            track: "consultant",
          },
        });
        if (!rErr && rData?.report_id) {
          activeReportId = rData.report_id;
          setReportId(activeReportId);
          sessionStorage.setItem("reportId", activeReportId);
        }
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

    // Report is free — navigate directly to full report
    trackEvent("free_report_unlocked", { source: "email_gate" });
    navigate(`/rapport/${activeReportId}`);
  };

  const onCheckout = async (plan: "single" | "yearly") => {
    if (!email) {
      checkoutRef.current?.scrollIntoView({ behavior: "smooth" });
      return;
    }
    if (!reportId) {
      toast({ title: "Rapport saknas — ladda om sidan och försök igen", variant: "destructive" });
      return;
    }
    // Free flow — go directly to report
    navigate(`/rapport/${reportId}`);
  };

  // ── Compute email hook tier & props ──
  const emailHookProps = useMemo(() => {
    const kommun = survey?.kommun || "";
    const zon = pricingResult?.zon || "";

    const occupation = survey?.yrke || "";

    if (isPermanent) {
      if (!benchmarkMonthly) return null;
      const gap = benchmarkMonthly.p75 - userMonthly;
      const hourlyGap = Math.round(gap / 167);
      if (gap > 0) {
        return { tier: "underpaid" as const, hourlyGap, monthlyGap: gap, kommun, currentRate: userHourly, occupation };
      }
      return { tier: "above_market" as const, hourlyGap: 0, monthlyGap: 0, kommun, zon, pctEarningMore: 25, currentRate: userHourly, occupation };
    }

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
  }, [survey, isPermanent, result, pricingResult, benchmarkMonthly, userHourly, userMonthly, isUnderpaid, isAboveThreshold]);

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
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </div>
    );
  }

  const regionName = pricingResult?.region || survey.kommun || "";

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

        {/* WOW hero — immediate value proposition */}
        {isUnderpaid && !isAboveThreshold && (
          <WowHero
            diffHourly={result ? result.high - userHourly : 0}
            isPermanent={isPermanent}
            monthlyGap={benchmarkMonthly ? benchmarkMonthly.p75 - userMonthly : 0}
            kommun={survey.kommun}
          />
        )}

        {/* Market position — no blur, honest indicator */}
        <MarketDiagnosisCard
          diffPercent={diffPercent}
          isPermanent={isPermanent}
          yrke={survey.yrke}
          kommun={survey.kommun}
          isAboveThreshold={isAboveThreshold}
          emailProvided={false}
        />

        {/* Email Gate — primary CTA at top */}
        {!email && (
          <div className="rounded-xl bg-foreground/[0.02] p-5">
            {emailHookProps && <EmailHookMessage {...emailHookProps} />}
            <EmailGate
              onEmailSubmit={handleEmailSubmit}
              loading={emailSaving}
            />
          </div>
        )}

        {/* What's in the report — honest preview */}
        <div className="rounded-xl bg-foreground/[0.02] p-5">
          <ReportPreviewList
            isPermanent={isPermanent}
            yrke={survey.yrke}
          />
        </div>

        {/* Second CTA at the bottom for those who scrolled */}
        {!email && (
          <div className="rounded-xl border border-primary/20 bg-card p-5 card-shadow">
            {emailHookProps && <EmailHookMessage {...emailHookProps} />}
            <EmailGate
              onEmailSubmit={handleEmailSubmit}
              loading={emailSaving}
            />
          </div>
        )}
      </main>
    </div>
  );
}
