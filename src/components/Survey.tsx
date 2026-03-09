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

export interface SurveyData {
  email: string;
  employmentType: "anstalld" | "foretagare" | "";
  yrke: string;
  kommun: string;
  experience: number;
  salaryType: "hourly" | "monthly";
  currentSalary: number;
}

const TOTAL_STEPS = 5;

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

export default function Survey() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: rates, isLoading: ratesLoading } = useRates();
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState(1);
  const [data, setData] = useState<SurveyData>({
    email: "",
    employmentType: "",
    kommun: "",
    yrke: "",
    experience: 5,
    salaryType: "hourly",
    currentSalary: 0,
  });

  // Step 1 state
  const [occupationCategory, setOccupationCategory] = useState<OccupationCategory>("");

  // Step 2: single dropdown value
  const [roleDropdownValue, setRoleDropdownValue] = useState("");

  // Step 3 state
  const [selectedRegion, setSelectedRegion] = useState("");

  // Commute state
  const [commute, setCommute] = useState<CommuteType>("");

  const isLoading = locLoading || ratesLoading;

  // Timing refs for PostHog step/survey tracking
  const surveyStartTime = useRef<number | null>(null);
  const stepEntryTime = useRef<number>(Date.now());
  const surveyStarted = useRef(false);

  const STEP_NAMES = ["yrkeskategori", "specialisering", "kommun", "anstallningsform", "ersattning"];

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

  const { calculate: pricingCalculate } = usePricingEngine();
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
      default: return false;
    }
  })();

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      // Step 5 "next" = salary submission
      const answer = step === 5 ? data.currentSalary : undefined;
      trackStepCompleted(step, answer);
      setStep(step + 1);
      return;
    }

    setSaving(true);
    try {
      const leadId = crypto.randomUUID();
      const { error } = await supabase.from("leads").insert({
        id: leadId,
        employment_type: data.employmentType,
        yrke: data.yrke,
        kommun: data.kommun,
        experience: data.experience,
        salary_type: data.salaryType,
        current_salary: data.currentSalary,
      });
      if (error) throw error;

      const track = "consultant";
      const { data: reportData, error: reportError } = await supabase.functions.invoke("create-report", {
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
        },
      });

      if (reportError || !reportData?.report_id) throw new Error("Failed to create report");

      sessionStorage.setItem("leadId", leadId);
      sessionStorage.setItem("reportId", reportData.report_id);
      sessionStorage.setItem("surveyData", JSON.stringify({ ...data, track }));
      if (reportData.ab_variant) sessionStorage.setItem("abVariant", reportData.ab_variant);
      if (benchmarkResult) sessionStorage.setItem("benchmarkResult", JSON.stringify(benchmarkResult));
      trackStepCompleted(5, data.currentSalary);
      const totalTime = surveyStartTime.current ? Math.round((Date.now() - surveyStartTime.current) / 1000) : 0;
      trackEvent("survey_completed", {
        total_steps: TOTAL_STEPS,
        total_time_seconds: totalTime,
        role: data.yrke,
        zone: data.kommun,
      });
      const couponCode = searchParams.get("coupon");
      const couponParam = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";
      navigate(`/resultat/${leadId}${couponParam}`);
    } catch {
      toast.error("Kunde inte spara dina uppgifter. Försök igen.");
      setSaving(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setRoleDropdownValue("");
      setStep(1);
    } else if (step === 3 && !data.kommun && selectedRegion) {
      setSelectedRegion("");
    } else if (step > 1) {
      setStep(step - 1);
    }
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      {/* Progress bar — hidden on step 1 */}
      {step > 1 && (
        <div className="mb-10">
          <div className="flex justify-between items-center text-xs text-muted-foreground mb-2">
            <span className="font-medium">Steg {step} av {TOTAL_STEPS}</span>
          </div>
          <div className="h-1 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      <div className="min-h-[280px] flex flex-col">

        {/* Step 1: Yrkeskategori */}
        {step === 1 && (
          <StepWrapper
            icon={<Stethoscope className="w-6 h-6" />}
            title="Vad jobbar du som?"
          >
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
                  className={`py-4 px-5 rounded-lg border text-left transition-all ${
                    occupationCategory === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm"
                  }`}
                >
                  <span className="text-sm font-semibold text-foreground">{opt.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 2: Single dropdown for role selection */}
        {step === 2 && (
          <StepWrapper
            icon={<Stethoscope className="w-6 h-6" />}
            title={occupationCategory === "lakare" ? "Välj din roll" : "Välj din roll"}
          >
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
            <button
              type="button"
              onClick={() => { setOccupationCategory(""); setRoleDropdownValue(""); setStep(1); }}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Byt kategori
            </button>
          </StepWrapper>
        )}

        {/* Step 3: Region → Kommun */}
        {step === 3 && !selectedRegion && (
          <StepWrapper
            icon={<MapPin className="w-6 h-6" />}
            title="Vilken region?"
          >
            <div className="flex flex-col gap-2 max-h-[400px] overflow-y-auto">
              {regions.map((region) => (
                <button
                  key={region}
                  onClick={() => setSelectedRegion(region)}
                  className="py-3 px-4 rounded-lg border border-border bg-card text-left text-sm font-medium transition-all hover:border-muted-foreground/30 hover:shadow-sm"
                >
                  {region}
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {step === 3 && selectedRegion && (
          <StepWrapper
            icon={<MapPin className="w-6 h-6" />}
            title="Vilken kommun?"
            subtitle={`Kommuner i ${selectedRegion.split("/")[0]}`}
          >
            <SearchableSelect
              value={data.kommun}
              onValueChange={(v) => {
                setData({ ...data, kommun: v });
                setTimeout(() => {
                  trackStepCompleted(3, v);
                  setStep(4);
                }, 300);
              }}
              placeholder={isLoading ? "Laddar..." : "Välj kommun"}
              options={filteredKommuner}
            />
            <button
              type="button"
              onClick={() => { setSelectedRegion(""); setData({ ...data, kommun: "" }); }}
              className="mt-3 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Byt region
            </button>
          </StepWrapper>
        )}

        {/* Step 4: Anställningsform */}
        {step === 4 && (
          <StepWrapper
            icon={<Briefcase className="w-6 h-6" />}
            title="Vilken är din uppdragsform?"
          >
            <div className="flex flex-col gap-3">
              {([
                { value: "anstalld" as const, label: "Anställd", desc: "Ersättning från arbetsgivare" },
                { value: "foretagare" as const, label: "Eget bolag", desc: "Fakturerar via bemanningsföretag" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setData({ ...data, employmentType: opt.value });
                    trackStepCompleted(4);
                    setTimeout(() => setStep(5), 300);
                  }}
                  className={`py-4 px-5 rounded-lg border text-left transition-all ${
                    data.employmentType === opt.value
                      ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                      : "border-border bg-card hover:border-muted-foreground/30 hover:shadow-sm"
                  }`}
                >
                  <span className="text-sm font-medium">{opt.label}</span>
                  <p className="text-xs text-muted-foreground mt-0.5">{opt.desc}</p>
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 5: Ersättning */}
        {step === 5 && (
          <StepWrapper
            icon={<TrendingUp className="w-6 h-6" />}
            title="Vad får du i ersättning idag?"
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
                    className={`flex-1 py-3 px-4 rounded-lg border text-sm font-medium transition-all ${
                      data.salaryType === opt.value
                        ? "border-primary bg-primary/5 ring-1 ring-primary/30"
                        : "border-border bg-card hover:border-muted-foreground/30"
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
                  : "Ange din månadsersättning före skatt"}
              </p>
            </div>
          </StepWrapper>
        )}

      </div>

      {/* Navigation */}
      {step > 1 && (
        <div className="flex gap-3 mt-10">
          <button
            onClick={handleBack}
            className="flex items-center gap-2 py-3 px-5 rounded-lg text-sm font-medium border border-border text-foreground hover:bg-muted transition-all"
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
                if (!canProceed || saving) return;
                handleNext();
              }}
              disabled={saving}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 px-6 rounded-lg text-sm sm:text-base font-semibold transition-all duration-200 ${
                canProceed && !saving
                  ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
                  : "bg-muted text-muted-foreground cursor-not-allowed"
              }`}
            >
              {saving ? "Sparar..." : "Visa min analys"}
              {!saving && <ArrowRight className="w-5 h-5" />}
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
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-in fade-in slide-in-from-right-4 duration-300 flex-1 flex flex-col">
      <div className="flex items-center gap-3 mb-1">
        <div className="w-9 h-9 rounded-lg bg-primary/8 flex items-center justify-center text-primary">
          {icon}
        </div>
        <div>
          <h2 className="text-lg sm:text-xl font-bold text-foreground tracking-tight">{title}</h2>
          {subtitle && <p className="text-sm text-muted-foreground mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <div className="mt-7 flex-1">{children}</div>
    </div>
  );
}
