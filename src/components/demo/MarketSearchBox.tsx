import { useEffect, useMemo, useState } from "react";
import { Building2, ChevronLeft, Loader2, MapPin, TrendingUp } from "lucide-react";
import { useLocations } from "@/hooks/useCalculator";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect from "@/components/SearchableSelect";

const DEFAULT_EMPLOYER_FACTOR = 1.42;
const DEFAULT_HOURS_PER_MONTH = 167;

type RoleGroup = "doctor" | "nurse";

interface RoleOption {
  value: string;
  label: string;
  group: RoleGroup;
}

interface MarketResult {
  kommun: string;
  region: string;
  zon: string;
  roleName: string;
  timpris: number;
  hourlyMin: number;
  hourlyMax: number;
  monthlyMin: number;
  monthlyMax: number;
  marginText: string;
}

const CATEGORIES: { value: RoleGroup; label: string }[] = [
  { value: "doctor", label: "Läkare" },
  { value: "nurse", label: "Sjuksköterska / Barnmorska" },
];

const SPECIALIZATIONS: RoleOption[] = [
  // Doctors (AT-läkare excluded)
  { value: "ST-läkare", label: "ST-läkare", group: "doctor" },
  { value: "Specialistläkare", label: "Specialistläkare", group: "doctor" },
  { value: "Övriga läkare", label: "Övriga läkare", group: "doctor" },
  // Nurses & midwives
  { value: "Barnmorskor", label: "Barnmorskor", group: "nurse" },
  { value: "Grundutbildade sjuksköterskor", label: "Grundutbildade sjuksköterskor", group: "nurse" },
  { value: "Distriktssköterskor", label: "Distriktssköterskor", group: "nurse" },
  { value: "Ambulanssjuksköterskor m.fl.", label: "Ambulanssjuksköterskor", group: "nurse" },
  { value: "Anestesisjuksköterskor", label: "Anestesisjuksköterskor", group: "nurse" },
  { value: "Barnsjuksköterskor", label: "Barnsjuksköterskor", group: "nurse" },
  { value: "Företagssköterskor", label: "Företagssköterskor", group: "nurse" },
  { value: "Geriatriksjuksköterskor", label: "Geriatriksjuksköterskor", group: "nurse" },
  { value: "Intensivvårdssjuksköterskor", label: "Intensivvårdssjuksköterskor", group: "nurse" },
  { value: "Operationssjuksköterskor", label: "Operationssjuksköterskor", group: "nurse" },
  { value: "Psykiatrisjuksköterskor", label: "Psykiatrisjuksköterskor", group: "nurse" },
  { value: "Röntgensjuksköterskor", label: "Röntgensjuksköterskor", group: "nurse" },
  { value: "Skolsköterskor", label: "Skolsköterskor", group: "nurse" },
  { value: "Övriga specialistsjuksköterskor", label: "Övriga specialistsjuksköterskor", group: "nurse" },
];

function getMargins(group: RoleGroup) {
  return group === "doctor"
    ? { keepMin: 0.85, keepMax: 0.92, marginText: "8–15 %" }
    : { keepMin: 0.8, keepMax: 0.88, marginText: "12–20 %" };
}

export default function MarketSearchBox() {
  const { data: locations } = useLocations();
  const [selectedCategory, setSelectedCategory] = useState<RoleGroup | null>(null);
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedKommun, setSelectedKommun] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarketResult | null>(null);

  const filteredSpecializations = useMemo(
    () => (selectedCategory ? SPECIALIZATIONS.filter((s) => s.group === selectedCategory) : []),
    [selectedCategory]
  );

  const selectedRoleOption = useMemo(
    () => SPECIALIZATIONS.find((r) => r.value === selectedRole) ?? null,
    [selectedRole]
  );

  const selectedLocation = useMemo(
    () => locations?.find((l) => l.kommun === selectedKommun) ?? null,
    [locations, selectedKommun]
  );

  const kommunOptions = useMemo(() => {
    if (!locations) return [];
    return locations.map((l) => ({ value: l.kommun, label: `${l.kommun} (${l.region})` }));
  }, [locations]);

  // Reset specialization when category changes
  const handleCategorySelect = (cat: RoleGroup) => {
    setSelectedCategory(cat);
    setSelectedRole("");
    setResult(null);
    setError(null);
  };

  const handleBack = () => {
    setSelectedCategory(null);
    setSelectedRole("");
    setResult(null);
    setError(null);
  };

  useEffect(() => {
    if (!selectedRoleOption || !selectedLocation) {
      setResult(null);
      setError(null);
      setLoading(false);
      return;
    }

    let cancelled = false;

    const fetchMarketSpan = async () => {
      setLoading(true);
      setError(null);
      setResult(null);

      try {
        const { data, error: functionError } = await supabase.functions.invoke("pricing-engine", {
          body: {
            occupation: selectedRoleOption.value,
            kommun: selectedLocation.kommun,
            employment_type: "anstalld",
          },
        });

        if (functionError) throw functionError;
        if (!data?.rate_customer_sek_per_hour) throw new Error("NO_RATE_FOUND");

        const { keepMin, keepMax, marginText } = getMargins(selectedRoleOption.group);
        const timpris = Number(data.rate_customer_sek_per_hour);
        const employerFactor = Number(data.employee_factor ?? DEFAULT_EMPLOYER_FACTOR);
        const hoursPerMonth = Number(data.hours_per_month ?? DEFAULT_HOURS_PER_MONTH);

        const hourlyMin = Math.round(timpris * keepMin);
        const hourlyMax = Math.round(timpris * keepMax);
        const monthlyMin = Math.round((timpris * keepMin * hoursPerMonth) / employerFactor);
        const monthlyMax = Math.round((timpris * keepMax * hoursPerMonth) / employerFactor);

        if (cancelled) return;

        setResult({
          kommun: selectedLocation.kommun,
          region: selectedLocation.region,
          zon: selectedLocation.zon,
          roleName: selectedRoleOption.label,
          timpris,
          hourlyMin,
          hourlyMax,
          monthlyMin,
          monthlyMax,
          marginText,
        });
      } catch {
        if (cancelled) return;
        setError("Kunde inte hämta marknadsspannet för det valet just nu.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchMarketSpan();

    return () => {
      cancelled = true;
    };
  }, [selectedLocation, selectedRoleOption]);

  const fmt = (v: number) => v.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-primary px-6 py-4">
          <h1 className="text-primary-foreground font-display text-lg font-bold tracking-tight">
            Vad är marknadsmässig ersättning?
          </h1>
          <p className="text-primary-foreground/70 text-xs mt-0.5">
            Baserat på SKR:s ramavtal 2026
          </p>
        </div>

        <div className="px-5 py-5 space-y-4">
          {/* Step 1: Category */}
          {!selectedCategory ? (
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground block">Steg 1 — Yrkeskategori</label>
              <div className="grid grid-cols-2 gap-2">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat.value}
                    onClick={() => handleCategorySelect(cat.value)}
                    className="group relative overflow-hidden flex items-center gap-3 bg-secondary/30 border border-border rounded-xl p-3.5 text-left cursor-pointer transition-all hover:border-primary/40 hover:bg-secondary/50 hover:-translate-y-0.5 hover:shadow-lg"
                  >
                    <div className="w-9 h-9 rounded-lg bg-primary/10 border border-primary/15 flex items-center justify-center flex-shrink-0">
                      <span className="font-display text-sm font-bold text-primary">{cat.label.charAt(0)}</span>
                    </div>
                    <span className="font-display text-sm font-semibold text-foreground leading-tight">{cat.label}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <>
              {/* Back + category label */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                  Tillbaka
                </button>
                <span className="text-xs text-muted-foreground">·</span>
                <span className="text-xs font-medium text-primary">
                  {CATEGORIES.find((c) => c.value === selectedCategory)?.label}
                </span>
              </div>

              {/* Step 2: Specialization */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Steg 2 — Specialisering</label>
                <SearchableSelect
                  options={filteredSpecializations.map((r) => ({ value: r.value, label: r.label }))}
                  value={selectedRole}
                  onValueChange={setSelectedRole}
                  placeholder="Välj specialisering"
                />
              </div>

              {/* Step 3: Kommun */}
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">Steg 3 — Kommun</label>
                <SearchableSelect
                  options={kommunOptions}
                  value={selectedKommun}
                  onValueChange={setSelectedKommun}
                  placeholder="Välj kommun"
                />
              </div>
            </>
          )}

          {/* Status messages */}
          {selectedCategory && (!selectedRoleOption || !selectedLocation) && (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              Välj specialisering och kommun för att se marknadsmässig månadslön direkt.
            </div>
          )}

          {loading && (
            <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Hämtar marknadspris...
            </div>
          )}

          {error && !loading && (
            <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              {error}
            </div>
          )}
        </div>

        {result && !loading && (
          <div className="border-t border-border bg-secondary/30 px-5 py-5 space-y-4">
            <div className="text-center space-y-1">
              <p className="text-xs text-muted-foreground">Marknadsmässig ersättning i aktuell kommun</p>
              <p className="text-sm font-medium text-foreground">{result.roleName}</p>
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <MapPin className="w-3 h-3" />
                <span>{result.kommun}</span>
              </div>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Månadslön
                </span>
              </div>
              <p className="text-3xl font-display font-black text-foreground tracking-tight">
                {fmt(result.monthlyMin)} – {fmt(result.monthlyMax)}
                <span className="text-base font-medium text-muted-foreground ml-1">kr/mån</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                Marknadsmässig lön som anställd i {result.kommun}
              </p>
            </div>

            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Ersättning för företagare
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground tracking-tight">
                {fmt(result.hourlyMin)} – {fmt(result.hourlyMax)}
                <span className="text-base font-medium text-muted-foreground ml-1">kr/tim</span>
              </p>
            </div>

            <p className="text-[10px] text-muted-foreground/70 text-center leading-relaxed">
              Kundpris i {result.kommun}: {fmt(result.timpris)} kr/tim · Bemanningsföretagets marginal: {result.marginText}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
