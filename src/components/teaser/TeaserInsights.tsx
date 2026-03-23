import { Sparkles, TrendingUp, BarChart3 } from "lucide-react";

interface Props {
  sharePercent: number;
  isEmployee: boolean;
  percentilePosition: number;
}

/**
 * Lightweight version of PersonalInsights for the teaser page A/B test.
 * Shown to 50% of visitors before the email gate.
 */
export default function TeaserInsights({ sharePercent, isEmployee, percentilePosition }: Props) {
  const medianShare = isEmployee ? 85 : 90;

  const insights = [
    {
      icon: TrendingUp,
      text: `Du ligger över ${percentilePosition} % av konsulter i din specialitet.`,
    },
    {
      icon: BarChart3,
      text: isEmployee
        ? `Din lönekostnad (brutto × 1,42) motsvarar ${sharePercent} % av kundpriset. Medianen är ${medianShare} %.`
        : `Din ersättning motsvarar ${sharePercent} % av kundpriset. Medianen är ${medianShare} %.`,
    },
  ];

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-primary" />
        <p className="text-caption">Din marknadsposition</p>
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
