import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { MapPin, Lock, Loader2, Shield, ArrowRight } from "lucide-react";
import CompcareLogo from "@/components/CompcareLogo";
import ThemeToggle from "@/components/ThemeToggle";
import { useLocations } from "@/hooks/useCalculator";
import { supabase } from "@/integrations/supabase/client";
import type { SurveyData } from "@/components/Survey";

const ZONE_LABELS: Record<string, string> = {
  "Zon 1": "Närhet till större städer",
  "Zon 2": "Mellanstora städer",
  "Zon 3": "Glesbygd",
};

const fmt = (v: number) => v.toLocaleString("sv-SE", { maximumFractionDigits: 0 });

export default function DemoLanding() {
  const navigate = useNavigate();
  const { data: locations } = useLocations();

  const [loading, setLoading] = useState(true);
  const [zoneRates, setZoneRates] = useState<{ zon: string; timpris: number }[] | null>(null);
  const [userZone, setUserZone] = useState<string | null>(null);
  const [survey, setSurvey] = useState<SurveyData | null>(null);

  useEffect(() => {
    document.title = "CompCare — Regionernas priser per zon";
  }, []);

  // Load survey data from sessionStorage
  useEffect(() => {
    const raw = sessionStorage.getItem("surveyData");
    if (raw) {
      try {
        setSurvey(JSON.parse(raw) as SurveyData);
      } catch {
        navigate("/");
      }
    } else {
      navigate("/");
    }
  }, [navigate]);

  // Resolve user zone from locations
  const selectedLocation = useMemo(
    () => (locations && survey?.kommun ? (locations.find((l) => l.kommun === survey.kommun) ?? null) : null),
    [locations, survey?.kommun],
  );

  // Fetch zone rates when survey data + location are ready
  useEffect(() => {
    if (!survey?.yrke || !selectedLocation) return;

    let cancelled = false;
    const fetchRates = async () => {
      setLoading(true);
      try {
        const { data: rates } = await supabase
          .from("rates")
          .select("zon, timpris_kund")
          .eq("yrkeskategori", survey.yrke);

        if (cancelled) return;

        if (rates && rates.length > 0) {
          const byZone = new Map<string, number>();
          for (const r of rates) {
            const existing = byZone.get(r.zon) || 0;
            if (r.timpris_kund > existing) byZone.set(r.zon, r.timpris_kund);
          }
          setZoneRates(
            Array.from(byZone.entries())
              .map(([zon, timpris]) => ({ zon, timpris }))
              .sort((a, b) => a.zon.localeCompare(b.zon)),
          );
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
    fetchRates();
    return () => {
      cancelled = true;
    };
  }, [survey?.yrke, selectedLocation]);

  if (!survey) return null;

  return (
    <div className="min-h-screen bg-secondary/30">
      {/* Nav */}
      <nav className="sticky top-0 z-50 bg-card/80 backdrop-blur-md border-b border-border">
        <div className="max-w-6xl mx-auto px-6 py-4 flex justify-between items-center">
          <Link to="/" aria-label="CompCare startsida">
            <CompcareLogo variant="full" />
          </Link>
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
              {/* Summary of survey choices */}
              <div className="space-y-2">
                <div className="rounded-xl border border-border bg-secondary/20 px-4 py-3 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Roll</span>
                    <span className="text-sm font-semibold text-foreground">{survey.yrke}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Kommun</span>
                    <span className="text-sm font-semibold text-foreground">{survey.kommun}</span>
                  </div>
                  {survey.employmentType && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Anställningsform</span>
                      <span className="text-sm font-semibold text-foreground">
                        {survey.employmentType === "anstalld" ? "Anställd" : "Egenföretagare"}
                      </span>
                    </div>
                  )}
                  {survey.currentSalary != null && survey.currentSalary > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Nuvarande ersättning</span>
                      <span className="text-sm font-semibold text-foreground">{fmt(survey.currentSalary)} kr</span>
                    </div>
                  )}
                </div>
              </div>

              {loading && (
                <div className="rounded-xl border border-border bg-secondary/20 px-4 py-4 flex items-center justify-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" /> Hämtar priser...
                </div>
              )}
            </div>

            {/* Results */}
            {zoneRates && zoneRates.length > 0 && !loading && (
              <div className="border-t border-border bg-secondary/30 px-5 py-5 space-y-4">
                {/* User's zone */}
                <div className="text-center space-y-1 mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">Din ort</p>
                  <div className="flex items-center justify-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span className="font-display text-base font-bold text-foreground">{survey.kommun}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {userZone} — {ZONE_LABELS[userZone || ""] || ""}
                  </p>
                </div>

                {/* User zone rate card */}
                {(() => {
                  const userRate = zoneRates.find((r) => r.zon === userZone);
                  if (!userRate) return null;
                  return (
                    <div className="bg-primary/5 border-2 border-primary/30 rounded-xl p-4 text-center">
                      <p className="text-xs font-semibold text-primary uppercase tracking-wider mb-1">
                        {userRate.zon} — Din zon
                      </p>
                      <p className="text-3xl font-display font-black text-foreground tracking-tight">
                        {fmt(userRate.timpris)}{" "}
                        <span className="text-base font-medium text-muted-foreground">kr/tim</span>
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
                    .filter((r) => r.zon !== userZone)
                    .map((r) => (
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
                  {survey.yrke} · Kundpris enligt SKR ramavtal 2026
                </p>

                {/* Gated section */}
                <div className="mt-6 relative">
                  <div className="absolute inset-0 bg-gradient-to-b from-transparent via-card/60 to-card z-10 rounded-xl" />
                  <div className="relative z-0 space-y-3 opacity-40 blur-[2px] select-none pointer-events-none">
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Kommuner i {userZone}</p>
                      <div className="flex flex-wrap gap-1">
                        {["Stockholm", "Göteborg", "Malmö", "Uppsala", "Linköping"].map((k) => (
                          <span key={k} className="text-xs bg-secondary px-2 py-0.5 rounded">
                            {k}
                          </span>
                        ))}
                        <span className="text-xs text-muted-foreground">+82 till</span>
                      </div>
                    </div>
                    <div className="bg-card border border-border rounded-xl p-4">
                      <p className="text-xs font-semibold text-muted-foreground mb-2">Beräknad ersättning (anställd)</p>
                      <p className="text-lg font-bold text-foreground">38 500 – 42 100 kr/mån</p>
                    </div>
                  </div>

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
                        Redan registrerad?{" "}
                        <Link to="/logga-in" className="text-primary hover:underline">
                          Logga in
                        </Link>
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
              <div className="border-t border-border bg-secondary/30 px-5 py-5 space-y-4">
                <p className="text-sm text-muted-foreground text-center">
                  Inga priser hittades för <span className="font-semibold text-foreground">{survey.yrke}</span>. Här är
                  ett exempel med Barnmorska:
                </p>

                <div className="text-center space-y-1 mb-2">
                  <p className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                    Exempelpris — Barnmorska
                  </p>
                </div>

                {[
                  { zon: "Zon 1", timpris: 770 },
                  { zon: "Zon 2", timpris: 824 },
                  { zon: "Zon 3", timpris: 880 },
                ].map((r) => (
                  <div key={r.zon} className="bg-card border border-border rounded-xl p-4 text-center">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1">
                      {r.zon} — {ZONE_LABELS[r.zon] || ""}
                    </p>
                    <p className="text-2xl font-display font-bold text-foreground tracking-tight">
                      {fmt(r.timpris)} <span className="text-base font-medium text-muted-foreground">kr/tim</span>
                    </p>
                  </div>
                ))}

                <p className="text-[10px] text-muted-foreground/70 text-center">
                  Barnmorska · Kundpris enligt SKR ramavtal 2026
                </p>
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
