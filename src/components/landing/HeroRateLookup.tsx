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

// All 63 doctor specializations per Socialstyrelsen — alphabetical
const DOCTOR_SPECIALTIES = [
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

// SKR 2026: Grupp A = tunga akut/operativa specialiteter. Övriga = Grupp B.
const GROUP_A_SPECIALTIES = new Set([
  "Akutsjukvård",
  "Anestesi och intensivvård",
  "Barn- och ungdomskirurgi",
  "Handkirurgi",
  "Kirurgi",
  "Kärlkirurgi",
  "Neurokirurgi",
  "Obstetrik och gynekologi",
  "Ortopedi",
  "Plastikkirurgi",
  "Thoraxkirurgi",
  "Urologi",
]);

// Map nurse role → DB yrkeskategori (Grundpris). Empty string = use generic nurse rate if exists.
const NURSE_ROLES = [
  { value: "Sjuksköterska", label: "Sjuksköterska (allmän)" },
  { value: "Specialistsjuksköterska anestesi", label: "Anestesisjuksköterska" },
  { value: "Specialistsjuksköterska intensivvård", label: "IVA-sjuksköterska" },
  { value: "Specialistsjuksköterska operationssjukvård", label: "Operationssjuksköterska" },
  { value: "Specialistsjuksköterska akutsjukvård", label: "Akutsjuksköterska" },
  { value: "Specialistsjuksköterska ambulanssjukvård", label: "Ambulanssjuksköterska" },
  { value: "Specialistsjuksköterska barn och ungdom", label: "Barnsjuksköterska" },
  { value: "Specialistsjuksköterska psykiatrisk vård", label: "Psykiatrisjuksköterska" },
  { value: "Specialistsjuksköterska vård av äldre", label: "Geriatriksjuksköterska" },
  { value: "Specialistsjuksköterska kirurgisk vård", label: "Kirurgsjuksköterska" },
  { value: "Specialistsjuksköterska medicinsk vård", label: "Medicinsjuksköterska" },
  { value: "Specialistsjuksköterska onkologisk vård", label: "Onkologisjuksköterska" },
  { value: "Specialistsjuksköterska hjärtsjukvård", label: "Hjärtsjuksköterska" },
  { value: "Specialistsjuksköterska infektionssjukvård", label: "Infektionssjuksköterska" },
  { value: "Specialistsjuksköterska diabetesvård", label: "Diabetessjuksköterska" },
  { value: "Specialistsjuksköterska palliativ vård", label: "Palliativsjuksköterska" },
  { value: "Specialistsjuksköterska ögonsjukvård", label: "Ögonsjuksköterska" },
  { value: "Specialistsjuksköterska företagshälsovård", label: "Företagssköterska" },
  { value: "Barnmorska", label: "Barnmorska" },
  { value: "Röntgensjuksköterska", label: "Röntgensjuksköterska" },
];

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

  // Build options: doctors (Leg + 63 specialties alphabetical) + nurses
  const roleOptions: Option[] = useMemo(() => {
    const doctorOpts: Option[] = [
      { value: "__leg_lakare", label: "Leg. läkare", group: "Läkare" },
      ...DOCTOR_SPECIALTIES.map((s) => ({
        value: `__spec__${s}`,
        label: s,
        group: "Specialistläkare",
      })),
    ];
    const nurseOpts: Option[] = NURSE_ROLES
      .map((n) => ({ value: n.value, label: n.label, group: "Sjuksköterskor" }))
      .sort((a, b) => a.label.localeCompare(b.label, "sv"));
    return [...doctorOpts, ...nurseOpts];
  }, []);

  const kommunOptions: Option[] = useMemo(
    () =>
      locations
        .map((l) => ({ value: l.kommun, label: `${l.kommun} (${l.zon})`, group: l.region }))
        .sort((a, b) => a.label.localeCompare(b.label, "sv")),
    [locations]
  );

  // Resolve selected role → DB yrkeskategori for price lookup
  const resolvedRole = useMemo(() => {
    if (!role) return null;
    if (role === "__leg_lakare") return { db: "Legitimerad läkare", display: "Leg. läkare" };
    if (role.startsWith("__spec__")) {
      const specialty = role.slice("__spec__".length);
      const group = GROUP_A_SPECIALTIES.has(specialty) ? "A" : "B";
      const db = `Specialistläkare Grupp ${group}`;
      return { db, display: `${specialty} (Grupp ${group})` };
    }
    // Nurse role — DB value === role
    const nurse = NURSE_ROLES.find((n) => n.value === role);
    return { db: role, display: nurse?.label ?? role };
  }, [role]);

  const result = useMemo(() => {
    if (!resolvedRole || !kommun) return null;
    const loc = locations.find((l) => l.kommun === kommun);
    if (!loc) return null;
    const rate = rates.find((r) => r.yrkeskategori === resolvedRole.db && r.zon === loc.zon);
    if (!rate) return null;
    return {
      price: rate.timpris_kund,
      zon: loc.zon,
      region: loc.region,
      kommun,
      display: resolvedRole.display,
    };
  }, [resolvedRole, kommun, rates, locations]);

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
            {result.display} · Ramavtalspris {result.kommun} · {result.zon} · {result.region}
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
