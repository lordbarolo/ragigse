import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  createContext,
  useContext,
} from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowLeft, ArrowRight, Briefcase, Building2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect, { type Option } from "@/components/SearchableSelect";
import { useLocations } from "@/hooks/useCalculator";
import { usePricingEngine } from "@/hooks/usePricingEngine";
import { trackEvent } from "@/lib/trackEvent";
import { aliasLead } from "@/lib/identify";
import {
  DOCTOR_SPECIALTIES,
  NURSE_SPECIALIZATIONS,
  NURSE_VALUE_MAP as nurseValueMap,
} from "@/lib/specialityLists";
import { toast } from "sonner";

const SurveyThemeContext = createContext<"dark" | "light">("dark");

function useSurveyTheme() {
  return useContext(SurveyThemeContext);
}

type Category = "" | "lakare" | "ssk" | "barnmorska";
type EmploymentType = "" | "anstalld" | "foretagare";

const TOTAL_STEPS = 5;
const STEP_NAMES = ["yrkeskategori", "specialisering", "anstallningsform", "kommun", "ersattning"];

interface State {
  category: Category;
  roleValue: string;
  yrke: string;
  kommun: string;
  region: string;
  employmentType: EmploymentType;
  currentSalary: string;
}

const initialState: State = {
  category: "",
  roleValue: "",
  yrke: "",
  kommun: "",
  region: "",
  employmentType: "",
  currentSalary: "",
};

export default function InlineTerminalSurvey({
  variant = "dark",
}: {
  variant?: "dark" | "light";
}) {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: locations } = useLocations();
  const { calculate: pricingCalculate, result: pricingResult } = usePricingEngine();

  const [step, setStep] = useState(1);
  const [direction, setDirection] = useState<1 | -1>(1);
  const [s, setS] = useState<State>(initialState);
  const [saving, setSaving] = useState(false);

  const surveyStarted = useRef(false);
  const surveyStartTime = useRef<number | null>(null);
  const stepEntryTime = useRef<number>(Date.now());

  useEffect(() => {
    trackEvent("survey_mounted", {
      has_initial_category: false,
      initial_category: null,
      initial_role: null,
      surface: "inline_terminal",
    });
  }, []);

  useEffect(() => {
    stepEntryTime.current = Date.now();
    trackEvent("survey_step_viewed", {
      step_number: step,
      step_name: STEP_NAMES[step - 1] || `step_${step}`,
      surface: "inline_terminal",
    });
  }, [step]);

  const trackStarted = useCallback(() => {
    if (surveyStarted.current) return;
    surveyStarted.current = true;
    surveyStartTime.current = Date.now();
    trackEvent("survey_started", { surface: "inline_terminal" });
  }, []);

  const trackStepCompleted = useCallback((n: number, ans?: string | number) => {
    const dt = Math.round((Date.now() - stepEntryTime.current) / 1000);
    trackEvent("survey_step_completed", {
      step_number: n,
      step_name: STEP_NAMES[n - 1] || `step_${n}`,
      time_on_step_seconds: dt,
      step_answer: ans ?? null,
      surface: "inline_terminal",
    });
  }, []);

  const resolvedYrke = useMemo(() => {
    if (!s.roleValue) return "";
    if (s.category === "lakare") {
      if (s.roleValue === "__leg") return "Legitimerad läkare";
      if (s.roleValue === "__st") return "ST-läkare";
      if (s.roleValue === "__ovrig") return "Specialistläkare";
      return `Specialistläkare ${s.roleValue.toLowerCase()}`;
    }
    if (s.category === "ssk") {
      if (s.roleValue === "__allman") return "Sjuksköterska";
      if (s.roleValue === "__rontgen") return "Röntgensjuksköterska";
      if (s.roleValue === "__ovrig") return "Specialistsjuksköterska";
      return nurseValueMap[s.roleValue] || s.roleValue;
    }
    if (s.category === "barnmorska") return "Barnmorska";
    return "";
  }, [s.category, s.roleValue]);

  useEffect(() => {
    if (resolvedYrke) setS((p) => ({ ...p, yrke: resolvedYrke }));
  }, [resolvedYrke]);

  useEffect(() => {
    if (s.yrke && s.kommun && s.employmentType) {
      pricingCalculate(s.yrke, s.kommun, s.employmentType as "anstalld" | "foretagare");
    }
  }, [s.yrke, s.kommun, s.employmentType]);

  const doctorRoleOptions: Option[] = useMemo(
    () => [
      { value: "__leg", label: "Leg. läkare" },
      { value: "__st", label: "ST-läkare" },
      ...DOCTOR_SPECIALTIES.map((x) => ({ value: x, label: x })),
      { value: "__ovrig", label: "Övrig specialisering" },
    ],
    [],
  );

  const nurseRoleOptions: Option[] = useMemo(
    () => [
      { value: "__allman", label: "Allmänsjuksköterska", group: "" },
      { value: "__rontgen", label: "Röntgensjuksköterska", group: "" },
      ...NURSE_SPECIALIZATIONS.map((x) => ({ value: x, label: x, group: "Vidareutbildning (VUB)" })),
      { value: "__ovrig", label: "Övrig VUB", group: "Vidareutbildning (VUB)" },
    ],
    [],
  );

  const allKommuner = useMemo(() => {
    if (!locations) return [];
    return locations
      .map((l) => ({ kommun: l.kommun, region: l.region }))
      .sort((a, b) => a.kommun.localeCompare(b.kommun, "sv"));
  }, [locations]);

  const goNext = (fromStep: number, ans?: string | number) => {
    trackStepCompleted(fromStep, ans);
    if (fromStep < TOTAL_STEPS) {
      setDirection(1);
      setStep(fromStep + 1);
    }
  };

  const goBack = () => {
    if (step <= 1) return;
    setDirection(-1);
    // Skip step 2 (specialisering) when category is barnmorska
    if (step === 3 && s.category === "barnmorska") {
      setStep(1);
      return;
    }
    setStep(step - 1);
  };

  // Step 1: select category (no auto-advance — user clicks CTA)
  const handleCategory = (v: Category) => {
    trackStarted();
    const isBarnmorska = v === "barnmorska";
    setS((p) => ({
      ...p,
      category: v,
      roleValue: isBarnmorska ? "__barnmorska" : "",
      yrke: isBarnmorska ? "Barnmorska" : "",
    }));
  };

  const handleStartCompare = () => {
    if (!s.category) return;
    const isBarnmorska = s.category === "barnmorska";
    trackStepCompleted(1, s.category);
    setDirection(1);
    setStep(isBarnmorska ? 3 : 2);
  };

  const handleRole = (v: string) => {
    setS((p) => ({ ...p, roleValue: v }));
    window.setTimeout(() => goNext(2, v), 280);
  };

  const handleEmployment = (v: EmploymentType) => {
    setS((p) => ({ ...p, employmentType: v }));
    window.setTimeout(() => goNext(3, v), 280);
  };

  const handleKommun = (v: string) => {
    const match = allKommuner.find((k) => k.kommun === v);
    setS((p) => ({ ...p, kommun: v, region: match?.region || "" }));
    window.setTimeout(() => goNext(4, v), 280);
  };

  const salaryType: "hourly" | "monthly" = "hourly";
  const salaryUnit = "kr/h";

  const submit = async () => {
    setSaving(true);
    const leadId = crypto.randomUUID();
    const track = "consultant";
    const couponCode = searchParams.get("coupon");
    const couponParam = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";
    const currentSalaryNum = Number(s.currentSalary.replace(/\s/g, "")) || 0;

    aliasLead(leadId, {
      role: s.yrke,
      zone: s.kommun,
      employment_type: s.employmentType,
      current_hourly_rate: salaryType === "hourly" ? currentSalaryNum : 0,
    });

    const navigateToTeaser = () => {
      sessionStorage.setItem("leadId", leadId);
      sessionStorage.setItem(
        "surveyData",
        JSON.stringify({
          email: "",
          employmentType: s.employmentType,
          yrke: s.yrke,
          kommun: s.kommun,
          experience: 5,
          salaryType,
          currentSalary: currentSalaryNum,
          obShare: "bemanningsforetag",
          track,
        }),
      );
      if (pricingResult) sessionStorage.setItem("pricingResult", JSON.stringify(pricingResult));
      trackStepCompleted(5, currentSalaryNum);
      const totalTime = surveyStartTime.current
        ? Math.round((Date.now() - surveyStartTime.current) / 1000)
        : 0;
      trackEvent("survey_completed", {
        total_steps: TOTAL_STEPS,
        total_time_seconds: totalTime,
        role: s.yrke,
        zone: s.kommun,
        current_hourly_rate: currentSalaryNum,
        current_monthly_salary: 0,
        experience_years: 5,
        employment_type: s.employmentType === "foretagare" ? "Eget bolag" : "Fast",
        agency_name: null,
        report_id: sessionStorage.getItem("reportId") || null,
        surface: "inline_terminal",
      });
      navigate(`/resultat/${leadId}${couponParam}`);
    };

    try {
      const { error } = await supabase.from("leads").insert({
        id: leadId,
        employment_type: s.employmentType,
        yrke: s.yrke,
        kommun: s.kommun,
        experience: 5,
        salary_type: salaryType,
        current_salary: currentSalaryNum,
        ob_share: "bemanningsforetag",
      });
      if (error) throw error;

      const reportPromise = supabase.functions.invoke("create-report", {
        body: {
          lead_id: leadId,
          occupation: s.yrke,
          employment_type: s.employmentType,
          kommun: s.kommun,
          experience: 5,
          current_salary: currentSalaryNum,
          salary_type: salaryType,
          track,
          commute: "",
          ob_share: "bemanningsforetag",
        },
      });
      const timeoutPromise = new Promise<{ data: null; error: Error }>((resolve) =>
        setTimeout(() => resolve({ data: null, error: new Error("create-report timeout") }), 3000),
      );
      const { data: rpt } = await Promise.race([reportPromise, timeoutPromise]);
      if (rpt?.report_id) {
        sessionStorage.setItem("reportId", rpt.report_id);
        if (rpt.ab_variant) sessionStorage.setItem("abVariant", rpt.ab_variant);
      }
      navigateToTeaser();
    } catch (err) {
      console.error("[InlineTerminalSurvey] submit error", err);
      try {
        navigateToTeaser();
      } catch {
        toast.error("Kunde inte spara dina uppgifter. Försök igen.");
        setSaving(false);
      }
    }
  };

  const progressPct = (step / TOTAL_STEPS) * 100;
  const isLight = variant === "light";

  const containerBg = isLight
    ? "rounded-xl border border-[#E5E5E5] bg-white p-6 md:p-10 shadow-xl"
    : "rounded-xl border border-[#2D2D2D] bg-[#1A1A1A] p-6 md:p-10 shadow-2xl";
  const progressTrackBg = isLight ? "bg-black/5" : "bg-white/5";
  const stepTextColor = isLight ? "text-[#1A1A1A]" : "text-white";
  const backBtnColor = isLight
    ? "text-[#9CA3AF] hover:text-[#4B5563]"
    : "text-white/40 hover:text-white/80";

  return (
    <SurveyThemeContext.Provider value={variant}>
      <div
        data-dark-surface={isLight ? undefined : ""}
        className="relative w-full mx-auto mt-0 md:mt-0 text-left"
      >
        <div className={`${containerBg} ${isLight ? "form-light" : ""} overflow-x-hidden`}>
          {/* Progress bar */}
          <div className={`h-[2px] ${progressTrackBg} -mx-6 -mt-6 mb-6`}>
            <div
              className="h-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-500 ease-out"
              style={{ width: `${progressPct}%` }}
            />
          </div>

          {/* Step content (fixed min-height to avoid jump) */}
          <div className={`relative font-sans ${stepTextColor} min-h-[280px] overflow-x-hidden`}>
            <StepTransition stepKey={step} direction={direction}>
              {step === 1 && (
                <Step question="Vad jobbar du som?">
                  <div className="space-y-4">
                    <SearchableSelect
                      value={s.category}
                      onValueChange={(v) => handleCategory(v as Category)}
                      placeholder="Välj yrke..."
                      options={[
                        { value: "lakare", label: "Läkare" },
                        { value: "ssk", label: "Sjuksköterska" },
                        { value: "barnmorska", label: "Barnmorska" },
                      ]}
                      triggerClassName={
                        isLight
                          ? "bg-white border-[#E5E5E5] text-[#1A1A1A] !focus:ring-[#534AB7]"
                          : "bg-[#2D2D2D] border-[#3D3D3D] text-[#E5E5E5] !focus:ring-[#534AB7]"
                      }
                      placeholderClassName={isLight ? "text-[#9CA3AF]" : "text-[#6B7280]"}
                    />
                    <button
                      onClick={handleStartCompare}
                      disabled={!s.category}
                      className="w-full inline-flex items-center justify-center font-semibold text-base rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                      style={
                        isLight
                          ? {
                              backgroundColor: "#534AB7",
                              color: "#FFFFFF",
                              border: "1px solid #534AB7",
                              padding: "14px",
                            }
                          : {
                              backgroundColor: "#EEEBE4",
                              color: "#1A1A1A",
                              border: "1px solid rgba(0,0,0,0.15)",
                              padding: "14px",
                            }
                      }
                    >
                      Jämför min lön
                    </button>
                  </div>
                </Step>
              )}

              {step === 2 && (
                <Step
                  question="Vad är din specialitet?"
                  subtitle={
                    s.category === "lakare"
                      ? "Välj din specialisering – sökbar lista."
                      : "Välj din roll eller vidareutbildning."
                  }
                >
                  <SearchableSelect
                    value={s.roleValue}
                    onValueChange={handleRole}
                    placeholder={s.category === "lakare" ? "Välj specialisering…" : "Välj roll…"}
                    options={s.category === "lakare" ? doctorRoleOptions : nurseRoleOptions}
                  />
                </Step>
              )}

              {step === 3 && (
                <Step
                  question="Hur driver du ditt uppdrag?"
                  subtitle="Detta avgör hur ersättningen beräknas."
                >
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <ChoiceCard
                      icon={<Briefcase className="w-5 h-5" />}
                      title="Anställd"
                      sub="A-skatt"
                      active={s.employmentType === "anstalld"}
                      onClick={() => handleEmployment("anstalld")}
                    />
                    <ChoiceCard
                      icon={<Building2 className="w-5 h-5" />}
                      title="Eget företag"
                      sub="F-skatt"
                      active={s.employmentType === "foretagare"}
                      onClick={() => handleEmployment("foretagare")}
                    />
                  </div>
                </Step>
              )}

              {step === 4 && (
                <Step
                  question="På vilken ort ska du arbeta?"
                  subtitle="Sök bland Sveriges kommuner."
                >
                  <SearchableSelect
                    value={s.kommun}
                    onValueChange={handleKommun}
                    placeholder="Sök kommun…"
                    options={allKommuner.map((k) => ({
                      value: k.kommun,
                      label: k.kommun,
                      group: k.region,
                    }))}
                  />
                </Step>
              )}

              {step === 5 && (
                <Step
                  question="Vad har du för ersättning idag?"
                  subtitle={
                    salaryType === "hourly"
                      ? "Ange ditt nuvarande timpris (kr/h, exkl. moms)."
                      : "Ange din nuvarande månadslön (kr/mån, brutto)."
                  }
                >
                  <div className="space-y-4">
                    <div className="relative">
                      <input
                        type="text"
                        inputMode="numeric"
                        autoFocus
                        value={s.currentSalary}
                        onChange={(e) => {
                          const v = e.target.value.replace(/[^\d\s]/g, "");
                          setS((p) => ({ ...p, currentSalary: v }));
                        }}
                        placeholder={salaryType === "hourly" ? "t.ex. 1100" : "t.ex. 48000"}
                        className={`w-full border rounded-lg px-4 py-3 pr-16 text-base transition-colors focus:outline-none ${
                          isLight
                            ? "bg-[#FAFAFA] border-[#E5E5E5] text-[#1A1A1A] placeholder:text-[#9CA3AF] focus:border-violet-400/60 focus:bg-white"
                            : "bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus:border-violet-400/60 focus:bg-white/[0.06]"
                        }`}
                      />
                      <span
                        className={`absolute right-4 top-1/2 -translate-y-1/2 text-[12px] font-mono pointer-events-none ${
                          isLight ? "text-[#9CA3AF]" : "text-white/40"
                        }`}
                      >
                        {salaryUnit}
                      </span>
                    </div>
                    <button
                      onClick={submit}
                      disabled={!s.currentSalary || saving}
                      className={`inline-flex items-center justify-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg transition-all ${
                        s.currentSalary && !saving
                          ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_30px_-8px_rgba(129,85,255,0.8)] hover:shadow-[0_0_40px_-6px_rgba(255,45,170,0.6)]"
                          : isLight
                            ? "bg-[#F5F5F5] text-[#9CA3AF] cursor-not-allowed"
                            : "bg-white/10 text-white/40 cursor-not-allowed"
                      }`}
                    >
                      {saving ? "Bearbetar…" : "Visa resultat"}
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </Step>
              )}
            </StepTransition>
          </div>

          {/* Back link */}
          <div className="flex items-center justify-between pb-3 min-h-[28px]">
            {step > 1 ? (
              <button
                onClick={goBack}
                className={`inline-flex items-center gap-1 text-[11px] font-mono transition-colors ${backBtnColor}`}
              >
                <ArrowLeft className="w-3 h-3" />
                Tillbaka
              </button>
            ) : (
              <span />
            )}
          </div>
        </div>
      </div>
    </SurveyThemeContext.Provider>
  );
}

function Step({
  question,
  subtitle,
  children,
}: {
  question: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  const theme = useSurveyTheme();
  const isLight = theme === "light";
  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <h2
          className={`text-xl sm:text-2xl font-semibold tracking-tight ${
            isLight ? "text-[#1A1A1A]" : "text-white"
          }`}
        >
          {question}
        </h2>
        {subtitle && (
          <div
            className={`text-sm leading-relaxed ${
              isLight ? "text-[#6B7280]" : "text-white/50"
            }`}
          >
            {subtitle}
          </div>
        )}
      </div>
      <div>{children}</div>
    </div>
  );
}

function StepTransition({
  stepKey,
  direction,
  children,
}: {
  stepKey: number;
  direction: 1 | -1;
  children: React.ReactNode;
}) {
  const [render, setRender] = useState({ key: stepKey, children });
  const [entering, setEntering] = useState(false);

  useEffect(() => {
    if (stepKey === render.key) {
      setRender((r) => ({ ...r, children }));
      return;
    }
    setEntering(true);
    const t = window.setTimeout(() => {
      setRender({ key: stepKey, children });
      // next frame -> end entering
      requestAnimationFrame(() => requestAnimationFrame(() => setEntering(false)));
    }, 180);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stepKey, children]);

  const translate = entering
    ? direction === 1
      ? "-translate-x-3 opacity-0"
      : "translate-x-3 opacity-0"
    : "translate-x-0 opacity-100";

  return (
    <div
      key={render.key}
      className={`transition-all duration-300 ease-in-out ${translate}`}
    >
      {render.children}
    </div>
  );
}

function ChoiceCard({
  icon,
  title,
  sub,
  active,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  sub: string;
  active: boolean;
  onClick: () => void;
}) {
  const theme = useSurveyTheme();
  const isLight = theme === "light";

  const inactiveClasses = isLight
    ? "border-[#E5E5E5] bg-[#FAFAFA] hover:border-[#D4D4D4] hover:bg-[#F5F5F5]"
    : "border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]";

  const activeClasses = isLight
    ? "border-violet-400/60 bg-violet-50 shadow-[0_0_20px_-10px_rgba(129,85,255,0.3)]"
    : "border-violet-400/60 bg-violet-500/10 shadow-[0_0_30px_-10px_rgba(129,85,255,0.7)]";

  const iconInactive = isLight
    ? "bg-[#F5F5F5] text-[#6B7280]"
    : "bg-white/5 text-white/70";

  const iconActive = isLight
    ? "bg-violet-100 text-violet-700"
    : "bg-violet-500/20 text-violet-200";

  const titleColor = isLight ? "text-[#1A1A1A]" : "text-white";
  const subColor = isLight ? "text-[#9CA3AF]" : "text-white/40";

  return (
    <button
      onClick={onClick}
      className={`group relative text-left rounded-xl border p-4 transition-all overflow-hidden ${
        active ? activeClasses : inactiveClasses
      }`}
    >
      <div className="flex items-center gap-3">
        <span
          className={`flex h-9 w-9 items-center justify-center rounded-lg ${
            active ? iconActive : iconInactive
          }`}
        >
          {icon}
        </span>
        <div>
          <div className={`text-sm font-semibold ${titleColor}`}>{title}</div>
          <div className={`text-[11px] font-mono tracking-wide ${subColor}`}>{sub}</div>
        </div>
      </div>
    </button>
  );
}
