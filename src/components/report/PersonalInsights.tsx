import { Sparkles, TrendingUp, MapPin, BarChart3 } from "lucide-react";
import { fmt } from "@/shared/formatters";
import type { ResultJson, ZoneComparison } from "@/shared/types";

interface Props {
  r: ResultJson;
  currentHourly: number;
  isEmployee: boolean;
  occupation: string;
  userZone?: string;
  zoneComparisons?: ZoneComparison[];
}

export default function PersonalInsights({
  r,
  currentHourly,
  isEmployee,
  occupation,
  userZone,
  zoneComparisons,
}: Props) {
  const marketRate = r.market?.rate_customer_sek_per_hour ?? 0;
  const rec = r.recommendation;
  if (!rec || marketRate <= 0 || currentHourly <= 0) return null;

  // For employees, compare total employment cost (salary × 1.42) to customer rate
  const employerFactor = 1.42;
  const costToCompare = isEmployee ? Math.round(currentHourly * employerFactor) : currentHourly;
  const shareOfCustomerPrice = Math.round((costToCompare / marketRate) * 100);
  const medianShare = isEmployee ? 85 : 90;

  // Zone price difference insight
  let zoneDiffInsight: { bestZone: string; diffPerHour: number } | null = null;
  if (zoneComparisons && zoneComparisons.length > 1 && userZone) {
    const userZoneData = zoneComparisons.find((z) => z.zon === userZone);
    const bestZone = [...zoneComparisons].sort((a, b) => b.timpris_kund - a.timpris_kund)[0];
    if (userZoneData && bestZone && bestZone.zon !== userZone) {
      const diff = bestZone.timpris_kund - userZoneData.timpris_kund;
      if (diff > 0) {
        zoneDiffInsight = { bestZone: bestZone.zon, diffPerHour: diff };
      }
    }
  }

  // Percentile position (approximate based on share range)
  const percentilePosition = shareOfCustomerPrice >= 90
    ? 85
    : shareOfCustomerPrice >= 85
      ? 70
      : shareOfCustomerPrice >= 75
        ? 45
        : shareOfCustomerPrice >= 65
          ? 25
          : 10;

  const insights: { icon: typeof Sparkles; text: string }[] = [];

  insights.push({
    icon: TrendingUp,
    text: `Du ligger över snittet av konsulter i din specialitet.`,
  });

  if (zoneDiffInsight) {
    insights.push({
      icon: MapPin,
      text: `I ${zoneDiffInsight.bestZone} betalas ${occupation.toLowerCase()} ${fmt(zoneDiffInsight.diffPerHour)} kr/h mer än i din zon.`,
    });
  }

  insights.push({
    icon: BarChart3,
    text: isEmployee
      ? `Din lönekostnad (brutto × 1,42) motsvarar ${shareOfCustomerPrice} % av kundpriset. Medianen är ${medianShare} %.`
      : `Din ersättning motsvarar ${shareOfCustomerPrice} % av kundpriset. Medianen är ${medianShare} %.`,
  });

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-caption">
          Din marknadsposition
        </p>
      </div>
      <div className="space-y-2">
        {insights.map((insight, i) => (
          <div
            key={i}
            className="flex items-start gap-3 p-3.5 rounded-xl bg-foreground/[0.03] border border-border"
          >
            <insight.icon className="w-4 h-4 text-primary mt-0.5 shrink-0" />
            <p className="text-body-sm leading-relaxed">{insight.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
