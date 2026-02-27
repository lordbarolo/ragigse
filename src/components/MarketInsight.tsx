import { useMemo, useState } from "react";
import { BarChart3, MapPin, TrendingUp, ChevronDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface ZoneRate {
  zon: string;
  timpris_kund: number;
}

interface Location {
  kommun: string;
  zon: string;
  region: string;
}

interface MarketInsightProps {
  occupation: string;
  currentZone: string;
  rates: { yrkeskategori: string; zon: string; timpris_kund: number; typ: string }[];
  employmentType: "anstalld" | "foretagare";
  locations?: Location[];
  currentRegion?: string;
}

const ZONE_ORDER: Record<string, number> = { "Zon 1": 1, "Zon 2": 2, "Zon 3": 3 };

export default function MarketInsight({ occupation, currentZone, rates, employmentType, locations, currentRegion }: MarketInsightProps) {
  const [showCities, setShowCities] = useState(false);

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

  // Find the next higher zone (higher zone number = higher price)
  const currentZoneNum = ZONE_ORDER[currentZone] ?? 0;
  const nextHigherZone = useMemo(() => {
    // Higher zone number = further from metro = higher price
    const higherZones = zoneRates
      .filter((z) => (ZONE_ORDER[z.zon] ?? 0) > currentZoneNum)
      .sort((a, b) => (ZONE_ORDER[a.zon] ?? 0) - (ZONE_ORDER[b.zon] ?? 0));
    return higherZones[0]?.zon ?? null;
  }, [zoneRates, currentZoneNum]);

  // Get up to 5 cities in the next higher zone, prioritizing same region
  const nearbyCities = useMemo(() => {
    if (!nextHigherZone || !locations) return [];
    const inZone = locations.filter((l) => l.zon === nextHigherZone);
    // Sort: same region first, then alphabetical
    const sorted = [...inZone].sort((a, b) => {
      const aLocal = currentRegion && a.region === currentRegion ? 0 : 1;
      const bLocal = currentRegion && b.region === currentRegion ? 0 : 1;
      if (aLocal !== bLocal) return aLocal - bLocal;
      return a.kommun.localeCompare(b.kommun, "sv");
    });
    return sorted.slice(0, 5);
  }, [nextHigherZone, locations, currentRegion]);

  const canShowUpsell = nextHigherZone && nearbyCities.length > 0;

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
        {canShowUpsell && (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => setShowCities((v) => !v)}
              className="w-full flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10 hover:bg-primary/10 transition-colors text-left"
            >
              <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <p className="text-xs text-muted-foreground flex-1">
                Du kan tjäna betydligt mer.
                <br />
                <span className="font-semibold text-foreground">Se vilka orter som ger dig högre ersättning.</span>
              </p>
              <ChevronDown className={`w-4 h-4 text-primary mt-0.5 shrink-0 transition-transform ${showCities ? "rotate-180" : ""}`} />
            </button>

            {showCities && (
              <div className="p-3 rounded-lg bg-muted/50 border border-border space-y-1.5 animate-fade-in">
                <p className="text-xs font-medium text-foreground mb-2">
                  Orter i {nextHigherZone} nära dig:
                </p>
                {nearbyCities.map((c) => (
                  <div key={c.kommun} className="flex items-center gap-2 text-xs">
                    <MapPin className="w-3 h-3 text-primary shrink-0" />
                    <span className="text-foreground">{c.kommun}</span>
                    <span className="text-muted-foreground">({c.region})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Fallback if no upsell possible (already in highest zone) */}
        {!canShowUpsell && zoneRates.length >= 2 && (
          <div className="flex items-start gap-2 p-3 rounded-lg bg-primary/5 border border-primary/10">
            <TrendingUp className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Du är redan i den högsta priszonen — bra position för förhandling.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
