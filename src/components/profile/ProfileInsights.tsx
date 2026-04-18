import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { calculateSalaryRange } from "@/lib/calc";
import type { EmploymentType } from "@/lib/calc";
import { TrendingUp, MapPin, Radar } from "lucide-react";

interface ZoneRate {
  zon: string;
  timpris_kund: number;
}

interface SalaryZone {
  zon: string;
  hourly_min: number;
  hourly_max: number;
  monthly_min: number;
  monthly_max: number;
}

interface UpcomingAssignment {
  buyer: string;
  competence: string;
  location: string;
  forecastWindow: string;
  probabilityLevel: number;
}

interface Props {
  specialtyName: string | null;
  regionName: string | null;
  employmentType: string | null;
}

const fmt = (n: number) => n.toLocaleString("sv-SE");

const ZON_LABELS: Record<string, string> = {
  "Zon 1": "Storstad",
  "Zon 2": "Mellanstor",
  "Zon 3": "Glesbygd",
};

export default function ProfileInsights({ specialtyName, regionName, employmentType }: Props) {
  const [zoneRates, setZoneRates] = useState<ZoneRate[]>([]);
  const [salaryZones, setSalaryZones] = useState<SalaryZone[]>([]);
  const [assignments, setAssignments] = useState<UpcomingAssignment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!specialtyName) return;
    const fetch = async () => {
      // 1. Fetch rates for this role across zones
      const { data: rates } = await supabase
        .from("rates")
        .select("zon, timpris_kund")
        .eq("yrkeskategori", specialtyName)
        .order("zon");

      const zr = rates || [];
      setZoneRates(zr);

      // 2. Calculate salary ranges
      const empType: EmploymentType = employmentType === "consultant" ? "foretagare" : "anstalld";
      const salaries = zr.map((r) => {
        const range = calculateSalaryRange(r.timpris_kund, empType);
        return { zon: r.zon, ...range };
      });
      setSalaryZones(salaries);

      // 3. Fetch upcoming assignments from radar — strictly filtered to user's role
      try {
        const roleName = specialtyName || "Sjuksköterska";
        const params = new URLSearchParams({ competence: roleName, pageSize: "5" });
        if (regionName) params.set("location", regionName);
        const { data: radarData } = await supabase.functions.invoke(
          `radar-predictions?${params.toString()}`,
          { method: "GET" },
        );
        if (radarData?.predictions) {
          // Extra client-side guard: only keep predictions matching the user's exact role
          const preds = (radarData.predictions as any[])
            .filter((p: any) => p.competence === roleName)
            .slice(0, 3)
            .map((p: any) => ({
              buyer: p.buyer,
              competence: p.competence,
              location: p.location,
              forecastWindow: p.forecastWindow,
              probabilityLevel: p.probabilityLevel,
            }));
          setAssignments(preds);
        }
      } catch {
        // silently fail
      }

      setLoading(false);
    };
    fetch();
  }, [specialtyName, regionName, employmentType]);

  if (loading || !specialtyName) return null;

  const probLabel = (level: number) =>
    level === 3 ? "Hög" : level === 2 ? "Medel" : "Låg";
  const probColor = (level: number) =>
    level === 3
      ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
      : level === 2
        ? "bg-amber-500/10 text-amber-700 dark:text-amber-400"
        : "bg-muted text-muted-foreground";

  return (
    <div className="space-y-5">
      {/* 1 — Kundpris per zon */}
      {zoneRates.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <TrendingUp className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Kundpris per zon</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {zoneRates.map((r) => (
              <div
                key={r.zon}
                className="min-w-[45vw] sm:min-w-0 sm:flex-1 snap-start shrink-0 rounded-xl border border-border bg-card p-4 space-y-1"
              >
                <p className="text-xs text-muted-foreground">{r.zon}</p>
                <p className="text-xs text-muted-foreground/70">{ZON_LABELS[r.zon] || ""}</p>
                <p className="text-lg font-semibold text-foreground">{fmt(r.timpris_kund)} <span className="text-xs font-normal text-muted-foreground">kr/h</span></p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2 — Lönespann per zon */}
      {salaryZones.length > 0 && (
        <div>
          <div className="flex items-start gap-2 mb-3">
            <MapPin className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-sm font-medium text-foreground">
              Förväntad ersättningsnivå{" "}
              <span className="font-normal text-muted-foreground">
                (Avdrag för kostnader kopplade till uppdraget kan påverka)
              </span>
            </p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {salaryZones.map((s) => (
              <div
                key={s.zon}
                className="min-w-[45vw] sm:min-w-0 sm:flex-1 snap-start shrink-0 rounded-xl border border-border bg-card p-4 space-y-1"
              >
                <p className="text-xs text-muted-foreground">{s.zon}</p>
                <p className="text-base font-semibold text-foreground">
                  {fmt(s.hourly_min)}–{fmt(s.hourly_max)} <span className="text-xs font-normal text-muted-foreground">kr/h</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {fmt(s.monthly_min)}–{fmt(s.monthly_max)} kr/mån
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 3 — Kommande uppdrag */}
      {assignments.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Radar className="w-4 h-4 text-primary" />
            <p className="text-sm font-medium text-foreground">Kommande uppdrag</p>
          </div>
          <div className="flex gap-3 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
            {assignments.map((a, i) => (
              <div
                key={i}
                className="min-w-[70vw] sm:min-w-[260px] snap-start shrink-0 rounded-xl border border-border bg-card p-4 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground truncate">{a.buyer}</p>
                  <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${probColor(a.probabilityLevel)}`}>
                    {probLabel(a.probabilityLevel)}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{a.competence}</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="w-3 h-3" />
                  {a.location}
                </div>
                <p className="text-xs text-muted-foreground/70">{a.forecastWindow}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
