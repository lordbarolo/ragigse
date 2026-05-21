import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { ArrowRight, ChevronLeft, MapPin, Pencil, Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect, { type Option } from "@/components/SearchableSelect";
import { Input } from "@/components/ui/input";
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

type Category = "" | "lakare" | "ssk";
type EmploymentType = "" | "anstalld" | "foretagare";
type SalaryType = "hourly" | "monthly";

const TOTAL_STEPS = 5;
const STEP_NAMES = ["yrkeskategori", "specialisering", "kommun", "anstallningsform", "ersattning"];
const STEP_PROMPTS = [
  "select_role_category",
  "select_specialization",
  "select_municipality",
  "select_employment_type",
  "enter_compensation",
];
const STEP_LABELS = ["Yrke", "Specialisering", "Kommun", "Anställning", "Ersättning"];

interface State {
  category: Category;
  roleValue: string;
  yrke: string;
  kommun: string;
  region: string;
  employmentType: EmploymentType;
  salaryType: SalaryType;
  currentSalary: number;
}

const initialState: State = {
  category: "",
  roleValue: "",
  yrke: "",
  kommun: "",
  region: "",
  employmentType: "",
  salaryType: "hourly",
  currentSalary: 0,
};

export default function InlineTerminalSurvey() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { data: locations } = useLocations();
  const { calculate: pricingCalculate, result: pricingResult } = usePricingEngine();

  const [step, setStep] = useState(1);
  const [s, setS] = useState<State>(initialState);
  const [kommunSearch, setKommunSearch] = useState("");
  const [saving, setSaving] = useState(false);

  const surveyStarted = useRef(false);
  const surveyStartTime = useRef<number | null>(null);
  const stepEntryTime = useRef<number>(Date.now());

  // Lifecycle tracking — mirror Survey.tsx
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

  // Derive yrke from category + roleValue (mirrors Survey.tsx)
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
      if (s.roleValue === "__barnmorska") return "Barnmorska";
      if (s.roleValue === "__rontgen") return "Röntgensjuksköterska";
      if (s.roleValue === "__ovrig") return "Specialistsjuksköterska";
      return nurseValueMap[s.roleValue] || s.roleValue;
    }
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

  // Options
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
      { value: "__barnmorska", label: "Barnmorska", group: "" },
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

  const filteredKommuner = useMemo(() => {
    const q = kommunSearch.trim().toLowerCase();
    if (!q) return [] as typeof allKommuner;
    return allKommuner.filter((k) => k.kommun.toLowerCase().includes(q)).slice(0, 14);
  }, [allKommuner, kommunSearch]);

  // Display labels for chips
  const displayRole = useMemo(() => {
    if (!s.roleValue) return "";
    if (s.category === "lakare") {
      if (s.roleValue === "__leg") return "Leg. läkare";
      if (s.roleValue === "__st") return "ST-läkare";
      if (s.roleValue === "__ovrig") return "Specialistläkare";
      return s.roleValue;
    }
    if (s.category === "ssk") {
      if (s.roleValue === "__allman") return "Allmänsjuksköterska";
      if (s.roleValue === "__barnmorska") return "Barnmorska";
      if (s.roleValue === "__rontgen") return "Röntgensjuksköterska";
      if (s.roleValue === "__ovrig") return "Specialistsjuksköterska";
      return s.roleValue;
    }
    return "";
  }, [s.category, s.roleValue]);

  const chipValues: Array<{ idx: number; label: string; value: string }> = useMemo(() => {
    const out: Array<{ idx: number; label: string; value: string }> = [];
    if (s.category) out.push({ idx: 1, label: STEP_LABELS[0], value: s.category === "lakare" ? "Läkare" : "Sjuksköterska" });
    if (displayRole) out.push({ idx: 2, label: STEP_LABELS[1], value: displayRole });
    if (s.kommun) out.push({ idx: 3, label: STEP_LABELS[2], value: s.kommun });
    if (s.employmentType) out.push({ idx: 4, label: STEP_LABELS[3], value: s.employmentType === "anstalld" ? "Anställd" : "Eget bolag" });
    if (s.currentSalary > 0) out.push({ idx: 5, label: STEP_LABELS[4], value: `${s.currentSalary} ${s.salaryType === "hourly" ? "kr/h" : "kr/mån"}` });
    return out.filter((c) => c.idx < step);
  }, [s, displayRole, step]);

  const canProceed = (() => {
    switch (step) {
      case 1: return !!s.category;
      case 2: return !!resolvedYrke;
      case 3: return !!s.kommun;
      case 4: return !!s.employmentType;
      case 5: return s.currentSalary > 0;
      default: return false;
    }
  })();

  const handleNext = async () => {
    if (step < TOTAL_STEPS) {
      const ans: Record<number, string | number> = {
        1: s.category, 2: s.roleValue, 3: s.kommun, 4: s.employmentType, 5: s.currentSalary,
      };
      trackStepCompleted(step, ans[step]);
      setStep(step + 1);
      return;
    }
    await submit();
  };

  const submit = async () => {
    setSaving(true);
    const leadId = crypto.randomUUID();
    const track = "consultant";
    const couponCode = searchParams.get("coupon");
    const couponParam = couponCode ? `?coupon=${encodeURIComponent(couponCode)}` : "";

    const hourlyRateForProps = s.salaryType === "monthly"
      ? Math.round(s.currentSalary / 167)
      : s.currentSalary;
    aliasLead(leadId, {
      role: s.yrke,
      zone: s.kommun,
      employment_type: s.employmentType,
      current_hourly_rate: hourlyRateForProps,
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
          salaryType: s.salaryType,
          currentSalary: s.currentSalary,
          obShare: "bemanningsforetag",
          track,
        }),
      );
      if (pricingResult) sessionStorage.setItem("pricingResult", JSON.stringify(pricingResult));
      trackStepCompleted(5, s.currentSalary);
      const totalTime = surveyStartTime.current
        ? Math.round((Date.now() - surveyStartTime.current) / 1000)
        : 0;
      trackEvent("survey_completed", {
        total_steps: TOTAL_STEPS,
        total_time_seconds: totalTime,
        role: s.yrke,
        zone: s.kommun,
        current_hourly_rate: hourlyRateForProps,
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
        salary_type: s.salaryType,
        current_salary: s.currentSalary,
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
          current_salary: s.currentSalary,
          salary_type: s.salaryType,
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
      try { navigateToTeaser(); } catch {
        toast.error("Kunde inte spara dina uppgifter. Försök igen.");
        setSaving(false);
      }
    }
  };

  const goToStep = (n: number) => setStep(n);

  // ── Render ─────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full max-w-2xl mx-auto mt-8 text-left">
      {/* Glow gradients behind card */}
      <div className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-3xl">
        <div className="absolute -top-20 left-1/4 h-64 w-64 rounded-full bg-[#8155FF]/30 blur-3xl" />
        <div className="absolute -bottom-20 right-1/4 h-64 w-64 rounded-full bg-cyan-500/20 blur-3xl" />
      </div>

      <div className="rounded-2xl border border-white/10 bg-[#0D001A]/90 backdrop-blur-xl shadow-2xl overflow-hidden">
        {/* Window header */}
        <div className="flex items-center gap-2 px-4 py-3 border-b border-white/10 bg-white/[0.02]">
          <div className="flex gap-1.5">
            <span className="w-3 h-3 rounded-full bg-[#ff5f57]" />
            <span className="w-3 h-3 rounded-full bg-[#febc2e]" />
            <span className="w-3 h-3 rounded-full bg-[#28c840]" />
          </div>
          <span className="font-mono text-[11px] text-white/40 ml-2 tracking-wide">
            compcare://salary-check
          </span>
          <span className="ml-auto font-mono text-[11px] text-cyan-300/70">
            STEG {step} / {TOTAL_STEPS}
          </span>
        </div>

        <div className="p-5 sm:p-7 font-sans text-white">
          {/* Chips: answered questions */}
          {chipValues.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-5">
              {chipValues.map((c) => (
                <button
                  key={c.idx}
                  onClick={() => goToStep(c.idx)}
                  className="group inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70 hover:bg-violet-500/20 hover:border-violet-400/40 transition-all"
                  title={`Ändra ${c.label.toLowerCase()}`}
                >
                  <span className="text-white/40">{c.label}:</span>
                  <span className="font-medium text-white">{c.value}</span>
                  <Pencil className="w-3 h-3 text-white/30 group-hover:text-violet-300" />
                </button>
              ))}
            </div>
          )}

          {/* Mono prompt */}
          <div className="font-mono text-[12px] text-cyan-300/90 mb-2 flex items-center gap-2">
            <span className="text-violet-400">$</span>
            <span>{STEP_PROMPTS[step - 1]}</span>
            <span className="inline-block w-2 h-3.5 bg-cyan-300/80 animate-pulse" />
          </div>

          {/* Step content */}
          <div className="min-h-[220px]">
            {step === 1 && (
              <StepShell question="Vad jobbar du som?">
                <div className="grid sm:grid-cols-2 gap-3">
                  {([
                    { value: "lakare" as Category, label: "Läkare" },
                    { value: "ssk" as Category, label: "Sjuksköterska / Barnmorska" },
                  ]).map((opt) => {
                    const active = s.category === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => {
                          trackStarted();
                          setS((p) => ({ ...p, category: opt.value, roleValue: "", yrke: "" }));
                        }}
                        className={`group relative rounded-xl border px-5 py-4 text-left transition-all ${
                          active
                            ? "border-violet-400/60 bg-violet-500/10 shadow-[0_0_30px_-10px_rgba(129,85,255,0.6)]"
                            : "border-white/10 bg-white/[0.03] hover:border-violet-400/30 hover:bg-white/[0.05]"
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <span className="text-base font-semibold">{opt.label}</span>
                          {active ? (
                            <Check className="w-4 h-4 text-violet-300" />
                          ) : (
                            <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-violet-300" />
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 2 && (
              <StepShell question={s.category === "lakare" ? "Vilken specialisering?" : "Vilken roll?"}>
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <SearchableSelect
                    value={s.roleValue}
                    onValueChange={(v) => setS((p) => ({ ...p, roleValue: v }))}
                    placeholder={s.category === "lakare" ? "Välj specialisering..." : "Välj din roll..."}
                    options={s.category === "lakare" ? doctorRoleOptions : nurseRoleOptions}
                  />
                </div>
                <p className="mt-3 font-mono text-[11px] text-white/40">
                  // matchar SKR:s ramavtal 2026 — 60+ roller
                </p>
              </StepShell>
            )}

            {step === 3 && (
              <StepShell question="På vilken ort ska du arbeta?">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-3 space-y-3">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                    <Input
                      autoFocus
                      value={kommunSearch}
                      onChange={(e) => setKommunSearch(e.target.value)}
                      placeholder="Sök kommun (t.ex. Stockholm)"
                      className="h-11 pl-10 bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-400/40"
                    />
                  </div>
                  {kommunSearch.trim().length > 0 && (
                    <div className="max-h-[220px] overflow-y-auto rounded-lg border border-white/10 divide-y divide-white/5">
                      {filteredKommuner.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-white/50 text-center">Inga träffar</p>
                      ) : (
                        filteredKommuner.map((k) => {
                          const active = s.kommun === k.kommun;
                          return (
                            <button
                              key={k.kommun}
                              onClick={() => setS((p) => ({ ...p, kommun: k.kommun, region: k.region }))}
                              className={`w-full px-3 py-2 text-left text-sm transition-colors flex items-center justify-between ${
                                active
                                  ? "bg-violet-500/15 text-white"
                                  : "text-white/80 hover:bg-white/[0.04]"
                              }`}
                            >
                              <span className="flex items-center gap-2 min-w-0">
                                <MapPin className="w-3.5 h-3.5 text-violet-300/70 shrink-0" />
                                <span className="truncate">{k.kommun}</span>
                                <span className="text-xs text-white/40 truncate">— {k.region}</span>
                              </span>
                              {active && <Check className="w-4 h-4 text-violet-300 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  )}
                  {kommunSearch.trim().length === 0 && s.kommun && (
                    <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 px-3 py-2 flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-violet-300" />
                      <span className="font-medium">{s.kommun}</span>
                      {s.region && <span className="text-white/50 text-xs">— {s.region}</span>}
                    </div>
                  )}
                </div>
              </StepShell>
            )}

            {step === 4 && (
              <StepShell question="Är du anställd eller egen företagare?">
                <div className="grid sm:grid-cols-2 gap-3">
                  {([
                    { value: "anstalld" as const, label: "Anställd", desc: "Lön via vårdgivare/bemanning" },
                    { value: "foretagare" as const, label: "Eget bolag", desc: "Fakturerar via bemanning/direkt" },
                  ]).map((opt) => {
                    const active = s.employmentType === opt.value;
                    return (
                      <button
                        key={opt.value}
                        onClick={() => setS((p) => ({ ...p, employmentType: opt.value }))}
                        className={`rounded-xl border px-5 py-4 text-left transition-all ${
                          active
                            ? "border-violet-400/60 bg-violet-500/10 shadow-[0_0_30px_-10px_rgba(129,85,255,0.6)]"
                            : "border-white/10 bg-white/[0.03] hover:border-violet-400/30"
                        }`}
                      >
                        <div className="text-base font-semibold mb-1">{opt.label}</div>
                        <div className="text-xs text-white/50">{opt.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </StepShell>
            )}

            {step === 5 && (
              <StepShell question="Vilken är din nuvarande ersättning?">
                <div className="rounded-xl border border-white/10 bg-white/[0.03] p-4 space-y-4">
                  <div className="flex gap-2">
                    {([
                      { value: "hourly" as const, label: "Per timme" },
                      { value: "monthly" as const, label: "Per månad" },
                    ]).map((opt) => {
                      const active = s.salaryType === opt.value;
                      return (
                        <button
                          key={opt.value}
                          onClick={() => setS((p) => ({ ...p, salaryType: opt.value }))}
                          className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-all ${
                            active
                              ? "border-violet-400/60 bg-violet-500/10 text-white"
                              : "border-white/10 bg-white/[0.02] text-white/60 hover:border-violet-400/30"
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                  <div className="relative">
                    <Input
                      type="number"
                      inputMode="numeric"
                      placeholder="Ange ersättning"
                      value={s.currentSalary || ""}
                      onChange={(e) => setS((p) => ({ ...p, currentSalary: Number(e.target.value) }))}
                      className="h-14 text-xl font-semibold pr-20 text-center bg-white/[0.04] border-white/10 text-white placeholder:text-white/30 focus-visible:ring-violet-400/40"
                    />
                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-white/50 font-medium">
                      {s.salaryType === "hourly" ? "kr/h" : "kr/mån"}
                    </span>
                  </div>
                  <p className="font-mono text-[11px] text-white/40 text-center">
                    {s.salaryType === "hourly" ? "// timersättning före skatt" : "// månadsersättning före skatt"}
                  </p>
                </div>
              </StepShell>
            )}
          </div>

          {/* Nav */}
          <div className="flex items-center gap-3 mt-6">
            {step > 1 && (
              <button
                onClick={() => setStep(step - 1)}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-white/60 hover:text-white px-3 py-2 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Tillbaka
              </button>
            )}
            <button
              onClick={handleNext}
              disabled={!canProceed || saving}
              className={`ml-auto inline-flex items-center gap-2 text-sm font-semibold px-6 py-3 rounded-lg transition-all ${
                canProceed && !saving
                  ? "bg-gradient-to-r from-violet-500 to-fuchsia-500 text-white shadow-[0_0_30px_-8px_rgba(129,85,255,0.8)] hover:shadow-[0_0_40px_-6px_rgba(255,45,170,0.6)]"
                  : "bg-white/10 text-white/40 cursor-not-allowed"
              }`}
            >
              {saving ? "Bearbetar..." : step === TOTAL_STEPS ? "Se min ersättning" : "Nästa"}
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-white/10 bg-white/[0.02]">
          <p className="font-mono text-[10px] text-white/40 text-center tracking-wider">
            ANONYMT • KOSTNADSFRITT • KLART PÅ 60 SEKUNDER
          </p>
        </div>
      </div>
    </div>
  );
}

function StepShell({ question, children }: { question: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-xl sm:text-2xl font-semibold tracking-tight">{question}</h2>
      {children}
    </div>
  );
}
