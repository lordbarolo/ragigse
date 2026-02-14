import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useLocations, useRates, calculateResult } from "@/hooks/useCalculator";
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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useExitIntent } from "@/hooks/useExitIntent";
import ExitIntentReferral from "@/components/ExitIntentReferral";
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
  const { data: locations } = useLocations();
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
    setSurvey(JSON.parse(raw));
    trackEvent("teaser_viewed");

    // Variant B: show partial unlock immediately
    if (abVariant === "B") {
      setPartialUnlocked(true);
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

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.kommun === survey?.kommun),
    [locations, survey]
  );

  const selectedRate = useMemo(() => {
    if (!rates || !selectedLocation || !survey) return null;
    const zoneRates = rates.filter((r) => r.zon === selectedLocation.zon);
    const exact = zoneRates.find((r) => r.yrkeskategori === survey.yrke);
    if (exact) return exact;
    const selectedRateFull = rates.find((r) => r.yrkeskategori === survey.yrke);
    if (!selectedRateFull) return null;
    return zoneRates.find((r) => r.typ === selectedRateFull.typ) || null;
  }, [rates, selectedLocation, survey]);

  const result = useMemo(() => {
    if (!selectedRate || !survey) return null;
    return calculateResult(selectedRate.timpris_kund, survey.employmentType);
  }, [selectedRate, survey]);

  const userHourly = useMemo(() => {
    if (!survey) return 0;
    if (survey.salaryType === "hourly") return survey.currentSalary;
    return Math.round(survey.currentSalary / 167);
  }, [survey]);

  const isUnderpaid = result ? userHourly < result.high : false;
  const diffPercent = result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0;

  const buildResultJson = () => {
    if (!result || !survey || !selectedRate) return null;
    const hoursPerMonth = 167;
    const isEmployee = survey.employmentType === "anstalld";
    const shareMin = isEmployee ? 0.85 : 0.85;
    const shareMax = isEmployee ? 0.90 : 0.90;
    const factor = isEmployee ? 1.42 : 1;
    const recommendedHourlyMin = Math.round((selectedRate.timpris_kund * shareMin) / factor);
    const recommendedHourlyMax = Math.round((selectedRate.timpris_kund * shareMax) / factor);
    const recommendedMonthlyMin = recommendedHourlyMin * hoursPerMonth;
    const recommendedMonthlyMax = recommendedHourlyMax * hoursPerMonth;
    const currentMonthly = survey.salaryType === "hourly"
      ? survey.currentSalary * hoursPerMonth
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
        rate_customer_sek_per_hour: selectedRate.timpris_kund,
      },
      recommendation: {
        consultant_share_min: shareMin,
        consultant_share_max: shareMax,
        employee_factor: factor,
        recommended_hourly_min: recommendedHourlyMin,
        recommended_hourly_max: recommendedHourlyMax,
        recommended_monthly_min: recommendedMonthlyMin,
        recommended_monthly_max: recommendedMonthlyMax,
        hours_per_month: hoursPerMonth,
      },
      delta: {
        monthly_vs_current_min: recommendedMonthlyMin - currentMonthly,
        monthly_vs_current_max: recommendedMonthlyMax - currentMonthly,
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
      toast({ title: "Referens skapad! Dela länken med din kollega." });
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
  const regionName = selectedLocation?.region || survey.kommun || "";

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

      <main className="px-4 py-8 max-w-lg mx-auto space-y-6">
        {/* Verdict card */}
        <Card className="card-shadow border-destructive/30 overflow-hidden">
          <div className="bg-destructive/10 p-4 flex items-center gap-3">
            <TrendingDown className="w-5 h-5 text-destructive" />
            <p className="font-semibold text-foreground">
              {abVariant === "B"
                ? "Du är sannolikt underbetald enligt offentliga ramavtal."
                : isUnderpaid
                  ? `Du kan tjäna upp till ${diffPercent}% mer`
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

        {/* CTA buttons */}
        <div className="space-y-3">
          <button
            data-cta
            disabled={checkoutLoading !== null}
            onClick={() => handleCheckout("single")}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base hero-gradient text-primary-foreground card-shadow-hover transition-all disabled:opacity-70"
          >
            {checkoutLoading === "single" ? "Laddar..." : "Köp rapport — 49 kr"}
            {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
          </button>
          <button
            data-cta
            disabled={checkoutLoading !== null}
            onClick={() => handleCheckout("yearly")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-70"
          >
            {checkoutLoading === "yearly" ? "Laddar..." : "Årsabonnemang — 495 kr/år"}
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Engångsbetalning · Ingen bindningstid · Stripe säker betalning
          </p>
        </div>


        {/* Referral CTA */}
        <Card className="card-shadow border-accent/30">
          <CardContent className="pt-6 space-y-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-accent" />
              <h3 className="font-display text-lg text-foreground">Tipsa en kollega — lås upp gratis</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Skicka länken till en kollega. När hen klickar på den låser vi upp marknadspriset för dig — helt gratis.
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

      {/* Referral Dialog */}
      <Dialog open={referralOpen} onOpenChange={setReferralOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tipsa en kollega</DialogTitle>
            <DialogDescription>
              Ange din kollegas e-postadress. När hen klickar på länken låser vi upp marknadspriset i din rapport.
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
                Skicka länken till din kollega. När hen klickar på den låses marknadspriset upp i din rapport.
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
