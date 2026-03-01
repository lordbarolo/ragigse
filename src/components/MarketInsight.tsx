import { useMemo, useState } from "react";
import { BarChart3, MapPin, ChevronDown } from "lucide-react";

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
  const [open, setOpen] = useState(false);

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
    <div className="rounded-lg border border-border bg-card card-shadow overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between gap-2 p-4 text-left hover:bg-muted/50 transition-colors"
      >
        <div className="flex items-center gap-2">
          <BarChart3 className="w-4 h-4 text-primary shrink-0" />
          <span className="text-sm font-semibold text-foreground leading-snug">
            Se vad regionerna betalar till bemanningsföretag
          </span>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="px-4 pb-5 space-y-4 animate-fade-in">
          <p className="text-xs text-muted-foreground">
            Ramavtalspriser för <span className="font-medium text-foreground">{occupation}</span> per zon (nationell priskatalog 2026).
          </p>

          <div className="space-y-3">
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
                    <span className={`font-medium ${isCurrent ? "font-bold text-foreground" : "text-muted-foreground"}`}>
                      {fmt(z.timpris_kund)} kr/h
                    </span>
                  </div>
                  <div className="h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-700 ${isCurrent ? "bg-primary" : "bg-primary/20"}`}
                      style={{ width: `${width}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
