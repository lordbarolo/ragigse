import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useLocations, useRates } from "@/hooks/useCalculator";
import { supabase } from "@/integrations/supabase/client";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Input } from "@/components/ui/input";
import {
  Users, Briefcase, MapPin, Stethoscope, Clock, Banknote, Mail,
  ChevronRight, ChevronLeft, ArrowRight
} from "lucide-react";
import { toast } from "sonner";

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

  const canProceed = (() => {
    switch (step) {
      case 0: return EMAIL_REGEX.test(data.email.trim());
      case 1: return true; // employment type always has default
      case 2: return !!data.yrke;
      case 3: return !!data.kommun;
      case 4: return true; // slider always has value
      case 5: return data.currentSalary > 0;
      default: return false;
    }
  })();

  const handleNext = async () => {
    if (step < TOTAL_STEPS - 1) {
      setStep(step + 1);
    } else {
      // Save lead and create report, then navigate to report
      setSaving(true);
      try {
        const leadId = crypto.randomUUID();
        const { error } = await supabase.from("leads").insert({
          id: leadId,
          email: data.email.trim().toLowerCase(),
          employment_type: data.employmentType,
          yrke: data.yrke,
          kommun: data.kommun,
          experience: data.experience,
          salary_type: data.salaryType,
          current_salary: data.currentSalary,
        });
        if (error) throw error;

        // Create preview report via edge function
        const { data: reportData, error: reportError } = await supabase.functions.invoke("create-report", {
          body: {
            lead_id: leadId,
            email: data.email.trim().toLowerCase(),
            occupation: data.yrke,
            employment_type: data.employmentType,
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
        if (reportData.ab_variant) {
          sessionStorage.setItem("abVariant", reportData.ab_variant);
        }
        navigate("/resultat");
      } catch {
        toast.error("Kunde inte spara dina uppgifter. Försök igen.");
        setSaving(false);
        return;
      }
    }
  };

  const handleBack = () => {
    if (step > 0) setStep(step - 1);
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
        {step === 0 && (
          <StepWrapper
            icon={<Mail className="w-6 h-6" />}
            title="Vad är din e-postadress?"
            subtitle="Vi skickar din rapport hit"
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

        {step === 1 && (
          <StepWrapper
            icon={<Users className="w-6 h-6" />}
            title="Hur arbetar du?"
            subtitle="Välj din anställningsform"
          >
            <div className="flex flex-col gap-3">
              <ToggleOption
                selected={data.employmentType === "anstalld"}
                onClick={() => setData({ ...data, employmentType: "anstalld" })}
                icon={<Users className="w-5 h-5" />}
                label="Anställd"
                description="Via bemanningsföretag"
              />
              <ToggleOption
                selected={data.employmentType === "foretagare"}
                onClick={() => setData({ ...data, employmentType: "foretagare" })}
                icon={<Briefcase className="w-5 h-5" />}
                label="Egenföretagare"
                description="Eget bolag / F-skatt"
              />
            </div>
          </StepWrapper>
        )}

        {step === 2 && (
          <StepWrapper
            icon={<Stethoscope className="w-6 h-6" />}
            title="Vad jobbar du som?"
            subtitle="Välj din yrkeskategori"
          >
            <Select value={data.yrke} onValueChange={(v) => setData({ ...data, yrke: v })}>
              <SelectTrigger className="h-14 text-base">
                <SelectValue placeholder={isLoading ? "Laddar..." : "Välj yrkeskategori"} />
              </SelectTrigger>
              <SelectContent>
                {uniqueYrken.map((r) => (
                  <SelectItem key={r.id} value={r.yrkeskategori}>
                    {r.yrkeskategori}
                    {r.detaljer && ` — ${r.detaljer}`}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </StepWrapper>
        )}

        {step === 3 && (
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

        {step === 4 && (
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

        {step === 5 && (
          <StepWrapper
            icon={<Banknote className="w-6 h-6" />}
            title="Vad tjänar du idag?"
            subtitle="Ange din nuvarande ersättning"
          >
            <div className="space-y-4">
              <div className="flex bg-secondary rounded-lg p-1 gap-1">
                <button
                  onClick={() => setData({ ...data, salaryType: "hourly", currentSalary: 0 })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    data.salaryType === "hourly"
                      ? "bg-card text-foreground card-shadow"
                      : "text-muted-foreground"
                  }`}
                >
                  Timlön (kr/h)
                </button>
                <button
                  onClick={() => setData({ ...data, salaryType: "monthly", currentSalary: 0 })}
                  className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
                    data.salaryType === "monthly"
                      ? "bg-card text-foreground card-shadow"
                      : "text-muted-foreground"
                  }`}
                >
                  Månadslön (kr/mån)
                </button>
              </div>
              <div className="relative">
                <Input
                  type="number"
                  inputMode="numeric"
                  placeholder={data.salaryType === "hourly" ? "T.ex. 280" : "T.ex. 42000"}
                  value={data.currentSalary || ""}
                  onChange={(e) => setData({ ...data, currentSalary: Number(e.target.value) })}
                  className="h-14 text-lg pr-16"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                  {data.salaryType === "hourly" ? "kr/h" : "kr/mån"}
                </span>
              </div>
            </div>
          </StepWrapper>
        )}
      </div>

      {/* Navigation */}
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
              {saving ? "Sparar..." : "Visa mitt resultat"}
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

function ToggleOption({
  selected,
  onClick,
  icon,
  label,
  description,
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
        selected
          ? "border-primary bg-primary/5 card-shadow"
          : "border-border hover:border-primary/30 hover:bg-muted/50"
      }`}
    >
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
        selected ? "bg-primary text-primary-foreground" : "bg-secondary text-muted-foreground"
      }`}>
        {icon}
      </div>
      <div>
        <p className="font-semibold text-foreground">{label}</p>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
    </button>
  );
}
