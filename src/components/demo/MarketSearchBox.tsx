import { useState, useMemo } from "react";
import { Search, TrendingUp, Building2 } from "lucide-react";
import { useLocations, useRates } from "@/hooks/useCalculator";
import SearchableSelect from "@/components/SearchableSelect";

const EMPLOYER_FACTOR = 1.42;
const HOURS_PER_MONTH = 167;

/* ── Role groups with margin config ─────────────────────────────── */

interface RoleOption {
  value: string;          // matches yrkeskategori in rates
  label: string;
  group: "doctor" | "nurse";
}

function buildRoleOptions(categories: string[]): RoleOption[] {
  const opts: RoleOption[] = [];
  for (const cat of categories) {
    const isDoctor =
      cat.startsWith("Specialistläkare") ||
      cat === "Legitimerad läkare" ||
      cat === "ST-läkare";
    opts.push({
      value: cat,
      label: cat,
      group: isDoctor ? "doctor" : "nurse",
    });
  }
  return opts.sort((a, b) => a.label.localeCompare(b.label, "sv"));
}

/* ── Margin helpers ─────────────────────────────────────────────── */

function margins(group: "doctor" | "nurse") {
  // consultant keeps (1 - agency margin)
  return group === "doctor"
    ? { keepMin: 0.85, keepMax: 0.92 }   // agency 8-15%
    : { keepMin: 0.80, keepMax: 0.88 };   // agency 12-20%
}

/* ── Component ──────────────────────────────────────────────────── */

export default function MarketSearchBox() {
  const { data: locations } = useLocations();
  const { data: rates } = useRates();

  const [selectedRole, setSelectedRole] = useState("");
  const [selectedKommun, setSelectedKommun] = useState("");

  /* Derive role options from rates */
  const roleOptions = useMemo(() => {
    if (!rates) return [];
    const cats = [...new Set(rates.map((r) => r.yrkeskategori))];
    return buildRoleOptions(cats);
  }, [rates]);

  /* Municipality options */
  const kommunOptions = useMemo(() => {
    if (!locations) return [];
    return locations.map((l) => ({ value: l.kommun, label: `${l.kommun} (${l.region})` }));
  }, [locations]);

  /* Find matching rate */
  const result = useMemo(() => {
    if (!selectedRole || !selectedKommun || !locations || !rates) return null;

    const loc = locations.find((l) => l.kommun === selectedKommun);
    if (!loc) return null;

    const rate = rates.find(
      (r) => r.yrkeskategori === selectedRole && r.zon === loc.zon
    );
    if (!rate) return null;

    const role = roleOptions.find((r) => r.value === selectedRole);
    if (!role) return null;

    const { keepMin, keepMax } = margins(role.group);
    const timpris = rate.timpris_kund;

    // Företagare (hourly)
    const hourlyMin = Math.round(timpris * keepMin);
    const hourlyMax = Math.round(timpris * keepMax);

    // Anställd (monthly salary)
    const monthlyMin = Math.round((timpris * keepMin) / EMPLOYER_FACTOR * HOURS_PER_MONTH);
    const monthlyMax = Math.round((timpris * keepMax) / EMPLOYER_FACTOR * HOURS_PER_MONTH);

    return {
      kommun: loc.kommun,
      zon: loc.zon,
      region: loc.region,
      timpris,
      hourlyMin,
      hourlyMax,
      monthlyMin,
      monthlyMax,
      group: role.group,
      roleName: role.label,
    };
  }, [selectedRole, selectedKommun, locations, rates, roleOptions]);

  const fmt = (n: number) =>
    n.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
        {/* Header */}
        <div className="bg-primary px-6 py-4">
          <h1 className="text-primary-foreground font-display text-lg font-bold tracking-tight">
            Vad är marknadsmässig ersättning?
          </h1>
          <p className="text-primary-foreground/70 text-xs mt-0.5">
            Baserat på SKR:s ramavtal 2026
          </p>
        </div>

        {/* Form */}
        <div className="px-5 py-5 space-y-4">
          {/* Role */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Roll</label>
            <SearchableSelect
              options={roleOptions.map((r) => ({ value: r.value, label: r.label }))}
              value={selectedRole}
              onValueChange={setSelectedRole}
              placeholder="Välj yrkesroll"
            />
          </div>

          {/* Municipality */}
          <div>
            <label className="text-sm font-medium text-foreground mb-1.5 block">Kommun</label>
            <SearchableSelect
              options={kommunOptions}
              value={selectedKommun}
              onValueChange={setSelectedKommun}
              placeholder="Välj kommun"
            />
          </div>

          {/* Search button (visual only, results show automatically) */}
          {!result && (
            <button
              disabled
              className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground rounded-xl py-3 font-semibold text-sm opacity-60 cursor-not-allowed"
            >
              <Search className="w-4 h-4" />
              Visa marknadspris
            </button>
          )}
        </div>

        {/* Results */}
        {result && (
          <div className="border-t border-border bg-secondary/30 px-5 py-5 space-y-4">
            {/* Headline */}
            <div className="text-center">
              <p className="text-xs text-muted-foreground mb-1">
                Marknadsmässig ersättning i {result.kommun}
              </p>
              <p className="text-sm font-medium text-foreground">
                {result.roleName}
              </p>
            </div>

            {/* Salary (anställd) — prominent */}
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="w-4 h-4 text-primary" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Månadslön (anställd)
                </span>
              </div>
              <p className="text-3xl font-display font-black text-foreground tracking-tight">
                {fmt(result.monthlyMin)} – {fmt(result.monthlyMax)}
                <span className="text-base font-medium text-muted-foreground ml-1">kr/mån</span>
              </p>
              <p className="text-[11px] text-muted-foreground mt-1">
                {fmt(Math.round(result.monthlyMin / HOURS_PER_MONTH))} – {fmt(Math.round(result.monthlyMax / HOURS_PER_MONTH))} kr/tim
              </p>
            </div>

            {/* Hourly (företagare) — secondary */}
            <div className="bg-card border border-border rounded-xl p-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Building2 className="w-4 h-4 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Timersättning (egenföretagare)
                </span>
              </div>
              <p className="text-2xl font-display font-bold text-foreground tracking-tight">
                {fmt(result.hourlyMin)} – {fmt(result.hourlyMax)}
                <span className="text-base font-medium text-muted-foreground ml-1">kr/tim</span>
              </p>
            </div>

            {/* Context */}
            <p className="text-[10px] text-muted-foreground/60 text-center leading-relaxed">
              Kundpris {result.zon}: {fmt(result.timpris)} kr/tim · Bemanningsföretag behåller{" "}
              {result.group === "doctor" ? "8–15 %" : "12–20 %"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
