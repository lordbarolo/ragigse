import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { TrendingUp, TrendingDown, Activity, MapPin, Crown, ArrowUpRight } from "lucide-react";

interface KpiRowProps {
  /** Highest ceiling rate from active contract versions (already loaded by parent). */
  topRate: number | null;
  /** Total number of distinct specialties (already computed by parent). */
  specialtyCount: number;
}

interface KpiData {
  calloffs30d: number;
  calloffsPrev30d: number;
  filled30d: number;
  decidable30d: number;
  regions30d: number;
  spark: { day: string; cnt: number }[];
}

export default function MarketKpiRow({ topRate, specialtyCount }: KpiRowProps) {
  const [data, setData] = useState<KpiData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        // Pull last 60 days of calloffs in one query, then aggregate client-side.
        const since = new Date();
        since.setDate(since.getDate() - 60);
        const { data: rows, error } = await supabase
          .from("calloff_imports")
          .select("calloff_date, region, filled")
          .gte("calloff_date", since.toISOString().slice(0, 10))
          .limit(10000);

        if (error) throw error;
        if (cancelled) return;

        const today = new Date();
        const cutoff30 = new Date();
        cutoff30.setDate(cutoff30.getDate() - 30);

        let calloffs30d = 0;
        let calloffsPrev30d = 0;
        let filled30d = 0;
        let decidable30d = 0;
        const regionsSet = new Set<string>();
        const dayMap: Record<string, number> = {};

        for (const r of rows || []) {
          if (!r.calloff_date) continue;
          const d = new Date(r.calloff_date);
          if (d > today) continue;
          if (d >= cutoff30) {
            calloffs30d++;
            if (r.region) regionsSet.add(r.region);
            if (r.filled !== null) {
              decidable30d++;
              if (r.filled === true) filled30d++;
            }
            const key = r.calloff_date as string;
            dayMap[key] = (dayMap[key] || 0) + 1;
          } else {
            calloffsPrev30d++;
          }
        }

        // Build dense daily series for sparkline
        const spark: { day: string; cnt: number }[] = [];
        const cursor = new Date(cutoff30);
        while (cursor <= today) {
          const key = cursor.toISOString().slice(0, 10);
          spark.push({ day: key, cnt: dayMap[key] || 0 });
          cursor.setDate(cursor.getDate() + 1);
        }

        setData({ calloffs30d, calloffsPrev30d, filled30d, decidable30d, regions30d: regionsSet.size, spark });
      } catch (err) {
        console.error("[MarketKpiRow] fetch failed", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const fillRate = useMemo(() => {
    if (!data || data.decidable30d === 0) return null;
    return Math.round((data.filled30d / data.decidable30d) * 100);
  }, [data]);

  const calloffsTrend = useMemo(() => {
    if (!data || data.calloffsPrev30d === 0) return null;
    return Math.round(((data.calloffs30d - data.calloffsPrev30d) / data.calloffsPrev30d) * 100);
  }, [data]);

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-2 px-0.5">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Historisk översikt · senaste 30 dagarna
        </h2>
        <span className="text-[10px] text-muted-foreground/70">
          Endast historiska avrop · inga prognoser
        </span>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          icon={Activity}
          label="Avrop · publicerade"
          value={loading ? "—" : data?.calloffs30d.toLocaleString("sv-SE") ?? "0"}
          trend={calloffsTrend}
          trendLabel="vs. föregående 30d"
          spark={data?.spark.map((s) => s.cnt) ?? []}
          loading={loading}
        />
        <KpiCard
          icon={TrendingUp}
          label="Historisk fyllnadsgrad"
          value={loading ? "—" : fillRate !== null ? `${fillRate}%` : "—"}
          sublabel={
            loading || !data
              ? undefined
              : `${data.filled30d.toLocaleString("sv-SE")} av ${data.decidable30d.toLocaleString("sv-SE")} tillsattes`
          }
          loading={loading}
        />
        <KpiCard
          icon={MapPin}
          label="Regioner med data"
          value={loading ? "—" : `${data?.regions30d ?? 0}`}
          sublabel="av 21 totalt"
          loading={loading}
        />
        <KpiCard
          icon={Crown}
          label="Topptak ramavtal"
          value={topRate ? `${topRate.toLocaleString("sv-SE")} kr` : "—"}
          sublabel={`över ${specialtyCount} roller`}
        />
      </div>
    </div>
  );
}

interface KpiCardProps {
  icon: typeof Activity;
  label: string;
  value: string;
  sublabel?: string;
  trend?: number | null;
  trendLabel?: string;
  spark?: number[];
  loading?: boolean;
}

function KpiCard({ icon: Icon, label, value, sublabel, trend, trendLabel, spark, loading }: KpiCardProps) {
  const trendUp = trend !== null && trend !== undefined && trend > 0;
  const trendDown = trend !== null && trend !== undefined && trend < 0;
  const trendNeutral = trend === 0;

  return (
    <Card className="p-3 relative overflow-hidden group hover:border-primary/30 transition-colors">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
          <Icon className="w-3 h-3" />
          {label}
        </div>
        <ArrowUpRight className="w-3 h-3 text-muted-foreground/40 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      <div className="flex items-baseline gap-2 flex-wrap">
        <span className={`text-xl font-bold tracking-tight tabular-nums ${loading ? "animate-pulse text-muted-foreground/50" : "text-foreground"}`}>
          {value}
        </span>
        {trend !== null && trend !== undefined && !loading && (
          <span
            className={`inline-flex items-center gap-0.5 text-[10px] font-semibold tabular-nums ${
              trendUp ? "text-emerald-600 dark:text-emerald-400" : trendDown ? "text-rose-600 dark:text-rose-400" : "text-muted-foreground"
            }`}
          >
            {trendUp && <TrendingUp className="w-2.5 h-2.5" />}
            {trendDown && <TrendingDown className="w-2.5 h-2.5" />}
            {trendNeutral ? "0%" : `${trend > 0 ? "+" : ""}${trend}%`}
          </span>
        )}
      </div>
      {(sublabel || trendLabel) && (
        <p className="text-[10px] text-muted-foreground mt-0.5 leading-tight">
          {sublabel ?? trendLabel}
        </p>
      )}
      {spark && spark.length > 1 && <Sparkline values={spark} />}
    </Card>
  );
}

function Sparkline({ values }: { values: number[] }) {
  const max = Math.max(1, ...values);
  const w = 100;
  const h = 24;
  const step = w / (values.length - 1);
  const points = values
    .map((v, i) => `${(i * step).toFixed(2)},${(h - (v / max) * h).toFixed(2)}`)
    .join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-6 mt-2 overflow-visible" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        fill="none"
        stroke="hsl(var(--primary))"
        strokeWidth="1.25"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
