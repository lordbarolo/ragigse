import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Lock, ChevronLeft, Loader2, Shield, ArrowRight } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import SearchableSelect from "@/components/SearchableSelect";
import { useLocations } from "@/hooks/useCalculator";
import { supabase } from "@/integrations/supabase/client";

/* ── Role resolution (mirrors MarketSearchBox) ─────────── */
type RoleGroup = "lakare" | "ssk";

const CATEGORIES: { value: RoleGroup; label: string }[] = [
  { value: "lakare", label: "Läkare" },
  { value: "ssk", label: "Sjuksköterska / Barnmorska" },
];

const TOP_DOCTOR_SPECIALTIES = [
  "Allmänmedicin","Anestesi och intensivvård","Internmedicin",
  "Barn- och ungdomsmedicin","Psykiatri","Radiologi",
  "Geriatrik","Kardiologi","Kirurgi",
  "Obstetrik och gynekologi","Onkologi","Ortopedi",
  "Infektionssjukdomar","Lungsjukdomar","Neurologi",
];

const TOP_NURSE_SPECIALIZATIONS = [
  "Intensivvård","Psykiatrisk vård","Ambulanssjukvård",
  "Barn och ungdom","Operationssjukvård","Anestesisjukvård",
  "Akutsjukvård","Hjärtsjukvård","Distriktssköterska",
  "Kirurgisk vård","Palliativ vård","Vård av äldre",
  "Medicinsk vård","Onkologi","Infektionssjukvård",
];

const nurseValueMap: Record<string, string> = {
  "Akutsjukvård":"Specialistsjuksköterska akutsjukvård",
  "Ambulanssjukvård":"Specialistsjuksköterska ambulanssjukvård",
  "Anestesisjukvård":"Specialistsjuksköterska anestesi",
  "Barn och ungdom":"Specialistsjuksköterska barn och ungdom",
  "Diabetesvård":"Specialistsjuksköterska diabetesvård",
  "Distriktssköterska":"Distriktssjuksköterska",
  "Hjärtsjukvård":"Specialistsjuksköterska hjärtsjukvård",
  "Infektionssjukvård":"Specialistsjuksköterska infektionssjukvård",
  "Intensivvård":"Specialistsjuksköterska intensivvård",
  "Kirurgisk vård":"Specialistsjuksköterska kirurgisk vård",
  "Medicinsk vård":"Specialistsjuksköterska medicinsk vård",
  "Onkologi":"Specialistsjuksköterska onkologisk vård",
  "Operationssjukvård":"Specialistsjuksköterska operationssjukvård",
  "Palliativ vård":"Specialistsjuksköterska palliativ vård",
  "Psykiatrisk vård":"Specialistsjuksköterska psykiatrisk vård",
  "Vård av äldre":"Specialistsjuksköterska vård av äldre",
  "Ögonsjukvård":"Specialistsjuksköterska ögonsjukvård",
};

function resolveYrke(cat: RoleGroup, val: string): string {
  if (cat === "lakare") {
    if (val === "__leg") return "Legitimerad läkare";
    if (val === "__st") return "ST-läkare";
    if (val === "__ovrig") return "Specialistläkare";
    return `Specialistläkare ${val.toLowerCase()}`;
  }
  if (val === "__allman") return "Sjuksköterska";
  if (val === "__barnmorska") return "Barnmorska";
  if (val === "__rontgen") return "Röntgensjuksköterska";
  if (val === "__ovrig") return "Specialistsjuksköterska";
  return nurseValueMap[val] || val;
}

const ZONE_LABELS: Record<string, string> = {
  "Zon 1": "Närhet till större städer",
  "Zon 2": "Mellanstora städer",
  "Zon 3": "Glesbygd",
};

const fmt = (v: number) => v.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

/* ── Component ─────────────────────────────────────────── */
export default function DemoLanding() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();

  const [category, setCategory] = useState<RoleGroup | null>(null);
  const [roleVal, setRoleVal] = useState("");
  const [kommun, setKommun] = useState("");
  const [loading, setLoading] = useState(false);
  const [zoneRates, setZoneRates] = useState<{ zon: string; timpris: number }[] | null>(null);
  const [userZone, setUserZone] = useState<string | null>(null);

  useEffect(() => { document.title = "CompCare — Regionernas priser per zon"; }, []);

  const doctorOpts = useMemo(() => [
    { value: "__leg", label: "Leg. läkare" },
    { value: "__st", label: "ST-läkare" },
    ...TOP_DOCTOR_SPECIALTIES.map(s => ({ value: s, label: s })),
    { value: "__ovrig", label: "Övrig specialisering" },
  ], []);

  const nurseOpts = useMemo(() => [
    { value: "__allman", label: "Allmänsjuksköterska" },
    { value: "__barnmorska", label: "Barnmorska" },
    { value: "__rontgen", label: "Röntgensjuksköterska" },
    ...TOP_NURSE_SPECIALIZATIONS.map(s => ({ value: s, label: s })),
    { value: "__ovrig", label: "Övrig VUB" },
  ], []);

  const roleOptions = category === "lakare" ? doctorOpts : nurseOpts;

  const resolvedYrke = useMemo(() => {
    if (!category || !roleVal) return "";
    return resolveYrke(category, roleVal);
  }, [category, roleVal]);

  const selectedLocation = useMemo(
    () => locations?.find(l => l.kommun === kommun) ?? null,
    [locations, kommun]
  );

  const kommunOptions = useMemo(() => {
    if (!locations) return [];
    return locations.map(l => ({ value: l.kommun, label: `${l.kommun} (${l.region})` }));
  }, [locations]);

  // Fetch zone rates when role + kommun selected
  useEffect(() => {
    if (!resolvedYrke || !selectedLocation) {
      setZoneRates(null);
      setUserZone(null);
      return;
    }

    let cancelled = false;
    const fetch = async () => {
      setLoading(true);
      try {
        // Get rates for this role across all zones
        const { data: rates } = await supabase
          .from("rates")
          .select("zon, timpris_kund")
          .eq("yrkeskategori", resolvedYrke);

        if (cancelled) return;

        if (rates && rates.length > 0) {
          // Deduplicate by zone, pick highest rate per zone
          const byZone = new Map<string, number>();
          for (const r of rates) {
            const existing = byZone.get(r.zon) || 0;
            if (r.timpris_kund > existing) byZone.set(r.zon, r.timpris_kund);
          }
          const sorted = Array.from(byZone.entries())
            .map(([zon, timpris]) => ({ zon, timpris }))
            .sort((a, b) => a.zon.localeCompare(b.zon));
          setZoneRates(sorted);
        } else {
          setZoneRates([]);
        }
        setUserZone(selectedLocation.zon);
      } catch {
        if (!cancelled) setZoneRates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    fetch();
    return () => { cancelled = true; };
  }, [resolvedYrke, selectedLocation]);

  const handleBack = () => {
    setCategory(null);
    setRoleVal("");
    setZoneRates(null);
    setUserZone(null);
  };

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" aria-label="CompCare startsida"><CompcareLogo variant="full" /></Link>
          <ThemeToggle />
        </div>
      </nav>

      <section className="px-4 pt-8 pb-16">
        <div className="w-full max-w-lg mx-auto">
          <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
            {/* Header */}
            <div className="bg-primary px-6 py-4">
              <h1 className="text-primary-foreground font-display text-lg font-bold tracking-tight">
                Regionernas priser per zon
              </h1>
              <p className="text-primary-foreground/70 text-xs mt-0.5">
                Ramavtalspriser (kundpris) per yrkesroll — SKR 2026
              </p>
            </div>

            <div className="px-5 py-5 space-y-4">
              {/* Category selection */}
              {!category ? (
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground block">Steg 1 — Yrkeskategori</label>
                  <div className="grid grid-cols-2 gap-2">
                    {CATEGORIES.map(cat => (
                      <button
                        key={cat.value}
                        onClick={() => { setCategory(cat.value); setRoleVal(""); setZoneRates(null); }}
                        className="group flex items-center gap-3 bg-secondary/30 border border-border rounded-xl p-3.5 text-left cursor-pointer transition-all hover:border-primary/40 hover:bg-secondary/50 hover:-translate-y-0.5 hover:shadow-lg"
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
                  <div className="flex items-center gap-2">
                    <button onClick={handleBack} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                      <ChevronLeft className="w-3.5 h-3.5" /> Tillbaka
                    </button>
                    <span className="text-xs text-muted-foreground">·</span>
                    <span className="text-xs font-medium text-primary">
                      {CATEGORIES.find(c => c.value === category)?.label}
                    </span>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Steg 2 — Specialisering</label>
                    <SearchableSelect options={roleOptions} value={roleVal} onValueChange={setRoleVal} placeholder="Välj specialisering" />
                  </div>

                  <div>
                    <label className="text-sm font-medium text-foreground mb-1.5 block">Steg 3 — Kommun</label>
                    <SearchableSelect options={kommunOptions} value={kommun} onValueChange={setKommun} placeholder="Välj kommun" />
                  </div>
                </>
              )}

              {category && (!resolvedYrke || !selectedLocation) && (
                <div className="rounded-xl border border-dashed border-border bg-secondary/20 px-4 py-3 text-sm text-muted-foreground">
                  Välj specialisering och kommun för att se regionernas kundpriser per zon.
                </div>
              )}

              {loading && (
                <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Hämtar priser...
                </div>
              )}
            </div>

            {/* ── Results ── */}
            {zoneRates && zoneRates.length > 0 && !loading && (
              <div className="border-t border-border bg-secondary/30 px-5 py-5 space-y-4">
                {/* User's zone — highlighted */}
                <div className="text-center space-y-1 mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Din ort</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-display text-base font-bold text-foreground">{selectedLocation?.kommun}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userZone} — {ZONE_LABELS[userZone || ""] || ""}
                  </p>
                </div>

                {/* User zone rate card */}
                {(() => {
                  const userRate = zoneRates.find(r => r.zon === userZone);
                  if (!userRate) return null;
                  return (
                    <div className="bg-primary/5 border-2 border-primary/30 rounded-xl p-4 text-center">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">{userRate.zon} — Din zon</p>
                      <p className="text-3xl font-display font-black text-foreground tracking-tight">
                        {fmt(userRate.timpris)} <span className="text-base font-medium text-muted-foreground">kr/tim</span>
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-1">
                        Kundpris som regionen betalar bemanningsföretaget
                      </p>
                    </div>
                  );
                })()}

                {/* Other zones */}
                <div className="grid grid-cols-1 gap-2">
                  {zoneRates
                    .filter(r => r.zon !== userZone)
                    .map(r => (
                      <div key={r.zon} className="bg-card border border-border rounded-xl p-4 text-center">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                          {r.zon} — {ZONE_LABELS[r.zon] || ""}
                        </p>
                        <p className="text-2xl font-display font-bold text-foreground tracking-tight">
                          {fmt(r.timpris)} <span className="text-base font-medium text-muted-foreground">kr/tim</span>
                        </p>
                      </div>
                    ))}
                </div>

                <p className="text-[10px] text-muted-foreground/70 text-center">
                  {resolvedYrke} · Kundpris enligt SKR ramavtal 2026
                </p>

                {/* ── Gated section ── */}
                <div className="mt-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/60 to-card z-10 rounded-xl" />
                  <div className="relative z-0 space-y-3 opacity-40 blur-[2px] select-none pointer-events-none">
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Kommuner i Zon 1</p>
                      <div className="flex flex-wrap gap-1">
                        {["Stockholm","Göteborg","Malmö","Uppsala","Linköping"].map(k => (
                          <span key={k} className="text-xs bg-secondary px-2 py-0.5 rounded">{k}</span>
                        ))}
                        <span className="text-xs text-muted-foreground">+82 till</span>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Beräknad ersättning (anställd)</p>
                      <p className="text-lg font-bold text-foreground">38 500 – 42 100 kr/mån</p>
                    </div>
                  </div>

                  {/* CTA overlay */}
                  <div className="absolute inset-0 z-20 flex items-center justify-center">
                    <div className="bg-card border border-border rounded-xl shadow-lg p-6 text-center max-w-xs mx-auto">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-3">
                        <Lock className="w-5 h-5 text-primary" />
                      </div>
                      <h3 className="font-display text-sm font-bold text-foreground mb-1">
                        Se vilka kommuner som ingår i varje zon
                      </h3>
                      <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                        Registrera dig gratis för att se fullständig zonindelning och beräknad ersättning.
                      </p>
                      <button
                        onClick={() => navigate("/registrera")}
                        className="inline-flex items-center gap-2 bg-primary text-primary-foreground text-sm font-semibold px-5 py-2.5 rounded-lg hover:bg-primary/90 transition-colors w-full justify-center"
                      >
                        Skapa konto <ArrowRight className="w-4 h-4" />
                      </button>
                      <p className="text-[10px] text-muted-foreground mt-2">
                        Redan registrerad? <Link to="/logga-in" className="text-primary hover:underline">Logga in</Link>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-center gap-1.5 text-[10px] text-muted-foreground/60 pt-2">
                  <Shield className="w-3 h-3" />
                  <span>Dina uppgifter delas aldrig med tredje part</span>
                </div>
              </div>
            )}

            {zoneRates && zoneRates.length === 0 && !loading && (
              <div className="border-t border-border px-5 py-5">
                <p className="text-sm text-muted-foreground text-center">Inga priser hittades för denna roll.</p>
              </div>
            )}
          </div>
        </div>
      </section>

      <footer className="border-t border-border py-8 px-6 text-center">
        <p className="text-xs text-muted-foreground">© {new Date().getFullYear()} CompCare</p>
      </footer>
    </div>
  );
}
