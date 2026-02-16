import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocations, useRates } from "@/hooks/useCalculator";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Stethoscope, Clock, MapPin, Mail,
  ChevronRight, ChevronLeft, ArrowRight, Loader2, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";

export interface SurveyData {
  email: string;
  employmentType: "anstalld" | "foretagare";
  yrke: string;
  kommun: string;
  experience: number;
  salaryType: "hourly" | "monthly";
  currentSalary: number;
}

const TOTAL_STEPS = 6;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmployerType = "region_kommun" | "privat" | "inhyrd" | "";
type CommuteType = "veckovis" | "dagligen" | "inte_alls" | "";

export default function Survey() {
  const navigate = useNavigate();
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: rates, isLoading: ratesLoading } = useRates();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(0);
  const [data, setData] = useState<SurveyData>({
    email: "",
    employmentType: "anstalld",
    kommun: "",
    yrke: "",
    experience: 5,
    salaryType: "hourly",
    currentSalary: 0,
  });
  const [employer, setEmployer] = useState<EmployerType>("");
  const [commute, setCommute] = useState<CommuteType>("");
  const [miniStep, setMiniStep] = useState(0); // 0 = employer question, 1 = commute question, 2 = done/spinner

  const uniqueYrken = useMemo(() => {
    if (!rates) return [];
    const seen = new Set<string>();
    return rates.filter((r) => {
      if (seen.has(r.yrkeskategori)) return false;
      seen.add(r.yrkeskategori);
      return true;
    });
  }, [rates]);

  const isLoading = locLoading || ratesLoading;

  // Derive employment type from employer mini-question
  const derivedEmploymentType = employer === "inhyrd" ? "foretagare" as const : "anstalld" as const;

  const { calculate: pricingCalculate, result: pricingResult, loading: pricingLoading } = usePricingEngine();

  // Trigger pricing-engine when we have enough data and employer is selected
  useEffect(() => {
    if (data.yrke && data.kommun && employer) {
      pricingCalculate(data.yrke, data.kommun, derivedEmploymentType);
    }
  }, [data.yrke, data.kommun, employer]);

  const partialResult = pricingResult
    ? {
        low: pricingResult.recommended_hourly_min,
        high: pricingResult.recommended_hourly_max,
        timpris: pricingResult.rate_customer_sek_per_hour,
      }
    : null;

  // Auto-advance from "Vi räknar..." step (step 3) after mini questions done
  useEffect(() => {
    if (step === 3 && miniStep === 2) {
      const timer = setTimeout(() => setStep(4), 1800);
      return () => clearTimeout(timer);
    }
  }, [step, miniStep]);

  // Reset mini step when entering step 3
  useEffect(() => {
    if (step === 3) {
      setMiniStep(0);
    }
  }, [step]);

  const canProceed = (() => {
    switch (step) {
      case 0: return !!data.yrke;         // Yrkesroll
      case 1: return true;                // Erfarenhet (slider always has value)
      case 2: return !!data.kommun;       // Ort
      case 3: return false;               // "Vi räknar..." – auto-advances
      case 4: return true;                // Visa intervall
      case 5: return EMAIL_REGEX.test(data.email.trim()); // E-post
      default: return false;
    }
  })();

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      if (step === 0) trackEvent("survey_started");
      trackEvent("survey_step_completed", { step: step + 1 });
      setStep(step + 1);
    } else {
      // Save lead and create report, then navigate to report
      setSaving(true);
      try {
        const leadId = crypto.randomUUID();
        const { error } = await supabase.from("leads").insert({
          id: leadId,
          email: data.email.trim().toLowerCase(),
          employment_type: derivedEmploymentType,
          yrke: data.yrke,
          kommun: data.kommun,
          experience: data.experience,
          salary_type: data.salaryType,
          current_salary: data.currentSalary,
        });
        if (error) throw error;

        const { data: reportData, error: reportError } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId,
            email: data.email.trim().toLowerCase(),
            occupation: data.yrke,
            employment_type: derivedEmploymentType,
            kommun: data.kommun,
            experience: data.experience,
            current_salary: data.currentSalary,
            salary_type: data.salaryType,
          },
        });

        if (reportError || !reportData?.report_id) {
          throw new Error("Failed to create report");
        }

        sessionStorage.setItem("leadId", leadId);
        sessionStorage.setItem("reportId", reportData.report_id);
        sessionStorage.setItem("surveyData", JSON.stringify(data));
        if (reportData.ab_variant) {
          sessionStorage.setItem("abVariant", reportData.ab_variant);
        }
        trackEvent("survey_completed");
        navigate("/resultat");
      } catch {
        toast.error("Kunde inte spara dina uppgifter. Försök igen.");
        setSaving(false);
        return;
      }
    }
  };

  const handleBack = () => {
    if (step === 4) setStep(2); // Skip "Vi räknar..." when going back
    else if (step > 0) setStep(step - 1);
  };

  const progress = ((step + 1) / TOTAL_STEPS) * 100;

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Steg {step + 1} av {TOTAL_STEPS}</span>
          <span>{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-secondary rounded-full overflow-hidden">
          <div
            className="h-full hero-gradient rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Step content */}
      <div className="min-h-[280px] flex flex-col">
        {/* Step 0: Yrkesroll */}
        {step === 0 && (
          <StepWrapper
            icon={<Stethoscope className="w-6 h-6" />}
            title="Vad jobbar du som?"
            subtitle="Välj din yrkeskategori"
          >
            <SearchableSelect
              value={data.yrke}
              onValueChange={(v) => setData({ ...data, yrke: v })}
              placeholder={isLoading ? "Laddar..." : "Välj yrkeskategori"}
              options={uniqueYrken.map((r) => {
                const yk = r.yrkeskategori.toLowerCase();
                const group = yk.includes("läkare") || yk === "legitimerad läkare"
                  ? "Läkare"
                  : yk.includes("sjuksköterska") || yk === "barnmorska" || yk === "distriktssjuksköterska" || yk === "skolsköterska" || yk === "röntgensjuksköterska"
                    ? "Sjuksköterska"
                    : "Övriga";
                return {
                  value: r.yrkeskategori,
                  label: r.detaljer || r.yrkeskategori,
                  group,
                };
              })}
            />
          </StepWrapper>
        )}

        {/* Step 1: Erfarenhet */}
        {step === 1 && (
          <StepWrapper
            icon={<Clock className="w-6 h-6" />}
            title="Hur lång erfarenhet har du?"
            subtitle="Dra i reglaget"
          >
            <div className="space-y-8">
              <div className="text-center">
                <span className="text-5xl font-bold font-display text-foreground">
                  {data.experience}
                </span>
                <span className="text-xl text-muted-foreground ml-2">år</span>
              </div>
              <Slider
                value={[data.experience]}
                onValueChange={([v]) => setData({ ...data, experience: v })}
                min={0}
                max={30}
                step={1}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>0 år</span>
                <span>15 år</span>
                <span>30+ år</span>
              </div>
            </div>
          </StepWrapper>
        )}

        {/* Step 2: Ort */}
        {step === 2 && (
          <StepWrapper
            icon={<MapPin className="w-6 h-6" />}
            title="Var jobbar du?"
            subtitle="Välj din arbetsort"
          >
            <Select value={data.kommun} onValueChange={(v) => setData({ ...data, kommun: v })}>
              <SelectTrigger className="h-14 text-base">
                <SelectValue placeholder={isLoading ? "Laddar..." : "Välj arbetsort"} />
              </SelectTrigger>
              <SelectContent>
                {locations?.map((l) => (
                  <SelectItem key={l.id} value={l.kommun}>
                    {l.kommun} ({l.region})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </StepWrapper>
        )}

        {/* Step 3: Mini-questions while calculating */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            {miniStep < 2 ? (
              <div className="w-full max-w-sm animate-in fade-in slide-in-from-bottom-4 duration-300" key={miniStep}>
                <p className="text-xs text-muted-foreground mb-4 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Beräknar medan du svarar…
                </p>
                {miniStep === 0 && (
                  <>
                    <h2 className="text-lg sm:text-xl font-display text-foreground mb-6">
                      Var är du anställd?
                    </h2>
                    <div className="flex flex-col gap-3">
                      {([
                        { value: "region_kommun" as EmployerType, label: "Region eller kommun" },
                        { value: "privat" as EmployerType, label: "Privat" },
                        { value: "inhyrd" as EmployerType, label: "Inhyrd" },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setEmployer(opt.value); setMiniStep(1); }}
                          className="py-3 px-4 rounded-xl border border-border text-sm font-medium bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {miniStep === 1 && (
                  <>
                    <h2 className="text-lg sm:text-xl font-display text-foreground mb-6">
                      Pendlar du till jobbet?
                    </h2>
                    <div className="flex flex-col gap-3">
                      {([
                        { value: "veckovis" as CommuteType, label: "Veckovis" },
                        { value: "dagligen" as CommuteType, label: "Dagligen" },
                        { value: "inte_alls" as CommuteType, label: "Inte alls" },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setCommute(opt.value); setMiniStep(2); }}
                          className="py-3 px-4 rounded-xl border border-border text-sm font-medium bg-card hover:bg-accent hover:text-accent-foreground transition-colors text-left"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ) : (
              <>
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-6" />
                <h2 className="text-xl sm:text-2xl font-display text-foreground mb-2">
                  Vi räknar...
                </h2>
                <p className="text-sm text-muted-foreground max-w-xs">
                  Jämför din profil med ramavtalspriser från 290 vårdgivare
                </p>
              </>
            )}
          </div>
        )}

        {/* Step 4: Visa intervall (delvis) */}
        {step === 4 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display text-foreground">Ditt uppskattade löneintervall</h2>
                <p className="text-sm text-muted-foreground">Baserat på din yrkesroll och ort</p>
              </div>
            </div>
            <div className="mt-6 flex-1">
              {partialResult ? (
                <div className="space-y-6">
                  <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
                    <p className="text-sm text-muted-foreground mb-2">
                      {derivedEmploymentType === "foretagare" ? "Timersättning (fakturerat)" : "Timlön (brutto, anställd)"}
                    </p>
                    <p className="text-4xl sm:text-5xl font-bold font-display text-foreground">
                      {partialResult.low}–{partialResult.high}
                      <span className="text-lg text-muted-foreground ml-1">kr/h</span>
                    </p>
                  </div>
                  <div className="bg-muted/50 rounded-xl p-4 text-center">
                    <p className="text-xs text-muted-foreground">
                      🔒 Fullständig analys med förhandlingstips, jämförelse per specialisering och regional benchmarking – ange din e-post i nästa steg.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="bg-muted/50 rounded-2xl p-6 text-center">
                  <p className="text-sm text-muted-foreground">
                    Vi kunde inte beräkna ett intervall med dina val. Gå tillbaka och justera dina uppgifter.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Step 5: E-post */}
        {step === 5 && (
          <StepWrapper
            icon={<Mail className="w-6 h-6" />}
            title="Få din fullständiga analys"
            subtitle="Vi skickar den till din e-post"
          >
            <div className="space-y-3">
              <Input
                type="email"
                inputMode="email"
                autoComplete="email"
                placeholder="namn@exempel.se"
                value={data.email}
                onChange={(e) => setData({ ...data, email: e.target.value })}
                className="h-14 text-base"
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Vi delar aldrig din e-post med tredje part.
              </p>
            </div>
          </StepWrapper>
        )}
      </div>

      {/* Navigation – hide on "Vi räknar..." step */}
      {step !== 3 && (
        <div className="flex gap-3 mt-8">
          {step > 0 && (
            <button
              onClick={handleBack}
              className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
              Tillbaka
            </button>
          )}
          <button
            onClick={handleNext}
            disabled={!canProceed || saving}
            className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${
              canProceed && !saving
                ? "hero-gradient text-primary-foreground card-shadow-hover"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {step === TOTAL_STEPS - 1 ? (
              <>
                {saving ? "Sparar..." : "Skicka min analys"}
                {!saving && <ArrowRight className="w-5 h-5" />}
              </>
            ) : (
              <>
                Fortsätt
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
}

function StepWrapper({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-display text-foreground">{title}</h2>
          <p className="text-sm text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      <div className="mt-6 flex-1">{children}</div>
    </div>
  );
}
