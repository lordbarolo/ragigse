import { useMemo } from "react";
import { MapPin, Lock } from "lucide-react";

interface ZoneRate {
  zon: string;
  timpris_kund: number;
}

interface MarketInsightProps {
  occupation: string;
  currentZone: string;
  rates: { yrkeskategori: string; zon: string; timpris_kund: number; typ: string }[];
  employmentType: "anstalld" | "foretagare";
  locations?: { kommun: string; zon: string; region: string }[];
  currentRegion?: string;
}

export default function MarketInsight({ occupation, currentZone, rates }: MarketInsightProps) {
  const zoneRates = useMemo(() => {
    const occupationRates = rates.filter((r) => r.yrkeskategori === occupation);
    if (occupationRates.length === 0) {
      const matchingRate = rates.find((r) => r.yrkeskategori === occupation);
      if (!matchingRate) return [];
      const typRates = rates.filter((r) => r.typ === matchingRate.typ);
      const byZone = new Map<string, ZoneRate>();
      for (const r of typRates) {
        const existing = byZone.get(r.zon);
        if (!existing || r.timpris_kund > existing.timpris_kund) {
          byZone.set(r.zon, { zon: r.zon, timpris_kund: r.timpris_kund });
        }
      }
      return Array.from(byZone.values()).sort((a, b) => a.zon.localeCompare(b.zon));
    }
    return occupationRates
      .map((r) => ({ zon: r.zon, timpris_kund: r.timpris_kund }))
      .sort((a, b) => a.zon.localeCompare(b.zon));
  }, [rates, occupation]);

  if (zoneRates.length < 2) return null;

  const maxRate = Math.max(...zoneRates.map((z) => z.timpris_kund));
  const fmt = (n: number) => new Intl.NumberFormat("sv-SE").format(n);

  return (
    <div className="rounded-lg border border-border bg-card card-shadow p-5 space-y-4">
      <div className="flex items-center gap-2">
        <MapPin className="w-5 h-5 text-primary shrink-0" />
        <h3 className="text-base font-bold text-foreground">Regional jämförelse</h3>
      </div>

      <p className="text-sm text-muted-foreground">
        Vad kunden betalar för {occupation} i alla zoner:
      </p>

      <div className="space-y-3">
        {zoneRates.map((z) => {
          const isCurrent = z.zon === currentZone;
          const width = Math.max((z.timpris_kund / maxRate) * 100, 20);

          return (
            <div
              key={z.zon}
              className={`rounded-lg border p-4 ${
                isCurrent
                  ? "border-primary bg-primary/5"
                  : "border-border bg-muted/30"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-bold ${isCurrent ? "text-foreground" : "text-foreground"}`}>
                    {z.zon}
                  </span>
                  {isCurrent && (
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                      Din zon
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-1">
                  {!isCurrent && <Lock className="w-3 h-3 text-muted-foreground" />}
                  <span className={`text-sm font-bold ${
                    isCurrent ? "text-foreground" : "text-muted-foreground blur-[8px] select-none"
                  }`}>
                    {fmt(z.timpris_kund)} kr/h
                  </span>
                </div>
              </div>
              <div className="h-2 bg-muted rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isCurrent ? "bg-primary" : "bg-muted-foreground/30"
                  }`}
                  style={{ width: `${width}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
