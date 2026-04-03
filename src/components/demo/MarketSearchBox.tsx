import { useEffect, useMemo, useState } from "react";
import { Building2, Loader2, MapPin, TrendingUp } from "lucide-react";
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
  section: string;
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

const ROLE_OPTIONS: RoleOption[] = [
  { value: "AT-läkare", label: "AT-läkare", group: "doctor", section: "Läkare" },
  { value: "ST-läkare", label: "ST-läkare", group: "doctor", section: "Läkare" },
  { value: "Specialistläkare", label: "Specialistläkare", group: "doctor", section: "Läkare" },
  { value: "Övriga läkare", label: "Övriga läkare", group: "doctor", section: "Läkare" },
  { value: "Barnmorskor", label: "Barnmorskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Grundutbildade sjuksköterskor", label: "Grundutbildade sjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Distriktssköterskor", label: "Distriktssköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Ambulanssjuksköterskor m.fl.", label: "Ambulanssjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Anestesisjuksköterskor", label: "Anestesisjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Barnsjuksköterskor", label: "Barnsjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Företagssköterskor", label: "Företagssköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Geriatriksjuksköterskor", label: "Geriatriksjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Intensivvårdssjuksköterskor", label: "Intensivvårdssjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Operationssjuksköterskor", label: "Operationssjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Psykiatrisjuksköterskor", label: "Psykiatrisjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Röntgensjuksköterskor", label: "Röntgensjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Skolsköterskor", label: "Skolsköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
  { value: "Övriga specialistsjuksköterskor", label: "Övriga specialistsjuksköterskor", group: "nurse", section: "Sjuksköterskor & barnmorskor" },
];

function getMargins(group: RoleGroup) {
  return group === "doctor"
    ? { keepMin: 0.85, keepMax: 0.92, marginText: "8–15 %" }
    : { keepMin: 0.8, keepMax: 0.88, marginText: "12–20 %" };
}

export default function MarketSearchBox() {
  const { data: locations } = useLocations();
  const [selectedRole, setSelectedRole] = useState("");
  const [selectedKommun, setSelectedKommun] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<MarketResult | null>(null);

  const selectedRoleOption = useMemo(
    () => ROLE_OPTIONS.find((role) => role.value === selectedRole) ?? null,
    [selectedRole]
  );

  const selectedLocation = useMemo(
    () => locations?.find((location) => location.kommun === selectedKommun) ?? null,
    [locations, selectedKommun]
  );

  const kommunOptions = useMemo(() => {
    if (!locations) return [];
    return locations.map((location) => ({
      value: location.kommun,
      label: `${location.kommun} (${location.region})`,
    }));
  }, [locations]);

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

  const fmt = (value: number) => value.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

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
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Roll</label>
            <SearchableSelect
              options={ROLE_OPTIONS.map((role) => ({
                value: role.value,
                label: role.label,
                group: role.section,
              }))}
              value={selectedRole}
              onValueChange={setSelectedRole}
              placeholder="Välj yrkesroll"
            />
          </div>

          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Kommun</label>
            <SearchableSelect
              options={kommunOptions}
              value={selectedKommun}
              onValueChange={setSelectedKommun}
              placeholder="Välj kommun"
            />
          </div>

          {!selectedRoleOption || !selectedLocation ? (
            <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              Välj roll och kommun för att se marknadsmässig månadslön direkt.
            </div>
          ) : loading ? (
            <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              Hämtar marknadspris...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
              {error}
            </div>
          ) : null}
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
