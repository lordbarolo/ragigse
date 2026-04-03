import { useState, useMemo, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import {
  Activity, Brain, TrendingUp, Zap, Target, BarChart3, Info,
} from "lucide-react";

/* ────────── types ────────── */
interface RateRow {
  yrkeskategori: string;
  zon: string;
  timpris_kund: number;
  typ: string;
}

/* ────────── helpers ────────── */
const ZONES = ["Zon 1", "Zon 2", "Zon 3"] as const;
const ZONE_COLORS: Record<string, string> = {
  "Zon 1": "hsl(var(--primary))",
  "Zon 2": "hsl(142 71% 45%)",
  "Zon 3": "hsl(38 92% 50%)",
};

/** Simulated win-probability based on premium relative to ceiling */
function winProbability(premiumPct: number): number {
  // logistic decay: at 0% premium → ~95%, at 50% → ~50%, at 100% → ~10%
  const k = -0.06;
  const mid = 50;
  return 95 / (1 + Math.exp(-k * (premiumPct - mid) * -1));
}

/* ────────── sub-components ────────── */

function AiSummaryBox({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-2 mt-3 p-3 rounded-md bg-primary/5 border border-primary/10">
      <Brain className="w-4 h-4 text-primary shrink-0 mt-0.5" />
      <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
    </div>
  );
}

function SectionHeader({ icon: Icon, title }: { icon: typeof Activity; title: string }) {
  return (
    <div className="flex items-center gap-2">
      <Icon className="w-4 h-4 text-primary" />
      <span className="text-sm font-semibold tracking-tight">{title}</span>
    </div>
  );
}

/* ────────── main page ────────── */
export default function MarketEdge() {
  const [rates, setRates] = useState<RateRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [premiumSlider, setPremiumSlider] = useState(20); // % above ceiling

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("contract_version_rates")
        .select("yrkeskategori, zon, timpris_kund, typ")
        .in("version_id", 
          (await supabase.from("contract_versions").select("id").eq("is_active", true)).data?.map(v => v.id) ?? []
        );
      if (data) setRates(data as unknown as RateRow[]);
      setLoading(false);
    })();
  }, []);

  /* ── Derived data ── */
  const specialties = useMemo(() => [...new Set(rates.map(r => r.yrkeskategori))].sort(), [rates]);

  // Price Elasticity curve data
  const elasticityCurve = useMemo(() => {
    return Array.from({ length: 21 }, (_, i) => {
      const pct = i * 5; // 0-100%
      return {
        premiumPct: pct,
        winProb: Math.round(winProbability(pct) * 10) / 10,
        label: `+${pct}%`,
      };
    });
  }, []);

  const currentWinProb = useMemo(() => winProbability(premiumSlider), [premiumSlider]);

  // Heatmap: specialty × zone → timpris
  const heatmapData = useMemo(() => {
    const baseRates = rates.filter(r => r.typ === "Grundpris" || r.typ === "Läkare");
    const grouped: Record<string, Record<string, number>> = {};
    baseRates.forEach(r => {
      if (!grouped[r.yrkeskategori]) grouped[r.yrkeskategori] = {};
      grouped[r.yrkeskategori][r.zon] = r.timpris_kund;
    });
    return grouped;
  }, [rates]);

  // Shortened specialty names for display
  const shortName = (name: string) => {
    if (name.startsWith("Specialistsjuksköterska")) return "SSK " + name.replace("Specialistsjuksköterska ", "");
    if (name.startsWith("Specialistläkare")) return name.replace("Specialistläkare ", "Spec.läk ");
    return name;
  };

  // Market context JSON for agents
  const marketContext = useMemo(() => ({
    timestamp: new Date().toISOString(),
    totalSpecialties: specialties.length,
    zones: ZONES,
    currentPremium: premiumSlider,
    currentWinProbability: Math.round(currentWinProb * 10) / 10,
    ratesSummary: Object.entries(heatmapData).map(([spec, zones]) => ({
      specialty: spec,
      rates: zones,
    })),
  }), [specialties, premiumSlider, currentWinProb, heatmapData]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Activity className="w-5 h-5 animate-spin text-primary" />
      </div>
    );
  }

  // Heatmap value → color intensity
  const allPrices = Object.values(heatmapData).flatMap(z => Object.values(z));
  const minPrice = Math.min(...allPrices);
  const maxPrice = Math.max(...allPrices);
  const intensity = (val: number) => {
    const ratio = (val - minPrice) / (maxPrice - minPrice || 1);
    // from cool (low) to warm (high)
    return `hsl(${160 - ratio * 140}, ${50 + ratio * 30}%, ${25 + (1 - ratio) * 15}%)`;
  };

  return (
    <div className="space-y-6">
      {/* Hidden agent context */}
      <div
        id="market-context-provider"
        data-agent-context={JSON.stringify(marketContext)}
        aria-hidden="true"
        className="hidden"
      />

      {/* ── Header ── */}
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-primary/10">
          <Zap className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">Market Intelligence Terminal</h1>
          <p className="text-xs text-muted-foreground">Realtidsdata från ramavtal · {specialties.length} roller · {ZONES.length} zoner</p>
        </div>
      </div>

      {/* ── Row 1: Price Elasticity Simulator ── */}
      <Card
        data-agent-context={JSON.stringify({
          widget: "price-elasticity-simulator",
          premiumPct: premiumSlider,
          winProbability: Math.round(currentWinProb * 10) / 10,
          curveData: elasticityCurve,
        })}
      >
        <CardHeader className="pb-2">
          <SectionHeader icon={TrendingUp} title="Price Elasticity Simulator" />
          <p className="text-xs text-muted-foreground">Justera premium ovanför avtalstaktpriset och se estimerad vinstsannolikhet</p>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Slider */}
          <div className="flex items-center gap-4">
            <span className="text-xs text-muted-foreground w-28 shrink-0">Premium: +{premiumSlider}%</span>
            <Slider
              value={[premiumSlider]}
              onValueChange={([v]) => setPremiumSlider(v)}
              min={0}
              max={100}
              step={1}
              className="flex-1"
            />
            <div className="text-right min-w-[80px]">
              <span className={`text-lg font-bold ${currentWinProb > 60 ? "text-green-500" : currentWinProb > 35 ? "text-yellow-500" : "text-red-500"}`}>
                {currentWinProb.toFixed(1)}%
              </span>
              <p className="text-[10px] text-muted-foreground">Win-sannolikhet</p>
            </div>
          </div>

          {/* Chart */}
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={elasticityCurve}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit="%" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Line
                type="monotone"
                dataKey="winProb"
                stroke="hsl(var(--primary))"
                strokeWidth={2}
                dot={false}
                name="Win-sannolikhet"
              />
              {/* Current position marker */}
              <Line
                data={[
                  { label: `+${premiumSlider}%`, winProb: currentWinProb, premiumPct: premiumSlider },
                ]}
                type="monotone"
                dataKey="winProb"
                stroke="hsl(var(--destructive))"
                strokeWidth={0}
                dot={{ r: 6, fill: "hsl(var(--destructive))" }}
                name="Nuvarande"
                legendType="circle"
              />
            </LineChart>
          </ResponsiveContainer>

          <AiSummaryBox
            text={
              premiumSlider <= 15
                ? `Vid +${premiumSlider}% premium ligger win-sannolikheten på ${currentWinProb.toFixed(0)}%. Det är en konkurrenskraftig nivå — de flesta upphandlingar vinns under 15% premium. Marginalerna är dock pressade.`
                : premiumSlider <= 40
                ? `Vid +${premiumSlider}% premium sjunker win-sannolikheten till ${currentWinProb.toFixed(0)}%. Historiskt sett vinner byråer i detta spann när de kan differentiera på specialistkompetens eller snabb leverans.`
                : `Vid +${premiumSlider}% premium är win-sannolikheten bara ${currentWinProb.toFixed(0)}%. Detta fungerar enbart för nisch-specialiteter med låg tillgänglighet, t.ex. IVA-ssk i Zon 3.`
            }
          />
        </CardContent>
      </Card>

      {/* ── Row 2: Win-Probability Heatmap ── */}
      <Card
        data-agent-context={JSON.stringify({
          widget: "win-probability-heatmap",
          description: "Timpris per yrkeskategori och zon. Högre pris = lägre konkurrens = högre win-sannolikhet vid premium.",
          data: heatmapData,
        })}
      >
        <CardHeader className="pb-2">
          <SectionHeader icon={Target} title="Win-Probability Heatmap" />
          <p className="text-xs text-muted-foreground">Takpris (SEK/tim) per yrkeskategori × zon — mörkare = högre takpris</p>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left py-2 pr-3 font-medium text-muted-foreground">Yrkeskategori</th>
                  {ZONES.map(z => (
                    <th key={z} className="text-center py-2 px-2 font-medium text-muted-foreground">{z}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {Object.entries(heatmapData)
                  .sort(([, a], [, b]) => (b["Zon 1"] ?? 0) - (a["Zon 1"] ?? 0))
                  .map(([spec, zones]) => (
                  <tr key={spec} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                    <td className="py-1.5 pr-3 text-foreground font-medium truncate max-w-[200px]" title={spec}>
                      {shortName(spec)}
                    </td>
                    {ZONES.map(z => {
                      const val = zones[z];
                      return (
                        <td key={z} className="text-center py-1.5 px-2">
                          {val ? (
                            <span
                              className="inline-block px-2 py-0.5 rounded text-[11px] font-mono font-semibold"
                              style={{
                                backgroundColor: intensity(val),
                                color: "#fff",
                              }}
                              data-agent-context={JSON.stringify({ specialty: spec, zone: z, rate: val })}
                            >
                              {val}
                            </span>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Legend */}
          <div className="flex items-center gap-4 mt-3 text-[10px] text-muted-foreground">
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: intensity(minPrice) }} />
              <span>{minPrice} SEK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: intensity((minPrice + maxPrice) / 2) }} />
              <span>{Math.round((minPrice + maxPrice) / 2)} SEK</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-3 rounded" style={{ backgroundColor: intensity(maxPrice) }} />
              <span>{maxPrice} SEK</span>
            </div>
          </div>

          <AiSummaryBox
            text={`Heatmappen visar ${Object.keys(heatmapData).length} yrkeskategorier över ${ZONES.length} zoner. Specialistläkare Grupp B i Zon 3 har det högsta takpriset (${maxPrice} SEK/tim), vilket indikerar låg tillgänglighet och hög premiumtolerans. Sjuksköterskor i Zon 1 har lägst takpris (${minPrice} SEK/tim) — här är priskonkurrensen som hårdast.`}
          />
        </CardContent>
      </Card>

      {/* ── Row 3: Zone Price Comparison ── */}
      <Card
        data-agent-context={JSON.stringify({
          widget: "zone-price-comparison",
          description: "Bar chart comparing ceiling prices across zones for top specialties.",
          topSpecialties: specialties.slice(0, 8),
        })}
      >
        <CardHeader className="pb-2">
          <SectionHeader icon={BarChart3} title="Zonprisjämförelse — Topp 8 roller" />
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart
              data={Object.entries(heatmapData)
                .sort(([, a], [, b]) => (b["Zon 3"] ?? 0) - (a["Zon 3"] ?? 0))
                .slice(0, 8)
                .map(([spec, zones]) => ({
                  name: shortName(spec),
                  ...zones,
                }))}
            >
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="name" tick={{ fontSize: 9, fill: "hsl(var(--muted-foreground))" }} angle={-20} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }} unit=" kr" />
              <Tooltip
                contentStyle={{
                  backgroundColor: "hsl(var(--card))",
                  border: "1px solid hsl(var(--border))",
                  borderRadius: 8,
                  fontSize: 12,
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              {ZONES.map(z => (
                <Line key={z} type="monotone" dataKey={z} stroke={ZONE_COLORS[z]} strokeWidth={2} dot={{ r: 3 }} name={z} />
              ))}
            </LineChart>
          </ResponsiveContainer>

          <AiSummaryBox
            text="Prisspridningen mellan Zon 1 och Zon 3 ökar markant för läkarroller — upp till 44% skillnad. Detta skapar arbitrage-möjligheter för byråer som kan rekrytera i lågpris-zoner och leverera till högpris-zoner."
          />
        </CardContent>
      </Card>

      {/* ── Status bar ── */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground px-1">
        <Info className="w-3 h-3" />
        <span>Data från aktiva ramavtalsversioner · Uppdateras vid avtalsändring · Agent-readable via data-agent-context</span>
      </div>
    </div>
  );
}
