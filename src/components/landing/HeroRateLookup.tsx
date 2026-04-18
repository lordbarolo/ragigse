import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, MapPin, Briefcase, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import SearchableSelect, { type Option } from "@/components/SearchableSelect";
import { Button } from "@/components/ui/button";

interface RateRow {
  yrkeskategori: string;
  zon: string;
  timpris_kund: number;
}

interface Location {
  kommun: string;
  zon: string;
  region: string;
}

/**
 * Hero rate lookup — visitor picks role + location and sees the framework price
 * the region pays staffing companies. Uses public SKR rates (v1.6/v1.7 active).
 */
export default function HeroRateLookup() {
  const [rates, setRates] = useState<RateRow[]>([]);
  const [locations, setLocations] = useState<Location[]>([]);
  const [role, setRole] = useState("");
  const [kommun, setKommun] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [ratesRes, locsRes] = await Promise.all([
        supabase
          .from("contract_version_rates")
          .select("yrkeskategori, zon, timpris_kund, typ, version_id, contract_versions!inner(is_active)")
          .eq("contract_versions.is_active", true)
          .in("typ", ["Grundpris", "Läkare"]),
        supabase.from("locations").select("kommun, zon, region").order("kommun"),
      ]);
      if (cancelled) return;
      if (ratesRes.data) setRates(ratesRes.data as unknown as RateRow[]);
      if (locsRes.data) setLocations(locsRes.data as Location[]);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Map DB role names to natural Swedish forms for display
  const roleLabelOverrides: Record<string, string> = {
    "Specialistsjuksköterska akutsjukvård": "Akutsjuksköterska",
    "Specialistsjuksköterska ambulanssjukvård": "Ambulanssjuksköterska",
    "Specialistsjuksköterska anestesi": "Anestesisjuksköterska",
    "Specialistsjuksköterska barn och ungdom": "Barnsjuksköterska",
    "Specialistsjuksköterska diabetesvård": "Diabetessjuksköterska",
    "Specialistsjuksköterska företagshälsovård": "Företagssköterska",
    "Specialistsjuksköterska hjärtsjukvård": "Hjärtsjuksköterska",
    "Specialistsjuksköterska infektionssjukvård": "Infektionssjuksköterska",
    "Specialistsjuksköterska intensivvård": "IVA-sjuksköterska",
    "Specialistsjuksköterska kirurgisk vård": "Kirurgsjuksköterska",
    "Specialistsjuksköterska medicinsk vård": "Medicinsjuksköterska",
    "Specialistsjuksköterska onkologisk vård": "Onkologisjuksköterska",
    "Specialistsjuksköterska operationssjukvård": "Operationssjuksköterska",
    "Specialistsjuksköterska palliativ vård": "Palliativsjuksköterska",
    "Specialistsjuksköterska psykiatrisk vård": "Psykiatrisjuksköterska",
    "Specialistsjuksköterska vård av äldre": "Geriatriksjuksköterska",
    "Specialistsjuksköterska ögonsjukvård": "Ögonsjuksköterska",
  };

  const roleOptions: Option[] = useMemo(() => {
    const unique = Array.from(new Set(rates.map((r) => r.yrkeskategori)))
      .filter((r) => !r.startsWith("OB-tillägg"))
      .sort((a, b) => a.localeCompare(b, "sv"));
    return unique.map((r) => {
      const group = r.startsWith("Specialistläkare") || r === "Legitimerad läkare"
        ? "Läkare"
        : "Sjuksköterskor";
      return { value: r, label: roleLabelOverrides[r] ?? r, group };
    });
  }, [rates]);

  const kommunOptions: Option[] = useMemo(
    () =>
      locations
        .map((l) => ({ value: l.kommun, label: `${l.kommun} (${l.zon})`, group: l.region }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [locations]
  );

  const result = useMemo(() => {
    if (!role || !kommun) return null;
    const loc = locations.find((l) => l.kommun === kommun);
    if (!loc) return null;
    const rate = rates.find((r) => r.yrkeskategori === role && r.zon === loc.zon);
    if (!rate) return null;
    return { price: rate.timpris_kund, zon: loc.zon, region: loc.region, kommun };
  }, [role, kommun, rates, locations]);

  return (
    <div className="bg-card border border-border rounded-2xl p-5 md:p-6 shadow-xl shadow-black/20 max-w-2xl mx-auto text-left">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h2 className="text-sm font-semibold text-foreground">
          Jämför konsultlönen med priset regionen betalar
        </h2>
      </div>

      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <Briefcase className="w-3 h-3" /> Roll
          </label>
          <SearchableSelect
            options={roleOptions}
            value={role}
            onValueChange={setRole}
            placeholder={loading ? "Laddar roller..." : "Välj eller sök roll"}
          />
        </div>
        <div>
          <label className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-1.5">
            <MapPin className="w-3 h-3" /> Kommun
          </label>
          <SearchableSelect
            options={kommunOptions}
            value={kommun}
            onValueChange={setKommun}
            placeholder={loading ? "Laddar orter..." : "Välj eller sök kommun"}
          />
        </div>
      </div>

      {result && (
        <div className="mt-4 rounded-xl bg-primary/5 border border-primary/20 p-4">
          <p className="text-xs text-muted-foreground mb-1">
            Ramavtalspris {result.kommun} · {result.zon} · {result.region}
          </p>
          <div className="flex items-baseline justify-between gap-3 flex-wrap">
            <div>
              <span className="text-3xl md:text-4xl font-bold text-foreground tabular-nums">
                {result.price}
              </span>
              <span className="text-base text-muted-foreground ml-1">kr/tim</span>
            </div>
            <Link to="/consultant/salary-check">
              <Button size="sm" className="gap-1.5">
                Se din ersättning <ArrowRight className="w-3 h-3" />
              </Button>
            </Link>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2 leading-relaxed">
            Detta är vad regionen betalar bemanningsföretaget enligt SKR:s ramavtal 2026 (grundpris dagtid).
          </p>
        </div>
      )}

      {!result && (
        <p className="text-xs text-muted-foreground mt-3">
          Välj roll och kommun för att se ramavtalspriset från SKR 2026.
        </p>
      )}
    </div>
  );
}
