import { useMemo } from "react";
import { BarChart3, MapPin, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ZoneRate {
  zon: string;
  timpris_kund: number;
}

interface MarketInsightProps {
  occupation: string;
  currentZone: string;
  rates: { yrkeskategori: string; zon: string; timpris_kund: number; typ: string }[];
  employmentType: "anstalld" | "foretagare";
}

// Show raw timpris_kund (ramavtalspris) directly

export default function MarketInsight({ occupation, currentZone, rates, employmentType }: MarketInsightProps) {
  const zoneRates = useMemo(() => {
    // Find all rates for matching occupation across zones
    const occupationRates = rates.filter((r) => r.yrkeskategori === occupation);
    if (occupationRates.length === 0) {
      // Fallback: match by typ
      const matchingRate = rates.find((r) => r.yrkeskategori === occupation);
      if (!matchingRate) return [];
      const typRates = rates.filter((r) => r.typ === matchingRate.typ);
      // Deduplicate by zone, pick highest
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
    <Card className="card-shadow overflow-hidden">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Marknadsöversikt — {occupation}
          </h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Ramavtalspriser per zon (nationell priskatalog 2026). Rekommenderad ersättning utgör 85–90 % av dessa.
        </p>

        <div className="space-y-2.5">
          {zoneRates.map((z) => {
            const isCurrent = z.zon === currentZone;
            const salary = z.timpris_kund;
            const width = Math.max((z.timpris_kund / maxRate) * 100, 20);

            return (
              <div key={z.zon}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="flex items-center gap-1">
                    {isCurrent && <MapPin className="w-3 h-3 text-primary" />}
                    <span className={isCurrent ? "font-semibold text-foreground" : "text-muted-foreground"}>
                      {z.zon}
                      {isCurrent && " (din zon)"}
                    </span>
                  </span>
                  <span className={isCurrent ? "font-bold text-foreground" : "font-medium text-muted-foreground"}>
                    {fmt(salary)} kr/h
                  </span>
                </div>
                <div className="h-5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isCurrent ? "bg-primary" : "bg-primary/40"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Zone premium hint */}
        {zoneRates.length >= 2 && (() => {
          const currentRate = zoneRates.find((z) => z.zon === currentZone);
          const highest = zoneRates[zoneRates.length - 1];
          if (!currentRate || currentRate.zon === highest.zon) return null;
          const diff = highest.timpris_kund - currentRate.timpris_kund;
          if (diff <= 0) return null;
          return (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
              <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground">
                I <span className="font-semibold text-foreground">{highest.zon}</span> är ersättningen{" "}
                <span className="font-semibold text-foreground">{fmt(diff)} kr/h mer</span> än i din zon.
              </p>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
