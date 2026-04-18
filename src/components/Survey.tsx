import { useState, useMemo, useEffect, useRef, useCallback } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { useLocations, useRates } from "@/hooks/useCalculator";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { useBenchmarkEngine } from "@/hooks/useBenchmarkEngine";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";
import { Input } from "@/components/ui/input";
import {
  Stethoscope, MapPin, Briefcase,
  ChevronLeft, ArrowRight, TrendingUp, Check,
} from "lucide-react";
import { toast } from "sonner";
import { trackEvent } from "@/lib/trackEvent";
import posthog from "@/lib/posthog";

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

// All 63 doctor specializations per Socialstyrelsen — alphabetical
const TOP_DOCTOR_SPECIALTIES = [
  "Akutsjukvård",
  "Allergologi",
  "Allmänmedicin",
  "Anestesi och intensivvård",
  "Arbetsmedicin",
  "Arbets- och miljömedicin",
  "Barn- och ungdomsallergologi",
  "Barn- och ungdomshematologi och onkologi",
  "Barn- och ungdomskardiologi",
  "Barn- och ungdomskirurgi",
  "Barn- och ungdomsmedicin",
  "Barn- och ungdomsneurologi med habilitering",
  "Barn- och ungdomspsykiatri",
  "Beroendemedicin",
  "Endokrinologi och diabetologi",
  "Geriatrik",
  "Gynekologisk onkologi",
  "Handkirurgi",
  "Hematologi",
  "Hud- och könssjukdomar",
  "Hörsel- och balansrubbningar",
  "Infektionssjukdomar",
  "Internmedicin",
  "Kardiologi",
  "Kirurgi",
  "Klinisk farmakologi",
  "Klinisk fysiologi",
  "Klinisk genetik",
  "Klinisk immunologi och transfusionsmedicin",
  "Klinisk kemi",
  "Klinisk mikrobiologi",
  "Klinisk neurofysiologi",
  "Klinisk patologi",
  "Kärlkirurgi",
  "Lungsjukdomar",
  "Medicinsk gastroenterologi och hepatologi",
  "Neonatologi",
  "Neurokirurgi",
  "Neurologi",
  "Neuroradiologi",
  "Njurmedicin",
  "Nuklearmedicin",
  "Obstetrik och gynekologi",
  "Onkologi",
  "Ortopedi",
  "Palliativ medicin",
  "Plastikkirurgi",
  "Psykiatri",
  "Radiologi",
  "Rehabiliteringsmedicin",
  "Reumatologi",
  "Rättsmedicin",
  "Rättspsykiatri",
  "Röst- och talrubbningar",
  "Skolhälsovård",
  "Smärtlindring",
  "Socialmedicin",
  "Thoraxkirurgi",
  "Urologi",
  "Vårdhygien",
  "Äldrepsykiatri",
  "Ögonsjukdomar",
  "Öron-, näs- och halssjukdomar",
];

// Top nurse specializations — ordered by search frequency
const TOP_NURSE_SPECIALIZATIONS = [
  "IVA-sjuksköterska", "Psykiatrisjuksköterska", "Ambulanssjuksköterska",
  "Barnsjuksköterska", "Operationssjuksköterska", "Anestesisjuksköterska",
  "Akutsjuksköterska", "Hjärtsjuksköterska", "Distriktssjuksköterska",
  "Kirurgsjuksköterska", "Palliativsjuksköterska", "Geriatriksjuksköterska",
  "Medicinsjuksköterska", "Onkologisjuksköterska", "Infektionssjuksköterska",
];

const nurseValueMap: Record<string, string> = {
  "Akutsjuksköterska": "Specialistsjuksköterska akutsjukvård",
  "Ambulanssjuksköterska": "Specialistsjuksköterska ambulanssjukvård",
  "Anestesisjuksköterska": "Specialistsjuksköterska anestesi",
  "Barnsjuksköterska": "Specialistsjuksköterska barn och ungdom",
  "Diabetessjuksköterska": "Specialistsjuksköterska diabetesvård",
  "Distriktssjuksköterska": "Distriktssjuksköterska",
  "Hjärtsjuksköterska": "Specialistsjuksköterska hjärtsjukvård",
  "Infektionssjuksköterska": "Specialistsjuksköterska infektionssjukvård",
  "IVA-sjuksköterska": "Specialistsjuksköterska intensivvård",
  "Kirurgsjuksköterska": "Specialistsjuksköterska kirurgisk vård",
  "Medicinsjuksköterska": "Specialistsjuksköterska medicinsk vård",
  "Onkologisjuksköterska": "Specialistsjuksköterska onkologisk vård",
  "Operationssjuksköterska": "Specialistsjuksköterska operationssjukvård",
  "Palliativsjuksköterska": "Specialistsjuksköterska palliativ vård",
  "Psykiatrisjuksköterska": "Specialistsjuksköterska psykiatrisk vård",
  "Geriatriksjuksköterska": "Specialistsjuksköterska vård av äldre",
  "Ögonsjuksköterska": "Specialistsjuksköterska ögonsjukvård",
};

export interface SurveyResult {
  yrke: string;
  kommun: string;
  employmentType: string;
  currentSalary: number;
  salaryType: "hourly" | "monthly";
  obShare: string;
}

interface SurveyProps {
  initialCategory?: OccupationCategory;
  initialRole?: string;
  onBack?: () => void;
  onComplete?: (result: SurveyResult) => void;
}

export default function Survey({ initialCategory, initialRole, onBack, onComplete }: SurveyProps = {}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: locations, isLoading: locLoading } = useLocations();
  const { data: rates, isLoading: ratesLoading } = useRates();
  const [saving, setSaving] = useState(false);

  const getInitialStep = () => {
    if (initialRole) return 3;
    if (initialCategory) return 2;
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

  const STEP_NAMES = ["yrkeskategori", "specialisering", "kommun", "anstallningsform", "uppdragsgivare", "ersattning"];

  // Fire survey_started immediately when survey mounts with a pre-selected category
  // (step 1 is skipped so the click handler there never runs)
  useEffect(() => {
    if (initialCategory) {
      trackSurveyStarted();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Fetch top kommuner based on survey responses
  const [topKommuner, setTopKommuner] = useState<string[]>([]);
  useEffect(() => {
    supabase.rpc("top_kommuner", { lim: 7 }).then(({ data }) => {
      if (data) setTopKommuner(data.map((r: { kommun: string }) => r.kommun));
    });
  }, []);

  // All kommuner for search-first flow
  const allKommuner = useMemo(() => {
    if (!locations) return [];
    return locations
      .map((l) => ({ kommun: l.kommun, region: l.region }))
      .sort((a, b) => a.kommun.localeCompare(b.kommun, "sv"));
  }, [locations]);

  const filteredKommunerSearch = useMemo(() => {
    if (!kommunSearch.trim()) {
      // Show top 7 popular first, then fill remaining alphabetically
      const topSet = new Set(topKommuner);
      const topItems = topKommuner
        .map((k) => allKommuner.find((ak) => ak.kommun === k))
        .filter(Boolean) as typeof allKommuner;
      const rest = allKommuner.filter((k) => !topSet.has(k.kommun));
      return [...topItems, ...rest].slice(0, 10);
    }
    const q = kommunSearch.toLowerCase();
    return allKommuner.filter((k) => k.kommun.toLowerCase().includes(q));
  }, [allKommuner, kommunSearch, topKommuner]);

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
      .map((s) => ({ value: s, label: s, group: "Specialisering" })),
    { value: "__ovrig", label: "Övrig specialisering", group: "Specialisering" },
  ], []);

  const nurseRoleOptions = useMemo(() => [
    { value: "__allman", label: "Allmänsjuksköterska", group: "" },
    { value: "__barnmorska", label: "Barnmorska", group: "" },
    { value: "__rontgen", label: "Röntgensjuksköterska", group: "" },
    ...TOP_NURSE_SPECIALIZATIONS
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
      case 5: return !!data.obShare;
      case 6: return data.currentSalary > 0;
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
        5: data.obShare,
        6: data.currentSalary,
      };
      trackStepCompleted(step, stepAnswers[step]);
      setStep(step + 1);
      return;
    }

    // Snapshot all survey answers into local consts BEFORE any async work
    // to avoid React state timing issues with closures
    const snapshotRole = data.yrke;
    const snapshotZone = data.kommun;
    const snapshotEmploymentType = data.employmentType;
    const snapshotExperience = data.experience;
    const snapshotSalaryType = data.salaryType;
    const snapshotCurrentSalary = data.currentSalary;
    const snapshotObShare = data.obShare;

    // Guard: all 6 steps must have non-empty answers
    const requiredFields = {
      occupationCategory,
      role: snapshotRole,
      zone: snapshotZone,
      employmentType: snapshotEmploymentType,
      obShare: snapshotObShare,
      currentSalary: snapshotCurrentSalary,
    };
    const missingFields = Object.entries(requiredFields).filter(
      ([, v]) => v === undefined || v === null || v === "" || v === 0
    );
    if (missingFields.length > 0) {
      console.error("[Survey] Cannot submit — missing fields:", missingFields.map(([k]) => k));
      setSaving(false);
      return;
    }

    setSaving(true);
    const leadId = crypto.randomUUID();
    const track = "consultant";

    // Identify user in PostHog so all funnel events share the same distinct_id
    try { posthog.identify(leadId); } catch { /* silent */ }
    const couponCode = searchParams.get("coupon");
    const couponParam = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";

    // Helper: navigate to teaser regardless of report creation outcome
    const navigateToTeaser = () => {
      sessionStorage.setItem("leadId", leadId);
      sessionStorage.setItem("surveyData", JSON.stringify({ ...data, track }));
      if (benchmarkResult) sessionStorage.setItem("benchmarkResult", JSON.stringify(benchmarkResult));
      if (pricingResult) sessionStorage.setItem("pricingResult", JSON.stringify(pricingResult));
      trackStepCompleted(6, snapshotObShare);
      const totalTime = surveyStartTime.current ? Math.round((Date.now() - surveyStartTime.current) / 1000) : 0;
      const hourlyRate = snapshotSalaryType === "monthly"
        ? Math.round(snapshotCurrentSalary / 167)
        : snapshotCurrentSalary;

      // Build event payload from snapshot (never from React state)
      const eventPayload = {
        total_steps: TOTAL_STEPS,
        total_time_seconds: totalTime,
        role: snapshotRole,
        zone: snapshotZone,
        current_hourly_rate: hourlyRate,
        experience_years: snapshotExperience,
        employment_type: snapshotEmploymentType === "foretagare" ? "Eget bolag" : "Fast",
        agency_name: null,
        report_id: sessionStorage.getItem("reportId") || null,
      };

      // Validate: log every property and block if any critical field is empty
      console.log("[Survey] survey_completed payload:", eventPayload);
      const criticalKeys = ["role", "zone", "current_hourly_rate", "employment_type"] as const;
      const emptyKeys = criticalKeys.filter((k) => {
        const v = eventPayload[k];
        return v === undefined || v === null || v === "" || v === 0;
      });
      if (emptyKeys.length > 0) {
        console.error("[Survey] survey_completed blocked — empty critical properties:", emptyKeys);
      } else {
        trackEvent("survey_completed", eventPayload);
      }

      if (onComplete) {
        onComplete({
          yrke: snapshotRole,
          kommun: snapshotZone,
          employmentType: snapshotEmploymentType,
          currentSalary: snapshotCurrentSalary,
          salaryType: snapshotSalaryType,
          obShare: snapshotObShare,
        });
        setSaving(false);
        return;
      }

      navigate(`/resultat/${leadId}${couponParam}`);
    };

    try {
      console.log("[Survey] Inserting lead:", leadId);
      const { error } = await supabase.from("leads").insert({
        id: leadId,
        employment_type: snapshotEmploymentType,
        yrke: snapshotRole,
        kommun: snapshotZone,
        experience: snapshotExperience,
        salary_type: snapshotSalaryType,
        current_salary: snapshotCurrentSalary,
        ob_share: snapshotObShare || null,
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
          occupation: snapshotRole,
          employment_type: snapshotEmploymentType,
          kommun: snapshotZone,
          experience: snapshotExperience,
          current_salary: snapshotCurrentSalary,
          salary_type: snapshotSalaryType,
          track,
          commute,
          ob_share: snapshotObShare || null,
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
    if (step === 1) {
      onBack?.();
    } else if (step === 3 && initialRole) {
      onBack?.();
    } else if (step === 3) {
      setKommunSearch("");
      setSelectedRegion("");
      setData({ ...data, kommun: "" });
      setStep(2);
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
          <p className="text-hint mt-2">{step} av {TOTAL_STEPS}</p>
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
                { value: "lakare" as OccupationCategory, label: "Läkare" },
                { value: "ssk" as OccupationCategory, label: "Sjuksköterska / Barnmorska" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    trackSurveyStarted();
                    setOccupationCategory(opt.value);
                    setRoleDropdownValue("");
                    trackStepCompleted(1, opt.value);
                    setTimeout(() => setStep(2), 200);
                  }}
                  className={`group w-full py-5 px-5 rounded-xl border !border-l-[3px] bg-card text-left transition-all active:scale-[0.98] flex items-center justify-between gap-3 ${
                    occupationCategory === opt.value
                      ? "border-primary !border-l-primary bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border !border-l-primary hover:border-primary/40 hover:bg-primary/[0.03]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {occupationCategory === opt.value && (
                      <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                        <Check className="w-3 h-3 text-primary-foreground" />
                      </div>
                    )}
                    <span className="text-base font-semibold text-foreground">{opt.label}</span>
                  </div>
                  <ArrowRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 2: Single dropdown for role selection */}
        {step === 2 && (
          <StepWrapper title="Vad är din specialisering?" subtitle="Vi behöver veta din specialisering för att matcha rätt avtalspriser.">
            <div className="flex flex-col flex-1">
              {/* Upper decorative area */}
              <div className="flex-1 flex flex-col items-center justify-center gap-4 py-6">
                {occupationCategory === "lakare" ? (
                  <Stethoscope className="w-24 h-24 text-muted-foreground/10" strokeWidth={1} />
                ) : (
                  <Briefcase className="w-24 h-24 text-muted-foreground/10" strokeWidth={1} />
                )}
                <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-muted/50 px-3 py-1 text-xs text-muted-foreground">
                  {occupationCategory === "lakare" ? "Läkare" : "Sjuksköterska"}
                </span>
              </div>

              {/* Dropdown card pushed to bottom */}
              <div className="mt-auto rounded-2xl border border-border bg-card p-5">
                <SearchableSelect
                  value={roleDropdownValue}
                  onValueChange={(v) => {
                    setRoleDropdownValue(v);
                    if (v) {
                      setTimeout(() => {
                        trackStepCompleted(2, v);
                        setStep(3);
                      }, 300);
                    }
                  }}
                  placeholder={occupationCategory === "lakare" ? "Välj läkarroll eller specialisering..." : "Välj roll eller vidareutbildning..."}
                  options={occupationCategory === "lakare" ? doctorRoleOptions : nurseRoleOptions}
                />
              </div>
            </div>
          </StepWrapper>
        )}

        {step === 3 && (
          <StepWrapper title="Var jobbar du?">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4 flex flex-col items-center justify-center flex-1">
               <p className="text-body-sm text-center max-w-xs">
                  Ange din kommun där du ska jobba, startlistan visar vanligaste valen.
               </p>

              {/* Search input */}
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground/50" />
                <Input
                  ref={searchInputRef}
                  type="text"
                  value={kommunSearch}
                  onChange={(e) => setKommunSearch(e.target.value)}
                  placeholder="Sök kommun"
                   className="h-12 pl-12 text-base"
                />
              </div>

              {/* Results */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="flex flex-col max-h-[180px] overflow-y-auto [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-primary/25">
                  {filteredKommunerSearch.length === 0 ? (
                    <p className="py-8 text-center text-body-sm">Inga kommuner hittades</p>
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
                        className={`group w-full py-3 px-4 text-left text-sm transition-all flex items-center justify-between border-b border-border/50 last:border-b-0 ${
                          data.kommun === k.kommun
                            ? "bg-primary/[0.08] border-l-2 border-l-primary"
                            : "hover:bg-primary/[0.04]"
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          {data.kommun === k.kommun && (
                            <Check className="w-4 h-4 text-primary shrink-0" />
                          )}
                          <div>
                            <span className="font-medium text-foreground">{k.kommun}</span>
                            <span className="ml-2 text-xs text-muted-foreground">{k.region}</span>
                          </div>
                        </div>
                        <ArrowRight className="w-4 h-4 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                      </button>
                    ))
                  )}
                </div>
              </div>

            </div>
          </StepWrapper>
        )}

        {/* Step 4: Anställningsform */}
        {step === 4 && (
          <StepWrapper title="Är du anställd eller egen företagare?">
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
              {([
                { value: "anstalld" as const, label: "Anställd", desc: "Lön från vårdgivare eller bemanningsföretag" },
                { value: "foretagare" as const, label: "Eget bolag", desc: "Fakturerar via bemanningsföretag eller direkt till slutkund" },
              ]).map((opt) => (
               <button
                  key={opt.value}
                  onClick={() => {
                     setData({ ...data, employmentType: opt.value });
                     setTimeout(() => {
                       trackStepCompleted(4, opt.value);
                       setStep(5);
                     }, 300);
                   }}
                  className={`group w-full py-5 px-5 rounded-xl border !border-l-[3px] bg-card text-left transition-all active:scale-[0.98] flex items-center gap-3 ${
                    data.employmentType === opt.value
                      ? "border-primary !border-l-primary bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border !border-l-primary hover:border-primary/40 hover:bg-primary/[0.03]"
                  }`}
                >
                  {data.employmentType === opt.value && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <span className="text-base font-medium text-foreground">{opt.label}</span>
                </button>
              ))}
            </div>
          </StepWrapper>
        )}

        {/* Step 5: Uppdragsgivare */}
        {step === 5 && (
          <StepWrapper title="Vem är din uppdragsgivare?">
            <div className="rounded-2xl border border-border bg-card p-5 flex flex-col gap-3">
              {([
                { value: "bemanningsforetag", label: "Bemanningsföretag" },
                { value: "region", label: "Region" },
                { value: "kommun", label: "Kommun" },
                { value: "privat_vardgivare", label: "Privat vårdgivare" },
              ]).map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                     setData({ ...data, obShare: opt.value });
                     setTimeout(() => {
                       trackStepCompleted(5, opt.value);
                       setStep(6);
                     }, 300);
                  }}
                  className={`group w-full py-5 px-5 rounded-xl border !border-l-[3px] bg-card text-left transition-all active:scale-[0.98] flex items-center gap-3 ${
                    data.obShare === opt.value
                      ? "border-primary !border-l-primary bg-primary/[0.06] ring-1 ring-primary/20"
                      : "border-border !border-l-primary hover:border-primary/40 hover:bg-primary/[0.03]"
                  }`}
                >
                  {data.obShare === opt.value && (
                    <div className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-primary-foreground" />
                    </div>
                  )}
                  <span className="text-base font-medium text-foreground">{opt.label}</span>
                </button>
              ))}
              {data.obShare === "privat_vardgivare" && (
                <p className="text-hint text-center mt-1 px-2">
                  Analysen baseras på SKR:s ramavtal och kan avvika från privata avtal. Resultatet ger en marknadsjämförelse.
                </p>
              )}
            </div>
          </StepWrapper>
        )}

        {/* Step 6: Ersättning (final step) */}
        {step === 6 && (
          <StepWrapper title="Vad får du i ersättning idag?">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
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
                  placeholder="Ange ersättning"
                  value={data.currentSalary || ""}
                  onChange={(e) => setData({ ...data, currentSalary: Number(e.target.value) })}
                  className="h-16 text-2xl font-semibold pr-20 text-center"
                  
                />
                <span className="absolute right-5 top-1/2 -translate-y-1/2 text-base text-muted-foreground font-medium">
                  {data.salaryType === "hourly" ? "kr/h" : "kr/mån"}
                </span>
              </div>
               <p className="text-body-sm text-center">
                 {data.salaryType === "hourly"
                   ? "Timersättning före skatt"
                   : "Månadsersättning före skatt"}
               </p>
            </div>
          </StepWrapper>
        )}


      </div>

      {/* Navigation */}
      <div className={`flex gap-3 mt-8 ${step === 6 ? "sticky bottom-0 bg-background pt-3 pb-4 -mx-1 px-1 z-10" : ""}`}>
        {(step > 1 || onBack) && (
          <button
            onClick={handleBack}
            className="flex items-center gap-1.5 py-3.5 px-5 rounded-xl text-sm font-medium text-muted-foreground hover:text-foreground transition-all active:scale-[0.97]"
          >
            <ChevronLeft className="w-4 h-4" />
            Tillbaka
          </button>
        )}
        {step !== 3 && step !== 6 && (
          <button
            onClick={() => {
              if (!canProceed) return;
              handleNext();
            }}
            disabled={!canProceed}
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
        {step === 6 && (
          <button
            onClick={() => {
              if (data.currentSalary <= 0) {
                toast.error("Ange ersättning innan du fortsätter");
                return;
              }
              if (!canProceed) return;
              trackStepCompleted(6, data.currentSalary);
              handleNext();
            }}
            disabled={saving}
            className={`flex-1 flex items-center justify-center gap-2 py-4 px-6 rounded-xl text-base font-semibold transition-all duration-200 active:scale-[0.97] ${
              canProceed && !saving
                ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                : "bg-muted text-muted-foreground cursor-not-allowed"
            }`}
          >
            {saving ? "Analyserar..." : "Visa min analys"}
            {!saving && <ArrowRight className="w-5 h-5" />}
          </button>
        )}
      </div>

      <p className="text-center text-micro mt-8">
        Dina uppgifter hanteras enligt vår{" "}
        <Link to="/integritetspolicy" className="text-primary/70 hover:text-primary underline underline-offset-2 transition-colors">
          integritetspolicy
        </Link>.
      </p>
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
        <h2 className="text-2xl font-bold text-foreground tracking-tight leading-tight">{title}</h2>
        {subtitle && <p className="text-body-sm mt-1">{subtitle}</p>}
      </div>
      <div className="flex-1 flex flex-col">{children}</div>
    </div>
  );
}
