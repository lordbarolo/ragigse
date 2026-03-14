import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useLocations, useRates } from "@/hooks/useCalculator";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useBenchmarkEngine } from "@/hooks/useBenchmarkEngine";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";
import { Input } from "@/components/ui/input";
import {
  Stethoscope, MapPin, Briefcase,
  ChevronLeft, ArrowRight, TrendingUp,
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";
import { posthog, isPostHogReady } from "@/lib/posthog";

export interface SurveyData {
  email: string;
  employmentType: "anstalld" | "foretagare" | "";
  yrke: string;
  kommun: string;
  experience: number;
  salaryType: "hourly" | "monthly";
  currentSalary: number;
  obShare: string;
}

const TOTAL_STEPS = 6;

type OccupationCategory = "" | "lakare" | "ssk";
type CommuteType = "veckovis" | "dagligen" | "inte_alls" | "";

// Top 15 doctor specializations (most common in Sweden)
const TOP_DOCTOR_SPECIALTIES = [
  "Allmänmedicin", "Anestesi och intensivvård", "Barn- och ungdomsmedicin",
  "Geriatrik", "Infektionssjukdomar", "Internmedicin", "Kardiologi",
  "Kirurgi", "Lungsjukdomar", "Neurologi", "Obstetrik och gynekologi",
  "Onkologi", "Ortopedi", "Psykiatri", "Radiologi",
];

// Top 15 nurse specializations (most common)
const TOP_NURSE_SPECIALIZATIONS = [
  "Akutsjukvård", "Ambulanssjukvård", "Anestesisjukvård", "Barn och ungdom",
  "Distriktssköterska", "Hjärtsjukvård", "Infektionssjukvård",
  "Intensivvård", "Kirurgisk vård", "Medicinsk vård", "Onkologi",
  "Operationssjukvård", "Palliativ vård", "Psykiatrisk vård", "Vård av äldre",
];

const nurseValueMap: Record<string, string> = {
  "Akutsjukvård": "Specialistsjuksköterska akutsjukvård",
  "Ambulanssjukvård": "Specialistsjuksköterska ambulanssjukvård",
  "Anestesisjukvård": "Specialistsjuksköterska anestesi",
  "Barn och ungdom": "Specialistsjuksköterska barn och ungdom",
  "Diabetesvård": "Specialistsjuksköterska diabetesvård",
  "Distriktssköterska": "Distriktssjuksköterska",
  "Hjärtsjukvård": "Specialistsjuksköterska hjärtsjukvård",
  "Infektionssjukvård": "Specialistsjuksköterska infektionssjukvård",
  "Intensivvård": "Specialistsjuksköterska intensivvård",
  "Kirurgisk vård": "Specialistsjuksköterska kirurgisk vård",
  "Medicinsk vård": "Specialistsjuksköterska medicinsk vård",
  "Onkologi": "Specialistsjuksköterska onkologisk vård",
  "Operationssjukvård": "Specialistsjuksköterska operationssjukvård",
  "Palliativ vård": "Specialistsjuksköterska palliativ vård",
  "Psykiatrisk vård": "Specialistsjuksköterska psykiatrisk vård",
  "Vård av äldre": "Specialistsjuksköterska vård av äldre",
  "Ögonsjukvård": "Specialistsjuksköterska ögonsjukvård",
};

interface SurveyProps {
  initialCategory?: OccupationCategory;
  initialRole?: string;
  onBack?: () => void;
}

export default function Survey({ initialCategory, initialRole, onBack }: SurveyProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: rates, isLoading: ratesLoading } = useRates();
  const [saving, setSaving] = useState(false);

  // Determine initial step based on prefill
  const getInitialStep = () => {
    if (initialRole) return 3; // Role fully determined (e.g. barnmorska) → skip to region
    if (initialCategory) return 2; // Category set → show role dropdown
    return 1;
  };

  const [step, setStep] = useState(getInitialStep);
  const [data, setData] = useState<SurveyData>({
    email: "",
    employmentType: "",
    kommun: "",
    yrke: "",
    experience: 5,
    salaryType: "hourly",
    currentSalary: 0,
    obShare: "",
  });

  // Step 1 state
  const [occupationCategory, setOccupationCategory] = useState<OccupationCategory>(initialCategory || "");

  // Step 2: single dropdown value
  const [roleDropdownValue, setRoleDropdownValue] = useState(initialRole || "");


  // Step 3 state
  const [selectedRegion, setSelectedRegion] = useState("");
  const [kommunSearch, setKommunSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Commute state
  const [commute, setCommute] = useState<CommuteType>("");

  const isLoading = locLoading || ratesLoading;

  // Timing refs for PostHog step/survey tracking
  const surveyStartTime = useRef<number | null>(null);
  const stepEntryTime = useRef<number>(Date.now());
  const surveyStarted = useRef(false);

  const STEP_NAMES = ["yrkeskategori", "specialisering", "kommun", "anstallningsform", "ersattning", "inhyrd_eller_fast"];

  useEffect(() => {
    stepEntryTime.current = Date.now();
    trackEvent("survey_step_viewed", {
      step_number: step,
      step_name: STEP_NAMES[step - 1] || `step_${step}`,
    });
  }, [step]);

  const trackStepCompleted = useCallback((stepNum: number, stepAnswer?: string | number) => {
    const timeOnStep = Math.round((Date.now() - stepEntryTime.current) / 1000);
    trackEvent("survey_step_completed", {
      step_number: stepNum,
      step_name: STEP_NAMES[stepNum - 1] || `step_${stepNum}`,
      time_on_step_seconds: timeOnStep,
      step_answer: stepAnswer ?? null,
    });
  }, []);

  const trackSurveyStarted = useCallback(() => {
    if (surveyStarted.current) return;
    surveyStarted.current = true;
    surveyStartTime.current = Date.now();
    trackEvent("survey_started");
  }, []);

  const { calculate: pricingCalculate, result: pricingResult } = usePricingEngine();
  const { calculate: benchmarkCalculate, result: benchmarkResult } = useBenchmarkEngine();

  // Derive yrke from the single dropdown value
  const resolvedYrke = useMemo(() => {
    if (!roleDropdownValue) return "";
    if (occupationCategory === "lakare") {
      if (roleDropdownValue === "__leg") return "Legitimerad läkare";
      if (roleDropdownValue === "__st") return "ST-läkare";
      if (roleDropdownValue === "__ovrig") return "Specialistläkare";
      return `Specialistläkare ${roleDropdownValue.toLowerCase()}`;
    }
    if (occupationCategory === "ssk") {
      if (roleDropdownValue === "__allman") return "Sjuksköterska";
      if (roleDropdownValue === "__barnmorska") return "Barnmorska";
      if (roleDropdownValue === "__rontgen") return "Röntgensjuksköterska";
      if (roleDropdownValue === "__ovrig") return "Specialistsjuksköterska";
      return nurseValueMap[roleDropdownValue] || roleDropdownValue;
    }
    return "";
  }, [occupationCategory, roleDropdownValue]);

  useEffect(() => {
    if (resolvedYrke) setData((d) => ({ ...d, yrke: resolvedYrke }));
  }, [resolvedYrke]);

  useEffect(() => {
    if (data.yrke && data.kommun && data.employmentType) {
      pricingCalculate(data.yrke, data.kommun, data.employmentType as "anstalld" | "foretagare");
    }
  }, [data.yrke, data.kommun, data.employmentType]);

  useEffect(() => {
    if (data.yrke && data.kommun && data.currentSalary > 0) {
      const currentMonthly = data.salaryType === "hourly" ? data.currentSalary * 167 : data.currentSalary;
      benchmarkCalculate(data.yrke, "privat", currentMonthly);
    }
  }, [data.yrke, data.kommun, data.currentSalary, data.salaryType]);

  const regions = useMemo(() => {
    if (!locations) return [];
    const seen = new Set<string>();
    return locations
      .filter((l) => {
        if (seen.has(l.region)) return false;
        seen.add(l.region);
        return true;
      })
      .map((l) => l.region)
      .sort((a, b) => a.localeCompare(b, "sv"));
  }, [locations]);

  // All kommuner for search-first flow
  const allKommuner = useMemo(() => {
    if (!locations) return [];
    return locations
      .map((l) => ({ kommun: l.kommun, region: l.region }))
      .sort((a, b) => a.kommun.localeCompare(b.kommun, "sv"));
  }, [locations]);

  const filteredKommunerSearch = useMemo(() => {
    if (!kommunSearch.trim()) return allKommuner.slice(0, 10); // show top 10 initially
    const q = kommunSearch.toLowerCase();
    return allKommuner.filter((k) => k.kommun.toLowerCase().includes(q));
  }, [allKommuner, kommunSearch]);

  const filteredKommuner = useMemo(() => {
    if (!locations || !selectedRegion) return [];
    return locations
      .filter((l) => l.region === selectedRegion)
      .map((l) => ({ value: l.kommun, label: l.kommun }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));
  }, [locations, selectedRegion]);

  // Dropdown options for step 2
  const doctorRoleOptions = useMemo(() => [
    { value: "__leg", label: "Leg. läkare", group: "" },
    { value: "__st", label: "ST-läkare", group: "" },
    ...TOP_DOCTOR_SPECIALTIES
      .sort((a, b) => a.localeCompare(b, "sv"))
      .map((s) => ({ value: s, label: s, group: "Specialisering" })),
    { value: "__ovrig", label: "Övrig specialisering", group: "Specialisering" },
  ], []);

  const nurseRoleOptions = useMemo(() => [
    { value: "__allman", label: "Allmänsjuksköterska", group: "" },
    { value: "__barnmorska", label: "Barnmorska", group: "" },
    { value: "__rontgen", label: "Röntgensjuksköterska", group: "" },
    ...TOP_NURSE_SPECIALIZATIONS
      .sort((a, b) => a.localeCompare(b, "sv"))
      .map((s) => ({ value: s, label: s, group: "Vidareutbildning (VUB)" })),
    { value: "__ovrig", label: "Övrig VUB", group: "Vidareutbildning (VUB)" },
  ], []);

  const progress = ((step - 1) / TOTAL_STEPS) * 100;

  const canProceed = (() => {
    switch (step) {
      case 1: return !!occupationCategory;
      case 2: return !!resolvedYrke;
      case 3: return !!data.kommun;
      case 4: return !!data.employmentType;
      case 5: return data.currentSalary > 0;
      case 6: return true; // OB is optional
      default: return false;
    }
  })();

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      // Step 5 "next" = salary submission
      const stepAnswers: Record<number, string | number> = {
        1: occupationCategory,
        2: roleDropdownValue,
        3: data.kommun,
        4: data.employmentType,
        5: data.currentSalary,
        6: data.obShare,
      };
      trackStepCompleted(step, stepAnswers[step]);
      setStep(step + 1);
      return;
    }

    setSaving(true);
    const leadId = crypto.randomUUID();
    const track = "consultant";

    // Identify user in PostHog so all funnel events share the same distinct_id
    if (isPostHogReady()) {
      try { posthog.identify(leadId); } catch { /* silent */ }
    }
    const couponCode = searchParams.get("coupon");
    const couponParam = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";

    // Helper: navigate to teaser regardless of report creation outcome
    const navigateToTeaser = () => {
      sessionStorage.setItem("leadId", leadId);
      sessionStorage.setItem("surveyData", JSON.stringify({ ...data, track }));
      if (benchmarkResult) sessionStorage.setItem("benchmarkResult", JSON.stringify(benchmarkResult));
      if (pricingResult) sessionStorage.setItem("pricingResult", JSON.stringify(pricingResult));
      trackStepCompleted(6, data.obShare);
      const totalTime = surveyStartTime.current ? Math.round((Date.now() - surveyStartTime.current) / 1000) : 0;
      const hourlyRate = data.salaryType === "monthly"
        ? Math.round(data.currentSalary / 167)
        : data.currentSalary;
      trackEvent("survey_completed", {
        total_steps: TOTAL_STEPS,
        total_time_seconds: totalTime,
        role: data.yrke,
        zone: data.kommun,
        current_hourly_rate: hourlyRate,
        experience_years: data.experience,
        employment_type: data.employmentType === "foretagare" ? "Eget bolag" : "Fast",
        agency_name: null,
        report_id: sessionStorage.getItem("reportId") || null,
      });
      navigate(`/resultat/${leadId}${couponParam}`);
    };

    try {
      console.log("[Survey] Inserting lead:", leadId);
      const { error } = await supabase.from("leads").insert({
        id: leadId,
        employment_type: data.employmentType,
        yrke: data.yrke,
        kommun: data.kommun,
        experience: data.experience,
        salary_type: data.salaryType,
        current_salary: data.currentSalary,
        ob_share: data.obShare || null,
      });
      if (error) {
        console.error("[Survey] Lead insert failed:", error);
        throw error;
      }
      console.log("[Survey] Lead inserted, calling create-report...");

      // Race create-report against a 3s timeout
      const reportPromise = supabase.functions.invoke("create-report", {
        body: {
          lead_id: leadId,
          occupation: data.yrke,
          employment_type: data.employmentType,
          kommun: data.kommun,
          experience: data.experience,
          current_salary: data.currentSalary,
          salary_type: data.salaryType,
          track,
          commute,
          ob_share: data.obShare || null,
        },
      });

      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("create-report timeout (3s)") }), 3000)
      );

      const { data: reportData, error: reportError } = await Promise.race([reportPromise, timeoutPromise]);

      if (reportError || !reportData?.report_id) {
        console.warn("[Survey] create-report failed or timed out:", reportError?.message || "no report_id");
        // Still navigate — teaser can fetch data via get-lead
        navigateToTeaser();
        return;
      }

      console.log("[Survey] Report created:", reportData.report_id);
      sessionStorage.setItem("reportId", reportData.report_id);
      if (reportData.ab_variant) sessionStorage.setItem("abVariant", reportData.ab_variant);
      navigateToTeaser();
    } catch (err) {
      console.error("[Survey] Survey completion error:", err);
      // Even on error, try to navigate so the user isn't stuck
      try {
        navigateToTeaser();
      } catch {
        toast.error("Kunde inte spara dina uppgifter. Försök igen.");
        setSaving(false);
      }
    }
  };

  const handleBack = () => {
    if (step === 3 && initialRole) {
      onBack?.();
    } else if (step === 3) {
      setKommunSearch("");
      setSelectedRegion("");
      setData({ ...data, kommun: "" });
      setStep(2);
    } else if (step === 2 && initialCategory) {
      // Came from landing with category pre-set — go back to landing
      onBack?.();
    } else if (step === 2) {
      setOccupationCategory("");
      setRoleDropdownValue("");
      setStep(1);
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  // Display-friendly role name
  const displayRole = useMemo(() => {
    if (!roleDropdownValue) return "";
    if (occupationCategory === "lakare") {
      if (roleDropdownValue === "__leg") return "Leg. läkare";
      if (roleDropdownValue === "__st") return "ST-läkare";
      if (roleDropdownValue === "__ovrig") return "Specialistläkare";
      return roleDropdownValue;
    }
    if (occupationCategory === "ssk") {
      if (roleDropdownValue === "__allman") return "Allmänsjuksköterska";
      if (roleDropdownValue === "__barnmorska") return "Barnmorska";
      if (roleDropdownValue === "__rontgen") return "Röntgensjuksköterska";
      if (roleDropdownValue === "__ovrig") return "Specialistsjuksköterska";
      return roleDropdownValue;
    }
    return "";
  }, [occupationCategory, roleDropdownValue]);

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar — thin, elegant, hidden on step 1 */}
      {step > 1 && (
        <div className="mb-4">
          <div className="h-1 bg-border/50 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">{step} av {TOTAL_STEPS}</p>
        </div>
      )}

      {/* Context chips — show selected role & kommun */}
      {step > 2 && (displayRole || data.kommun) && (
        <div className="flex flex-wrap items-center gap-1.5 mb-6">
          {displayRole && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-foreground/[0.05] border border-foreground/[0.08] rounded-full px-3 py-1">
              <Stethoscope className="w-3 h-3 text-primary/70" />
              {displayRole}
            </span>
          )}
          {data.kommun && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-foreground/70 bg-foreground/[0.05] border border-foreground/[0.08] rounded-full px-3 py-1">
              <MapPin className="w-3 h-3 text-primary/70" />
              {data.kommun}
            </span>
          )}
        </div>
      )}

      <div className="min-h-[320px] flex flex-col">

        {/* Step 1: Yrkeskategori */}
        {step === 1 && (
          <StepWrapper title="Vad jobbar du som?">
            <div className="flex flex-col gap-3">
              {([
                { value: "lakare" as OccupationCategory, label: "Läkare", desc: "ST, specialist eller legitimerad läkare" },
                { value: "ssk" as OccupationCategory, label: "Sjuksköterska / Barnmorska", desc: "Allmänsjuksköterska, specialistsjuksköterska eller barnmorska" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    trackSurveyStarted();
                    setOccupationCategory(opt.value);
                    setRoleDropdownValue("");
                    trackStepCompleted(1, opt.value);
                    setStep(2);
                  }}
                  className="group w-full py-5 px-5 rounded-xl border border-border !border-l-[3px] !border-l-primary bg-card text-left transition-all active:scale-[0.98] hover:border-primary/40 hover:bg-primary/[0.03] flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-base font-semibold text-foreground">{opt.label}</span>
                    <p className="text-sm text-muted-foreground mt-1">{opt.desc}</p>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 2: Single dropdown for role selection */}
        {step === 2 && (
          <StepWrapper title="Välj din roll">
            <SearchableSelect
              value={roleDropdownValue}
              onValueChange={(v) => {
                setRoleDropdownValue(v);
                setTimeout(() => {
                  trackStepCompleted(2, v);
                  setStep(3);
                }, 300);
              }}
              placeholder={occupationCategory === "lakare" ? "Välj läkarroll eller specialisering..." : "Välj roll eller vidareutbildning..."}
              options={occupationCategory === "lakare" ? doctorRoleOptions : nurseRoleOptions}
            />
          </StepWrapper>
        )}

        {step === 3 && (
          <StepWrapper title="Var jobbar du?">
            <div className="space-y-4 flex flex-col items-center justify-center flex-1">
              <p className="text-sm text-muted-foreground text-center max-w-xs">
                Inom en region kan det finnas 3 olika prisnivåer. Ange kommun för en träffsäker analys av din ersättning.
              </p>

              {/* Search input */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={kommunSearch}
                  onChange={(e) => setKommunSearch(e.target.value)}
                  placeholder="Sök kommun, t.ex. Göteborg..."
                  className="h-28 pl-12 text-2xl"
                  autoFocus
                />
              </div>

              {/* Results */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex flex-col max-h-[320px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25">
                  {filteredKommunerSearch.length === 0 ? (
                    <p className="py-8 text-center text-sm text-muted-foreground">Inga kommuner hittades</p>
                  ) : (
                    filteredKommunerSearch.map((k) => (
                      <button
                        key={k.kommun}
                        onClick={() => {
                          setData({ ...data, kommun: k.kommun });
                          setSelectedRegion(k.region);
                          trackStepCompleted(3, k.kommun);
                          setTimeout(() => setStep(4), 200);
                        }}
                        className="group w-full py-3 px-4 text-left text-sm transition-all hover:bg-primary/[0.04] flex items-center justify-between border-b border-border/50 last:border-b-0"
                      >
                        <div>
                          <span className="font-medium text-foreground">{k.kommun}</span>
                          <span className="ml-2 text-xs text-muted-foreground">{k.region}</span>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>

              {!kommunSearch && (
                <p className="text-xs text-muted-foreground/50 text-center">
                  Börja skriva för att hitta din uppdragsort
                </p>
              )}
            </div>
          </StepWrapper>
        )}

        {/* Step 4: Anställningsform */}
        {step === 4 && (
          <StepWrapper title="Vilken är din uppdragsform?">
            <div className="flex flex-col gap-3">
              {([
                { value: "anstalld" as const, label: "Anställd", desc: "Ersättning från arbetsgivare" },
                { value: "foretagare" as const, label: "Eget bolag", desc: "Fakturerar via bemanningsföretag" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setData({ ...data, employmentType: opt.value });
                    trackStepCompleted(4, opt.value);
                    setTimeout(() => setStep(5), 300);
                  }}
                  className="group w-full py-5 px-5 rounded-xl border border-border !border-l-[3px] !border-l-primary bg-card text-left transition-all active:scale-[0.98] hover:border-primary/40 hover:bg-primary/[0.03]"
                >
                  <span className="text-base font-medium text-foreground">{opt.label}</span>
                  <p className="text-sm text-muted-foreground mt-1">{opt.desc}</p>
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 5: Ersättning */}
        {step === 5 && (
          <StepWrapper title="Vad får du i ersättning idag?">
            <div className="space-y-5">
              <div className="flex gap-3">
                {([
                  { value: "hourly" as const, label: "Per timme" },
                  { value: "monthly" as const, label: "Per månad" },
                ]).map((opt) => (
                  <button
                    key={opt.value}
                    onClick={() => setData({ ...data, salaryType: opt.value })}
                    className={`flex-1 py-3.5 px-4 rounded-xl border text-sm font-medium transition-all active:scale-[0.98] ${
                      data.salaryType === opt.value
                        ? "border-primary bg-primary/[0.06] text-foreground"
                        : "border-border bg-card text-muted-foreground hover:border-primary/30"
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
                  placeholder={data.salaryType === "hourly" ? "350" : "45 000"}
                  value={data.currentSalary || ""}
                  onChange={(e) => setData({ ...data, currentSalary: Number(e.target.value) })}
                  className="h-16 text-2xl font-semibold pr-20 text-center"
                  autoFocus
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-base text-muted-foreground font-medium">
                  {data.salaryType === "hourly" ? "kr/h" : "kr/mån"}
                </span>
              </div>
              <p className="text-sm text-muted-foreground text-center">
                {data.salaryType === "hourly"
                  ? "Timersättning före skatt"
                  : "Månadsersättning före skatt"}
              </p>
            </div>
          </StepWrapper>
        )}

        {/* Step 6: Inhyrd eller fast anställd */}
        {step === 6 && (
          <StepWrapper title="Arbetar du som inhyrd eller fast anställd?">
            <div className="flex flex-col gap-3">
              {([
                { value: "inhyrd", label: "Inhyrd", desc: "Jag arbetar via bemanningsföretag" },
                { value: "fast", label: "Fast anställd", desc: "Jag är anställd direkt av arbetsgivaren" },
              ]).map((opt) => (
              <button
                  key={opt.value}
                  onClick={() => {
                    const updated = { ...data, obShare: opt.value };
                    setData(updated);
                    trackStepCompleted(6, opt.value);
                    // Directly submit with updated data
                    setSaving(true);
                    const leadId = crypto.randomUUID();
                    const track = "consultant";
                    if (isPostHogReady()) {
                      try { posthog.identify(leadId); } catch { /* silent */ }
                    }
                    const couponCode = searchParams.get("coupon");
                    const couponParam = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";
                    const doSubmit = async () => {
                      try {
                        await supabase.from("leads").insert({
                          id: leadId,
                          employment_type: updated.employmentType,
                          yrke: updated.yrke,
                          kommun: updated.kommun,
                          experience: updated.experience,
                          salary_type: updated.salaryType,
                          current_salary: updated.currentSalary,
                          ob_share: opt.value || null,
                        });
                        const reportPromise = supabase.functions.invoke("create-report", {
                          body: {
                            lead_id: leadId,
                            occupation: updated.yrke,
                            employment_type: updated.employmentType,
                            kommun: updated.kommun,
                            experience: updated.experience,
                            current_salary: updated.currentSalary,
                            salary_type: updated.salaryType,
                            track,
                            commute,
                            ob_share: opt.value || null,
                          },
                        });
                        const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
                          setTimeout(() => resolve({ data: null, error: new Error("timeout") }), 3000)
                        );
                        const { data: reportData } = await Promise.race([reportPromise, timeoutPromise]);
                        if (reportData?.report_id) {
                          sessionStorage.setItem("reportId", reportData.report_id);
                          if (reportData.ab_variant) sessionStorage.setItem("abVariant", reportData.ab_variant);
                        }
                      } catch (err) {
                        console.error("[Survey] Submit error:", err);
                      }
                      sessionStorage.setItem("leadId", leadId);
                      sessionStorage.setItem("surveyData", JSON.stringify({ ...updated, track }));
                      if (benchmarkResult) sessionStorage.setItem("benchmarkResult", JSON.stringify(benchmarkResult));
                      if (pricingResult) sessionStorage.setItem("pricingResult", JSON.stringify(pricingResult));
                      const totalTime = surveyStartTime.current ? Math.round((Date.now() - surveyStartTime.current) / 1000) : 0;
                      const hourlyRate = updated.salaryType === "monthly" ? Math.round(updated.currentSalary / 167) : updated.currentSalary;
                      trackEvent("survey_completed", {
                        total_steps: TOTAL_STEPS,
                        total_time_seconds: totalTime,
                        role: updated.yrke,
                        zone: updated.kommun,
                        current_hourly_rate: hourlyRate,
                        experience_years: updated.experience,
                        employment_type: updated.employmentType === "foretagare" ? "Eget bolag" : "Fast",
                        agency_name: null,
                        report_id: sessionStorage.getItem("reportId") || null,
                      });
                      navigate(`/resultat/${leadId}${couponParam}`);
                    };
                    doSubmit();
                  }}
                  disabled={saving}
                  className="group w-full py-5 px-5 rounded-xl border border-border !border-l-[3px] !border-l-primary bg-card text-left transition-all active:scale-[0.98] hover:border-primary/40 hover:bg-primary/[0.03] disabled:opacity-50"
                >
                  <span className="text-base font-medium text-foreground">{opt.label}</span>
                  <p className="text-sm text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

      </div>

      {/* Navigation */}
      {step > 1 && (
        <div className="flex gap-3 mt-8">
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 py-3.5 px-5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all active:scale-[0.97]"
          >
            <ChevronLeft className="w-4 h-4" />
            Tillbaka
          </button>
          {step === 5 && (
            <button
              onClick={() => {
                if (data.currentSalary <= 0) {
                  toast.error("Ange ersättning innan du fortsätter");
                  return;
                }
                if (!canProceed) return;
                trackStepCompleted(5, data.currentSalary);
                setStep(6);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-base font-semibold transition-all duration-200 active:scale-[0.97] ${
                canProceed
                  ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              Nästa
              <ArrowRight className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function StepWrapper({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col justify-center">
      <div className="mb-6 text-center">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-foreground tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground mt-1">{subtitle}</p>}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
