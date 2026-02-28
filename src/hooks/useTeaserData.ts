import { useMemo } from "react";
import type { SurveyData } from "@/components/Survey";
import type { BenchmarkResult } from "@/hooks/useBenchmarkEngine";
import type { BenchmarkMonthly } from "@/shared/types";

interface PricingResult {
  recommended_hourly_min: number;
  recommended_hourly_max: number;
  region?: string;
  zon?: string;
}

export function useTeaserData(
  survey: SurveyData | null,
  pricingResult: PricingResult | null,
  benchmarkResult: BenchmarkResult | null,
) {
  const track = (survey as SurveyData & { track?: string })?.track;
  const isPermanent = track === "permanent";

  const result = pricingResult
    ? { low: pricingResult.recommended_hourly_min, high: pricingResult.recommended_hourly_max }
    : null;

  const benchmarkMonthly: BenchmarkMonthly | null = benchmarkResult
    ? {
        p25: benchmarkResult.percentile_25,
        p50: benchmarkResult.percentile_50,
        p75: benchmarkResult.percentile_75,
        gapPct: benchmarkResult.gap_pct ?? 0,
        category: benchmarkResult.category,
      }
    : null;

  const userMonthly = useMemo(() => {
    if (!survey) return 0;
    return survey.salaryType === "hourly" ? survey.currentSalary * 167 : survey.currentSalary;
  }, [survey]);

  const userHourly = useMemo(() => {
    if (!survey) return 0;
    return survey.salaryType === "hourly" ? survey.currentSalary : Math.round(survey.currentSalary / 167);
  }, [survey]);

  const isUnderpaid = isPermanent
    ? (benchmarkMonthly ? userMonthly < benchmarkMonthly.p75 : false)
    : (result ? userHourly < result.high : false);

  const diffPercent = isPermanent
    ? (benchmarkMonthly ? benchmarkMonthly.gapPct : 0)
    : (result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0);

  return { isPermanent, result, benchmarkMonthly, userMonthly, userHourly, isUnderpaid, diffPercent };
}
