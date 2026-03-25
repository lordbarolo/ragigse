import { useMemo } from "react";
import type { SurveyData } from "@/components/Survey";
import type { BenchmarkResult } from "@/hooks/useBenchmarkEngine";
import type { BenchmarkMonthly } from "@/shared/types";

interface PricingResult {
  recommended_hourly_min: number;
  recommended_hourly_max: number;
  rate_customer_sek_per_hour?: number;
  region?: string;
  zon?: string;
}

/** Session-stable noise factor ±3% to prevent reverse-engineering of exact rates */
function getSessionNoiseFactor(): number {
  const key = "teaserNoiseSeed";
  let seed = sessionStorage.getItem(key);
  if (!seed) {
    seed = String(Math.random());
    sessionStorage.setItem(key, seed);
  }
  // Map [0,1] → [0.97, 1.03]
  return 0.97 + parseFloat(seed) * 0.06;
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

  // Noise only for consultant track — permanent track uses official stats
  const noiseFactor = useMemo(() => {
    if (isPermanent) return 1;
    return getSessionNoiseFactor();
  }, [isPermanent]);

  /** Noised market values for display — prevents reverse-engineering */
  const noisedResult = result
    ? { low: Math.round(result.low * noiseFactor), high: Math.round(result.high * noiseFactor) }
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
    if (!survey || !survey.currentSalary || survey.currentSalary <= 0) return 0;
    return survey.salaryType === "hourly" ? survey.currentSalary : Math.round(survey.currentSalary / 167);
  }, [survey]);

  // Threshold uses real values (not noised)
  const isUnderpaid = isPermanent
    ? (benchmarkMonthly ? userMonthly < benchmarkMonthly.p75 : false)
    : (result ? userHourly < result.high : false);

  const diffPercent = isPermanent
    ? (benchmarkMonthly ? benchmarkMonthly.gapPct : 0)
    : (result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0);

  // Above threshold = user earns more than recommended max (after margin)
  const isAboveThreshold = !isPermanent && result ? userHourly >= result.high : false;

  return { isPermanent, result, noisedResult, benchmarkMonthly, userMonthly, userHourly, isUnderpaid, diffPercent, isAboveThreshold };
}
