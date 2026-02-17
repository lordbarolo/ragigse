import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useLocations, useRates } from "@/hooks/useCalculator";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import SearchableSelect from "@/components/SearchableSelect";
import { Input } from "@/components/ui/input";
import {
  Stethoscope, MapPin, Mail, Briefcase,
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

const TOTAL_STEPS = 7;
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmployerType = "region_kommun" | "privat" | "inhyrd" | "";
type CommuteType = "veckovis" | "dagligen" | "inte_alls" | "";
type ShiftType = "ob_jour" | "bara_ob" | "nej" | "";

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
  const [shiftWork, setShiftWork] = useState<ShiftType>("");
  const [miniStep, setMiniStep] = useState(0); // 0 = employer, 1 = commute, 2 = OB/jour, 3 = done/spinner

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

  // Use the explicit employment type from survey data
  const derivedEmploymentType = data.employmentType;

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
    if (step === 3 && miniStep === 3) {
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
      case 1: return !!data.kommun;       // Ort
      case 2: return data.currentSalary > 0; // Ersättning
      case 3: return false;               // "Vi räknar..." – auto-advances
      case 4: return !!data.employmentType; // Anställd/Företagare
      case 5: return true;                // Visa intervall
      case 6: return EMAIL_REGEX.test(data.email.trim()); // E-post
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
    if (step === 3) {
      if (miniStep > 0) setMiniStep(miniStep - 1);
      else setStep(2);
    } else if (step === 4) setStep(2); // Skip spinner
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
              onValueChange={(v) => { setData({ ...data, yrke: v }); setTimeout(() => { trackEvent("survey_started"); trackEvent("survey_step_completed", { step: 1 }); setStep(1); }, 300); }}
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

        {/* Step 1: Ort */}
        {step === 1 && (
          <StepWrapper
            icon={<MapPin className="w-6 h-6" />}
            title="Var jobbar du?"
            subtitle="Välj din arbetsort"
          >
            <SearchableSelect
              value={data.kommun}
              onValueChange={(v) => { setData({ ...data, kommun: v }); setTimeout(() => { trackEvent("survey_step_completed", { step: 2 }); setStep(2); }, 300); }}
              placeholder={isLoading ? "Laddar..." : "Välj arbetsort"}
              options={locations?.map((l) => ({
                value: l.kommun,
                label: l.kommun,
                group: l.region,
              })) || []}
            />
          </StepWrapper>
        )}

        {/* Step 2: Ersättning */}
        {step === 2 && (
          <StepWrapper
            icon={<TrendingUp className="w-6 h-6" />}
            title="Vad har du i ersättning idag?"
            subtitle="Ange din nuvarande lön eller timersättning"
          >
            <div className="space-y-6">
              <div className="flex gap-3">
                {([
                  { value: "hourly" as const, label: "Per timme" },
                  { value: "monthly" as const, label: "Per månad" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData({ ...data, salaryType: opt.value })}
                    className={`flex-1 py-3 px-4 rounded-xl border text-sm font-medium transition-colors ${
                      data.salaryType === opt.value
                        ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                        : "border-border bg-card [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground"
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={data.salaryType === "hourly" ? "Ex. 350" : "Ex. 45000"}
                  value={data.currentSalary || ""}
                  onChange={(e) => setData({ ...data, currentSalary: Number(e.target.value) })}
                  className="h-14 text-lg pr-16"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {data.salaryType === "hourly" ? "kr/h" : "kr/mån"}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {data.salaryType === "hourly"
                  ? "Ange din timersättning före skatt"
                  : "Ange din månadslön före skatt"}
              </p>
            </div>
          </StepWrapper>
        )}

        {/* Step 3: Mini-questions while calculating */}
        {step === 3 && (
          <div className="flex-1 flex flex-col items-center justify-center text-center animate-in fade-in duration-300">
            {miniStep < 3 ? (
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
                          className="py-3 px-4 rounded-xl border border-border text-sm font-medium bg-card [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground active:bg-accent/50 transition-colors text-left focus:outline-none"
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
                          className="py-3 px-4 rounded-xl border border-border text-sm font-medium bg-card [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground active:bg-accent/50 transition-colors text-left focus:outline-none"
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {miniStep === 2 && (
                  <>
                    <h2 className="text-lg sm:text-xl font-display text-foreground mb-6">
                      Jobbar du OB eller jour?
                    </h2>
                    <div className="flex flex-col gap-3">
                      {([
                        { value: "ob_jour" as ShiftType, label: "Ja, både OB och jour" },
                        { value: "bara_ob" as ShiftType, label: "Bara OB (kväll/helg)" },
                        { value: "nej" as ShiftType, label: "Nej, enbart dagtid" },
                      ]).map((opt) => (
                        <button
                          key={opt.value}
                          onClick={() => { setShiftWork(opt.value); setMiniStep(3); }}
                          className="py-3 px-4 rounded-xl border border-border text-sm font-medium bg-card [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground active:bg-accent/50 transition-colors text-left focus:outline-none"
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

        {/* Step 4: Anställd / Företagare */}
        {step === 4 && (
          <StepWrapper
            icon={<Briefcase className="w-6 h-6" />}
            title="Hur är du anställd?"
            subtitle="Välj din anställningsform"
          >
            <div className="flex flex-col gap-3">
              {([
                { value: "anstalld" as const, label: "Anställd", desc: "Tillsvidareanställd eller vikarie hos arbetsgivare" },
                { value: "foretagare" as const, label: "Företagare", desc: "Eget bolag, inhyrd via bemanningsföretag" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => { setData({ ...data, employmentType: opt.value }); setTimeout(() => { trackEvent("survey_step_completed", { step: 5 }); setStep(5); }, 300); }}
                  className={`py-4 px-5 rounded-xl border text-left transition-colors ${
                    data.employmentType === opt.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card hover:bg-accent hover:text-accent-foreground"
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 5: Visa intervall (blurrad med CTA) */}
        {step === 5 && (
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
            <div className="mt-6 flex-1 relative">
              {partialResult ? (
                <>
                  {/* Blurred background content */}
                  <div className="blur-sm select-none pointer-events-none space-y-6">
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
                        Fullständig analys med förhandlingstips och regional benchmarking
                      </p>
                    </div>
                  </div>

                  {/* Overlay CTA */}
                  <div className="absolute inset-0 z-10 flex items-center justify-center">
                    <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-6 text-center max-w-[320px] shadow-lg space-y-4">
                      <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                        <TrendingUp className="w-6 h-6 text-accent" />
                      </div>
                      <div>
                        <p className="font-display text-lg font-bold text-foreground">
                          Ditt förhandlingsutrymme är {(() => {
                            if (!partialResult) return "5–10";
                            const currentHourly = data.salaryType === "monthly" ? Math.round(data.currentSalary / 167) : data.currentSalary;
                            const lowPct = Math.max(0, Math.round(((partialResult.low - currentHourly) / currentHourly) * 100));
                            const highPct = Math.max(0, Math.round(((partialResult.high - currentHourly) / currentHourly) * 100));
                            if (lowPct === 0 && highPct === 0) return "0–5";
                            return `${Math.min(lowPct, highPct)}–${Math.max(lowPct, highPct)}`;
                          })()}%
                        </p>
                        <p className="text-sm text-muted-foreground mt-1">
                          Ange din e-post för att få detaljerad analys och förhandlingsargument
                        </p>
                      </div>
                    </div>
                  </div>
                </>
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

        {/* Step 6: E-post */}
        {step === 6 && (
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

      {/* Navigation */}
      {step > 0 && (
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 py-3 px-5 rounded-xl text-sm font-medium bg-secondary text-secondary-foreground hover:bg-muted transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
            Tillbaka
          </button>
          {![0, 1, 3, 4].includes(step) && (
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
          )}
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
