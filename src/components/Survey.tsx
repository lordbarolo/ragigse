import { useState, useMemo, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useLocations, useRates } from "@/hooks/useCalculator";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useBenchmarkEngine } from "@/hooks/useBenchmarkEngine";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";
import { Input } from "@/components/ui/input";
import {
  Stethoscope, MapPin, Mail, Briefcase, Building2,
  ChevronRight, ChevronLeft, ArrowRight, Loader2, TrendingUp
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";
import { useQuery } from "@tanstack/react-query";

export interface SurveyData {
  email: string;
  employmentType: "anstalld" | "foretagare";
  yrke: string;
  kommun: string;
  experience: number;
  salaryType: "hourly" | "monthly";
  currentSalary: number;
}

type Track = "consultant" | "permanent" | "";

const TOTAL_STEPS = 8; // 0=track, 1=yrke, 2=ort, 3=ersättning, 4=mini-questions, 5=anställd/företagare, 6=resultat, 7=email (permanent only / fallback)
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type EmployerType = "region_kommun" | "privat" | "inhyrd" | "";
type CommuteType = "veckovis" | "dagligen" | "inte_alls" | "";
type ShiftType = "ob_jour" | "bara_ob" | "nej" | "";

// Permanent track: sector derived from employer selection
function sectorFromEmployer(employer: EmployerType): string {
  if (employer === "region_kommun") return "region";
  if (employer === "privat" || employer === "inhyrd") return "privat";
  return "kommunal";
}

export default function Survey() {
  const navigate = useNavigate();
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: rates, isLoading: ratesLoading } = useRates();
  const [saving, setSaving] = useState(false);
  const [track, setTrack] = useState<Track>("");
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
  const [miniStep, setMiniStep] = useState(0);

  // Fetch benchmark occupations for permanent track
  const { data: benchmarkOccupations } = useQuery({
    queryKey: ["benchmark-occupations"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("salary_benchmarks")
        .select("occupation")
        .order("occupation");
      if (error) throw error;
      const seen = new Set<string>();
      return (data || []).filter(r => {
        if (seen.has(r.occupation)) return false;
        seen.add(r.occupation);
        return true;
      });
    },
  });

  // Consultant occupations from rates
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

  const derivedEmploymentType = data.employmentType;

  const { calculate: pricingCalculate, result: pricingResult, loading: pricingLoading } = usePricingEngine();
  const { calculate: benchmarkCalculate, result: benchmarkResult, loading: benchmarkLoading } = useBenchmarkEngine();

  // Trigger pricing-engine when consultant track has enough data
  useEffect(() => {
    if (track === "consultant" && data.yrke && data.kommun && employer) {
      pricingCalculate(data.yrke, data.kommun, derivedEmploymentType);
    }
  }, [data.yrke, data.kommun, employer, track]);

  // Trigger benchmark-engine when permanent track has enough data
  useEffect(() => {
    if (track === "permanent" && data.yrke && employer) {
      const sector = sectorFromEmployer(employer);
      const currentMonthly = data.salaryType === "hourly"
        ? data.currentSalary * 167
        : data.currentSalary;
      benchmarkCalculate(data.yrke, sector, currentMonthly > 0 ? currentMonthly : undefined);
    }
  }, [data.yrke, employer, track]);

  const partialResult = pricingResult
    ? {
        low: pricingResult.recommended_hourly_min,
        high: pricingResult.recommended_hourly_max,
        timpris: pricingResult.rate_customer_sek_per_hour,
      }
    : null;

  // Auto-advance from mini-questions step after done
  useEffect(() => {
    if (step === 4 && miniStep === 3) {
      if (track === "consultant") {
        // Consultant: stay on spinner screen so user can enter email there
        return;
      }
      // Permanent: auto-advance to result after spinner
      const timer = setTimeout(() => {
        setStep(6);
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [step, miniStep, track]);

  // Reset mini step only when *entering* step 4 (track via previous step value)
  const prevStepRef = useRef<number>(-1);
  useEffect(() => {
    if (step === 4 && prevStepRef.current !== 4) {
      setMiniStep(0);
    }
    prevStepRef.current = step;
  }, [step]);

  const canProceed = (() => {
    switch (step) {
      case 0: return !!track;               // Track
      case 1: return !!data.yrke;           // Yrkesroll
      case 2: return !!data.kommun;         // Ort
      case 3: return data.currentSalary > 0; // Ersättning
      case 4:
        // Consultant on spinner screen: need valid email to proceed
        if (track === "consultant" && miniStep === 3) return EMAIL_REGEX.test(data.email.trim());
        return false; // Mini-questions – auto-advances (permanent)
      case 5: return !!data.employmentType; // Anställd/Företagare (consultant only)
      case 6: return true;                  // Visa intervall (consultant saves here, permanent goes to step 7)
      case 7: return EMAIL_REGEX.test(data.email.trim()); // E-post (permanent only)
      default: return false;
    }
  })();

  const handleNext = async () => {
    // Consultant: submit from spinner screen (step 4, miniStep 3) -> go to step 5
    if (step === 4 && miniStep === 3 && track === "consultant") {
      trackEvent("survey_step_completed", { step: 5 });
      setStep(5);
      return;
    }

    // Consultant at step 6 (result preview): save & navigate directly (email already collected)
    const isConsultantFinalStep = step === 6 && track === "consultant";
    // Permanent at step 7: save & navigate
    const isPermanentFinalStep = step === 7 && track === "permanent";

    if (isConsultantFinalStep || isPermanentFinalStep) {
      // Fall through to save logic below
    } else if (step < TOTAL_STEPS - 1) {
      if (step === 0) trackEvent("survey_started", { track });
      trackEvent("survey_step_completed", { step: step + 1 });

      // For permanent track, skip step 5 (anställd/företagare)
      if (step === 3 && track === "permanent") {
        setStep(4); // Go to mini-questions
      } else {
        setStep(step + 1);
      }
      return;
    }

    {
      // Save lead and create report
      setSaving(true);
      try {
        const leadId = crypto.randomUUID();
        const { error } = await supabase.from("leads").insert({
          id: leadId,
          email: data.email.trim().toLowerCase(),
          employment_type: track === "permanent" ? "anstalld" : derivedEmploymentType,
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
            employment_type: track === "permanent" ? "anstalld" : derivedEmploymentType,
            kommun: data.kommun,
            experience: data.experience,
            current_salary: data.currentSalary,
            salary_type: data.salaryType,
            track,
            sector: track === "permanent" ? sectorFromEmployer(employer) : undefined,
          },
        });

        if (reportError || !reportData?.report_id) {
          throw new Error("Failed to create report");
        }

        sessionStorage.setItem("leadId", leadId);
        sessionStorage.setItem("reportId", reportData.report_id);
        sessionStorage.setItem("surveyData", JSON.stringify({ ...data, track }));
        if (reportData.ab_variant) {
          sessionStorage.setItem("abVariant", reportData.ab_variant);
        }
        // Save benchmark result for permanent track so Teaser can display it
        if (track === "permanent" && benchmarkResult) {
          sessionStorage.setItem("benchmarkResult", JSON.stringify(benchmarkResult));
        }
        trackEvent("survey_completed", { track });
        navigate("/resultat");
      } catch {
        toast.error("Kunde inte spara dina uppgifter. Försök igen.");
        setSaving(false);
        return;
      }
    }
  };

  const handleBack = () => {
    if (step === 4) {
      if (miniStep > 0) setMiniStep(miniStep - 1);
      else setStep(3);
    } else if (step === 5) setStep(3); // Skip mini-questions back
    else if (step === 6 && track === "permanent") setStep(3); // Permanent skipped step 5
    else if (step === 6) setStep(5);
    else if (step > 0) setStep(step - 1);
  };

  // Adjust progress: permanent track has 7 effective steps (skips step 5)
  const effectiveSteps = track === "permanent" ? TOTAL_STEPS - 1 : TOTAL_STEPS;
  const effectiveStep = track === "permanent" && step > 5 ? step - 1 : step;
  const progress = ((effectiveStep + 1) / effectiveSteps) * 100;

  // Occupation options based on track
  const occupationOptions = useMemo(() => {
    if (track === "consultant") {
      return uniqueYrken.map((r) => {
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
      });
    } else {
      // Permanent track – from salary_benchmarks
      return (benchmarkOccupations || []).map((r) => {
        const occ = r.occupation.toLowerCase();
        const group = occ.includes("läkare")
          ? "Läkare"
          : occ.includes("sjukskötersk") || occ.includes("barnmorsk") || occ.includes("distriktssk") || occ.includes("skolsk") || occ.includes("röntgen")
            ? "Sjuksköterska"
            : "Övriga";
        return {
          value: r.occupation,
          label: r.occupation,
          group,
        };
      });
    }
  }, [track, uniqueYrken, benchmarkOccupations]);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar */}
      <div className="mb-8">
        <div className="flex justify-between text-xs text-muted-foreground mb-2">
          <span>Steg {effectiveStep + 1} av {effectiveSteps}</span>
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
        {/* Step 0: Track selection */}
        {step === 0 && (
          <StepWrapper
            icon={<Building2 className="w-6 h-6" />}
            title="Vad vill du jämföra?"
            subtitle="Välj typ av anställning"
          >
            <div className="flex flex-col gap-3">
              {([
                { value: "consultant" as Track, label: "Konsultuppdrag", desc: "Se vad du borde tjäna baserat på ramavtalspriser" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setTrack(opt.value);
                    setData({ ...data, yrke: "", kommun: "", currentSalary: 0 });
                    if (opt.value === "permanent") {
                      setData(d => ({ ...d, salaryType: "monthly", employmentType: "anstalld" }));
                    }
                    setTimeout(() => {
                      trackEvent("survey_started", { track: opt.value });
                      trackEvent("survey_step_completed", { step: 1 });
                      setStep(1);
                    }, 300);
                  }}
                  className={`py-5 px-5 rounded-xl border text-left transition-colors ${
                    track === opt.value
                      ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                      : "border-border bg-card [@media(hover:hover)]:hover:bg-accent [@media(hover:hover)]:hover:text-accent-foreground"
                  }`}
                >
                  <span className="text-base font-semibold">{opt.label}</span>
                  <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 1: Yrkesroll */}
        {step === 1 && (
          <StepWrapper
            icon={<Stethoscope className="w-6 h-6" />}
            title="Vad jobbar du som?"
            subtitle="Välj din yrkeskategori"
          >
            <SearchableSelect
              value={data.yrke}
              onValueChange={(v) => {
                setData({ ...data, yrke: v });
                setTimeout(() => {
                  trackEvent("survey_step_completed", { step: 2 });
                  setStep(2);
                }, 300);
              }}
              placeholder={isLoading ? "Laddar..." : "Välj yrkeskategori"}
              options={occupationOptions}
            />
          </StepWrapper>
        )}

        {/* Step 2: Ort */}
        {step === 2 && (
          <StepWrapper
            icon={<MapPin className="w-6 h-6" />}
            title="Var jobbar du?"
            subtitle={track === "permanent" ? "Välj din arbetsort" : "Välj din arbetsort (påverkar zon-prissättning)"}
          >
            <SearchableSelect
              value={data.kommun}
              onValueChange={(v) => {
                setData({ ...data, kommun: v });
                setTimeout(() => {
                  trackEvent("survey_step_completed", { step: 3 });
                  setStep(3);
                }, 300);
              }}
              placeholder={isLoading ? "Laddar..." : "Välj arbetsort"}
              options={locations?.map((l) => ({
                value: l.kommun,
                label: l.kommun,
                group: l.region,
              })) || []}
            />
          </StepWrapper>
        )}

        {/* Step 3: Ersättning */}
        {step === 3 && (
          <StepWrapper
            icon={<TrendingUp className="w-6 h-6" />}
            title="Vad har du i ersättning idag?"
            subtitle={track === "permanent" ? "Ange din nuvarande månadslön" : "Ange din nuvarande lön eller timersättning"}
          >
            <div className="space-y-6">
              {track === "consultant" && (
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
              )}
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={track === "permanent" ? "Ex. 45000" : (data.salaryType === "hourly" ? "Ex. 350" : "Ex. 45000")}
                  value={data.currentSalary || ""}
                  onChange={(e) => setData({ ...data, currentSalary: Number(e.target.value) })}
                  className="h-14 text-lg pr-16"
                  autoFocus
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {track === "permanent" ? "kr/mån" : (data.salaryType === "hourly" ? "kr/h" : "kr/mån")}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">
                {track === "permanent"
                  ? "Ange din månadslön före skatt"
                  : data.salaryType === "hourly"
                    ? "Ange din timersättning före skatt"
                    : "Ange din månadslön före skatt"}
              </p>
            </div>
          </StepWrapper>
        )}

        {/* Step 4: Mini-questions while calculating */}
        {step === 4 && (
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
                <p className="text-sm text-muted-foreground max-w-xs mb-8">
                  {track === "permanent"
                    ? "Jämför din lön mot officiell statistik från Medlingsinstitutet"
                    : "Jämför din profil med ramavtalspriser från 290 vårdgivare"}
                </p>
                {track === "consultant" && (
                  <div className="w-full max-w-sm space-y-3">
                    <p className="text-sm font-medium text-foreground text-center">
                      Ange din e-post för att se resultatet
                    </p>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                      <Input
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        placeholder="namn@exempel.se"
                        value={data.email}
                        onChange={(e) => setData({ ...data, email: e.target.value })}
                        className="h-14 text-base pl-10"
                        autoFocus
                        onKeyDown={(e) => {
                          if (e.key === "Enter" && EMAIL_REGEX.test(data.email.trim())) {
                            handleNext();
                          }
                        }}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground text-center">
                      Vi delar aldrig din e-post med tredje part.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        )}

        {/* Step 5: Anställd / Företagare (consultant only) */}
        {step === 5 && track === "consultant" && (
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
                  onClick={() => {
                    setData({ ...data, employmentType: opt.value });
                    setTimeout(() => {
                      trackEvent("survey_step_completed", { step: 6 });
                      setStep(6);
                    }, 300);
                  }}
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

        {/* Step 6: Result display */}
        {step === 6 && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 flex-1 flex flex-col">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                <TrendingUp className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-display text-foreground">
                  {track === "permanent" ? "Ditt förhandlingsutrymme" : "Ditt uppskattade löneintervall"}
                </h2>
                <p className="text-sm text-muted-foreground">
                  {track === "permanent" ? "Baserat på officiell lönestatistik" : "Baserat på din yrkesroll och ort"}
                </p>
              </div>
            </div>
            <div className="mt-6 flex-1 relative">
              {track === "permanent" ? (
                // Permanent track result
                benchmarkResult ? (
                  <>
                    <div className="blur-sm select-none pointer-events-none space-y-6">
                      <div className="bg-primary/5 border border-primary/20 rounded-2xl p-6 text-center">
                        <p className="text-sm text-muted-foreground mb-2">Lönenivå P75 (officiell statistik)</p>
                        <p className="text-4xl sm:text-5xl font-bold font-display text-foreground">
                          {benchmarkResult.percentile_75.toLocaleString("sv-SE")}
                          <span className="text-lg text-muted-foreground ml-1">kr/mån</span>
                        </p>
                      </div>
                      <div className="bg-muted/50 rounded-xl p-4 text-center">
                        <p className="text-xs text-muted-foreground">
                          Fullständig analys med förhandlingstips
                        </p>
                      </div>
                    </div>
                    <div className="absolute inset-0 z-10 flex items-center justify-center">
                      <div className="bg-card/95 backdrop-blur-sm border border-border rounded-2xl p-6 text-center max-w-[320px] shadow-lg space-y-4">
                        <div className="w-12 h-12 rounded-full bg-accent/10 flex items-center justify-center mx-auto">
                          <TrendingUp className="w-6 h-6 text-accent" />
                        </div>
                        <div>
                          <p className="font-display text-lg font-bold text-foreground">
                            {benchmarkResult.category === "large"
                              ? "Stort förhandlingsutrymme"
                              : benchmarkResult.category === "medium"
                                ? "Medel förhandlingsutrymme"
                                : "Begränsat förhandlingsutrymme"}
                          </p>
                          <p className="text-sm text-muted-foreground mt-1">
                            {benchmarkResult.gap_pct != null
                              ? `Du kan potentiellt öka din lön med ~${benchmarkResult.gap_pct}%`
                              : "Ange din e-post för att få detaljerad analys"}
                          </p>
                        </div>
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <MapPin className="w-4 h-4 text-primary shrink-0" />
                          <p className="text-xs text-primary font-medium leading-snug">
                            Källa: Medlingsinstitutet {benchmarkResult.year}
                          </p>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="bg-muted/50 rounded-2xl p-6 text-center">
                    <p className="text-sm text-muted-foreground">
                      Vi kunde inte beräkna ett resultat med dina val. Gå tillbaka och justera dina uppgifter.
                    </p>
                  </div>
                )
              ) : (
                // Consultant track result
                partialResult ? (
                  <>
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
                        <div className="flex items-center gap-2 pt-2 border-t border-border/50">
                          <MapPin className="w-4 h-4 text-primary shrink-0" />
                          <p className="text-xs text-primary font-medium leading-snug">
                            Du kan tjäna betydligt mer.<br />
                            Se vilka orter som ger dig högre lön.
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
                )
              )}
            </div>
          </div>
        )}

        {/* Step 7: E-post */}
        {step === 7 && (
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
          {(![0, 1, 2, 4, 5].includes(step) || (step === 4 && track === "consultant" && miniStep === 3)) && (
            <button
              onClick={handleNext}
              disabled={!canProceed || saving}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl text-sm sm:text-base font-semibold transition-all duration-200 ${
                canProceed && !saving
                  ? "hero-gradient text-primary-foreground card-shadow-hover"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {(step === TOTAL_STEPS - 1 || (step === 6 && track === "consultant")) ? (
                <>
                  {saving ? "Sparar..." : (track === "consultant" ? "Se min rapport" : "Skicka min analys")}
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
