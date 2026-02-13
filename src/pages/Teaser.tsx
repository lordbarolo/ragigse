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

  useEffect(() => {
    const raw = sessionStorage.getItem("surveyData");
    if (!raw) {
      navigate("/");
      return;
    }
    setSurvey(JSON.parse(raw));
  }, [navigate]);

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
    return Math.round(survey.currentSalary / 165);
  }, [survey]);

  const isUnderpaid = result ? userHourly < result.high : false;
  const diffPercent = result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0;

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
              {isUnderpaid
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
                  blurred={!unlocked}
                />
                <BarRow
                  label="Rekommenderad lön"
                  value={result.low}
                  max={result.high + 50}
                  color="bg-accent"
                  blurred
                />
              </div>

              {/* Blur overlay — only on fully locked rows */}
              {!unlocked && (
                <div className="absolute inset-0 top-[60px] flex items-center justify-center">
                  <div className="backdrop-blur-md bg-card/60 rounded-xl p-6 text-center border border-border card-shadow">
                    <Lock className="w-8 h-8 text-primary mx-auto mb-2" />
                    <p className="font-semibold text-foreground text-sm">Lås upp full analys</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Se exakta siffror och förhandlingstips
                    </p>
                  </div>
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
            onClick={() => navigate("/rapport")}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base hero-gradient text-primary-foreground card-shadow-hover transition-all"
          >
            Köp rapport — 49 kr
            <ArrowRight className="w-5 h-5" />
          </button>
          <button
            onClick={() => navigate("/rapport")}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all"
          >
            Årsabonnemang — 495 kr/år
          </button>
          <p className="text-center text-xs text-muted-foreground">
            Engångsbetalning · Ingen bindningstid · Stripe säker betalning
          </p>
        </div>
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

function BarRow({
  label,
  value,
  max,
  color,
  blurred = false,
}: {
  label: string;
  value: number;
  max: number;
  color: string;
  blurred?: boolean;
}) {
  const width = Math.min((value / max) * 100, 100);
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={`font-semibold ${blurred ? "blur-sm select-none" : "text-foreground"}`}>
          {value} kr/h
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
