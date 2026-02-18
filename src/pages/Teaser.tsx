import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { usePricingEngine, type PricingResult } from "@/hooks/usePricingEngine";
import { useRates } from "@/hooks/useCalculator";
import type { SurveyData } from "@/components/Survey";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Lock, TrendingDown, ArrowRight, ShieldCheck, Users, CheckCircle, Copy } from "lucide-react";

import SocialProofBanner from "@/components/SocialProofBanner";
import ShareButton from "@/components/ShareButton";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useExitIntent } from "@/hooks/useExitIntent";
import ExitIntentReferral from "@/components/ExitIntentReferral";
import OpportunityGap from "@/components/OpportunityGap";
import MarketInsight from "@/components/MarketInsight";
import { trackEvent } from "@/lib/trackEvent";

/* ── Helpers ───────────────────────────────────────────── */

/** Replace zeros in the last 3 digits with 1 to avoid trailing zeros */
function ensureNoTrailingZeros(value: number): number {
  const chars = String(value).split("");
  for (let i = Math.max(0, chars.length - 3); i < chars.length; i++) {
    if (chars[i] === "0") chars[i] = "1";
  }
  return parseInt(chars.join(""), 10);
}

/** Show digits at positions 0, 2, 3, 4 (1-indexed: 1st, 3rd, 4th, 5th). Mask 2nd digit. */
function formatPartialValue(value: number): string {
  const adjusted = ensureNoTrailingZeros(value);
  const chars = String(adjusted).split("");
  if (chars.length > 1) chars[1] = "X";
  const result = chars.join("");
  if (result.length > 3) {
    return result.slice(0, -3) + " " + result.slice(-3);
  }
  return result;
}

/* ── Main component ────────────────────────────────────── */

export default function Teaser() {
  const navigate = useNavigate();
  const { calculate, result: pricingResult, loading: pricingLoading } = usePricingEngine();
  const { data: rates } = useRates();
  const [survey, setSurvey] = useState<SurveyData | null>(null);
  const [referralOpen, setReferralOpen] = useState(false);
  const [refereeEmail, setRefereeEmail] = useState("");
  const [referralSending, setReferralSending] = useState(false);
  const [referralLink, setReferralLink] = useState<string | null>(null);
  const [unlocked, setUnlocked] = useState(false);
  const [partialUnlocked, setPartialUnlocked] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const abVariant = sessionStorage.getItem("abVariant") || "A";
  const exitIntentDelay = abVariant === "B" ? 18_000 : 12_000;
  const exitIntentVisible = useExitIntent(exitIntentDelay);

  useEffect(() => {
    const raw = sessionStorage.getItem("surveyData");
    if (!raw) {
      navigate("/");
      return;
    }
    const parsed = JSON.parse(raw) as SurveyData;
    setSurvey(parsed);
    trackEvent("teaser_viewed");

    // Variant B: show partial unlock immediately
    if (abVariant === "B") {
      setPartialUnlocked(true);
    }

    // Call pricing-engine for server-side calculation — only for consultant track
    const savedTrack = (parsed as SurveyData & { track?: string }).track;
    if (parsed.yrke && parsed.kommun && savedTrack !== "permanent") {
      calculate(parsed.yrke, parsed.kommun, parsed.employmentType);
    }
  }, [navigate, abVariant]);

  // Check if referral was already confirmed for this lead
  useEffect(() => {
    const leadId = sessionStorage.getItem("leadId");
    if (!leadId) return;

    const checkReferral = async () => {
      const { data } = await supabase
        .from("referrals")
        .select("clicked")
        .eq("lead_id", leadId)
        .eq("clicked", true)
        .limit(1);

      if (data && data.length > 0) {
        setUnlocked(true);
      }
    };
    checkReferral();
  }, []);

  // Derive result from pricing-engine
  const result = pricingResult
    ? { low: pricingResult.recommended_hourly_min, high: pricingResult.recommended_hourly_max }
    : null;

  const userHourly = useMemo(() => {
    if (!survey) return 0;
    if (survey.salaryType === "hourly") return survey.currentSalary;
    return Math.round(survey.currentSalary / 167);
  }, [survey]);

  const isUnderpaid = result ? userHourly < result.high : false;
  const diffPercent = result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0;

  const buildResultJson = () => {
    if (!pricingResult || !survey) return null;
    const currentMonthly = survey.salaryType === "hourly"
      ? survey.currentSalary * pricingResult.hours_per_month
      : survey.currentSalary;

    return {
      calc_version: "v1",
      inputs: {
        location: survey.kommun,
        occupation: survey.yrke,
        employment_type: survey.employmentType,
        experience_years: survey.experience,
        current_salary_sek: survey.currentSalary,
        salary_type: survey.salaryType,
      },
      market: {
        rate_customer_sek_per_hour: pricingResult.rate_customer_sek_per_hour,
      },
      recommendation: {
        consultant_share_min: pricingResult.consultant_share_min,
        consultant_share_max: pricingResult.consultant_share_max,
        employee_factor: pricingResult.employee_factor,
        recommended_hourly_min: pricingResult.recommended_hourly_min,
        recommended_hourly_max: pricingResult.recommended_hourly_max,
        recommended_monthly_min: pricingResult.recommended_monthly_min,
        recommended_monthly_max: pricingResult.recommended_monthly_max,
        hours_per_month: pricingResult.hours_per_month,
      },
      delta: {
        monthly_vs_current_min: pricingResult.recommended_monthly_min - currentMonthly,
        monthly_vs_current_max: pricingResult.recommended_monthly_max - currentMonthly,
      },
    };
  };

  const handleCheckout = async (plan: "single" | "yearly") => {
    const leadId = sessionStorage.getItem("leadId");
    const existingReportId = sessionStorage.getItem("reportId");
    if (!survey?.email) return;
    setCheckoutLoading(plan);
    trackEvent("checkout_started", { plan });
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan,
          email: survey.email,
          lead_id: leadId,
          report_id: existingReportId || "",
        },
      });
      if (error) throw error;
      if (data?.url) {
        if (data.report_id) {
          sessionStorage.setItem("reportId", data.report_id);
        }
        window.open(data.url, "_blank");
      }
    } catch {
      toast({ title: "Kunde inte starta betalning, försök igen", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  const handleSendReferral = async () => {
    const leadId = sessionStorage.getItem("leadId");
    if (!leadId || !refereeEmail || !survey) return;

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(refereeEmail)) {
      toast({ title: "Ange en giltig e-postadress", variant: "destructive" });
      return;
    }

    setReferralSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-referral", {
        body: {
          lead_id: leadId,
          referrer_email: survey.email,
          referee_email: refereeEmail,
        },
      });

      if (error) throw error;

      setReferralLink(data.confirm_link);
      trackEvent("referral_sent");
      toast({ title: "Länk skapad! När din kollega klickar på den låses en lightrapport upp för dig." });
    } catch {
      toast({ title: "Något gick fel, försök igen", variant: "destructive" });
    } finally {
      setReferralSending(false);
    }
  };

  const copyLink = () => {
    if (referralLink) {
      navigator.clipboard.writeText(referralLink);
      toast({ title: "Länk kopierad!" });
    }
  };

  if (!survey || !result) return null;

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

      <main className="px-4 py-8 pb-32 max-w-lg mx-auto space-y-6">
        {/* Top-level earnings potential banner */}
        {isUnderpaid && diffPercent > 0 && (
          <div className="hero-gradient rounded-2xl p-5 text-center card-shadow">
            <p className="text-primary-foreground/80 text-sm font-medium">Enligt ramavtalen kan du tjäna</p>
            <p className="text-3xl sm:text-4xl font-bold font-display text-primary-foreground mt-1">
              upp till {diffPercent}% mer
            </p>
            <p className="text-primary-foreground/70 text-xs mt-2">
              Baserat på offentliga ramavtalspriser för {survey.yrke} i {survey.kommun}
            </p>
          </div>
        )}

        {/* Social proof */}
        <SocialProofBanner occupation={survey.yrke || undefined} />


        {/* Opportunity Gap */}
        {isUnderpaid && (
          <OpportunityGap
            userHourly={userHourly}
            marketHigh={result.high}
            employmentType={survey.employmentType as "anstalld" | "foretagare"}
          />
        )}

        {/* Market Insight – zone comparison */}
        {rates && pricingResult && (
          <MarketInsight
            occupation={survey.yrke}
            currentZone={pricingResult.zon}
            rates={rates}
            employmentType={survey.employmentType as "anstalld" | "foretagare"}
          />
        )}

        {/* Verdict card */}
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
            <div className="relative">
              <div className="space-y-4">
                <BarRow
                  label="Din nuvarande lön"
                  value={userHourly}
                  max={result.high + 50}
                  color="bg-muted-foreground/30"
                />
                <BarRow
                  label="Marknadspris (ramavtal)"
                  value={result.high}
                  max={result.high + 50}
                  color="bg-primary"
                  blurred={true}
                />
                <BarRow
                  label="Rekommenderad lön"
                  value={result.low}
                  max={result.high + 50}
                  color="bg-accent"
                  blurred={!unlocked && !partialUnlocked}
                  partialReveal={partialUnlocked && !unlocked}
                />
              </div>

              {/* Blur overlay / exit-intent inline referral */}
              {!unlocked && !partialUnlocked && (
                <div className="absolute inset-0 top-[60px] flex items-center justify-center">
                  {!exitIntentVisible ? (
                    <div className="backdrop-blur-md bg-card/60 rounded-xl p-6 text-center border border-border card-shadow max-w-xs w-full">
                      <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                      <p className="font-semibold text-foreground text-sm">Lås upp full analys</p>
                      <p className="text-xs text-muted-foreground mt-1 mb-4">
                        Se exakta siffror och förhandlingstips
                      </p>
                      <button
                        data-cta
                        disabled={checkoutLoading !== null}
                        onClick={() => handleCheckout("single")}
                        className="w-full flex items-center justify-center gap-2 py-3 rounded-lg font-semibold text-sm hero-gradient text-primary-foreground transition-all disabled:opacity-70"
                      >
                        {checkoutLoading === "single" ? "Laddar..." : "Köp rapport — 49 kr"}
                        {checkoutLoading !== "single" && <ArrowRight className="w-4 h-4" />}
                      </button>
                      <button
                        data-cta
                        disabled={checkoutLoading !== null}
                        onClick={() => handleCheckout("yearly")}
                        className="w-full flex items-center justify-center gap-2 py-2.5 mt-2 rounded-lg font-medium text-xs border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-70"
                      >
                        {checkoutLoading === "yearly" ? "Laddar..." : "Årsabonnemang — 495 kr/år"}
                      </button>
                    </div>
                  ) : (
                    <div className="backdrop-blur-md bg-card/80 rounded-xl p-3 border border-accent/30 card-shadow w-full animate-fade-in">
                      <ExitIntentReferral
                        visible={true}
                        leadId={leadId}
                        referrerEmail={survey.email}
                        region={regionName}
                        onUnlocked={() => setPartialUnlocked(true)}
                        inline
                      />
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Unlocked partial result */}
            {unlocked && (
              <div className="mt-4 p-3 rounded-lg bg-accent/10 border border-accent/20">
                <div className="flex items-center gap-2 mb-1">
                  <CheckCircle className="w-4 h-4 text-accent" />
                  <span className="text-sm font-semibold text-foreground">Upplåst via referens</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Marknadspriset visas. Köp rapporten för fullständig analys med förhandlingstips.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* What's included */}
        <Card className="card-shadow">
          <CardContent className="pt-6 space-y-3">
            <h3 className="font-display text-lg text-foreground">I din rapport får du:</h3>
            <ul className="space-y-2 text-sm">
              {[
                "Exakt beräknad bruttolön baserat på ramavtal",
                "Jämförelse mot andra regioner och zoner",
                "Lista på godkända leverantörer",
                "Förhandlingsrekommendationer",
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-accent mt-0.5 shrink-0" />
                  <span className="text-muted-foreground">{item}</span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {/* Share button */}
        <ShareButton
          title="BraGig.se – Löneanalys"
          text={`Jag kollade min lön som ${survey.yrke} i ${survey.kommun} — kolla din också!`}
          url="https://bragig.se"
          className="w-full"
        />


        {/* Referral CTA */}
        <Card className="card-shadow border-accent/30">
          <CardContent className="pt-6 space-y-3">
          <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <h3 className="font-display text-lg text-foreground">Lås upp konsultlönen — gratis</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Genom att tipsa en kollega om sidan låser du upp rapporten som visar vad konsulter tjänar i samma roll.
            </p>
            <Button
              onClick={() => setReferralOpen(true)}
              variant="outline"
              className="w-full border-accent text-accent hover:bg-accent/5"
            >
              <Users className="w-4 h-4 mr-2" />
              Tipsa en kollega
            </Button>
          </CardContent>
        </Card>
      </main>

      {/* Sticky bottom CTAs — thumb zone */}
      <div className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-sm border-t border-border p-3 z-40 safe-area-bottom">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            data-cta
            disabled={checkoutLoading !== null}
            onClick={() => handleCheckout("single")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm hero-gradient text-primary-foreground transition-all disabled:opacity-70"
          >
            {checkoutLoading === "single" ? "Laddar..." : "49 kr"}
            {checkoutLoading !== "single" && <ArrowRight className="w-4 h-4" />}
          </button>
          <button
            data-cta
            disabled={checkoutLoading !== null}
            onClick={() => handleCheckout("yearly")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-medium text-sm border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-70"
          >
            {checkoutLoading === "yearly" ? "Laddar..." : "495 kr/år"}
          </button>
        </div>
      </div>

      {/* Referral Dialog */}
      <Dialog open={referralOpen} onOpenChange={setReferralOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipsa en kollega</DialogTitle>
            <DialogDescription>
              Ange din kollegas e-postadress. När hen klickar på länken låser vi upp en gratis lightrapport åt dig.
            </DialogDescription>
          </DialogHeader>

          {!referralLink ? (
            <div className="space-y-4">
              <Input
                type="email"
                placeholder="kollegans@email.se"
                value={refereeEmail}
                onChange={(e) => setRefereeEmail(e.target.value)}
              />
              <Button
                onClick={handleSendReferral}
                disabled={referralSending || !refereeEmail}
                className="w-full"
              >
                {referralSending ? "Skickar..." : "Skapa referenslänk"}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-accent shrink-0" />
                <p className="text-sm text-foreground font-medium">Länken är redo!</p>
              </div>
              <div className="flex gap-2">
                <Input value={referralLink} readOnly className="text-xs" />
                <Button variant="outline" size="icon" onClick={copyLink}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Skicka länken till din kollega. När hen klickar på den låses en lightrapport upp åt dig.
              </p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

/* ── BarRow sub-component ──────────────────────────────── */

function BarRow({
  label,
  value,
  max,
  color,
  blurred = false,
  partialReveal = false,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  blurred?: boolean;
  partialReveal?: boolean;
}) {
  const width = Math.min((value / max) * 100, 100);

  let displayValue: string;
  if (partialReveal) {
    displayValue = formatPartialValue(value) + " kr/h";
  } else {
    displayValue = value + " kr/h";
  }

  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span
          className={`font-semibold ${
            blurred ? "blur-sm select-none" : "text-foreground"
          }`}
        >
          {displayValue}
        </span>
      </div>
      <div className="h-6 bg-secondary rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-700 ${color}`}
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}
