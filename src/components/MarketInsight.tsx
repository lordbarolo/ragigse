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

export default function MarketInsight({ occupation, currentZone, rates, employmentType }: MarketInsightProps) {
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
    <Card className="card-shadow overflow-hidden">
      <CardContent className="pt-5 pb-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="w-5 h-5 text-primary" />
          <h3 className="font-display text-lg font-semibold text-foreground">
            Marknadsöversikt — {occupation}
          </h3>
        </div>

        <p className="text-xs text-muted-foreground">
          Ramavtalspriser per zon (nationell priskatalog 2026).
        </p>

        <div className="space-y-2.5">
          {zoneRates.map((z) => {
            const isCurrent = z.zon === currentZone;
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
                  <span className={`font-medium ${isCurrent ? "font-bold text-foreground" : "text-muted-foreground blur-sm select-none"}`}>
                    {fmt(z.timpris_kund)} kr/h
                  </span>
                </div>
                <div className="h-5 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      isCurrent ? "bg-primary" : "bg-primary/20"
                    }`}
                    style={{ width: `${width}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>

        {/* Conversion hook */}
        {zoneRates.length >= 2 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Du kan tjäna betydligt mer.
              <br />
              <span className="font-semibold text-foreground">Se vilka orter som ger dig högre lön.</span>
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
