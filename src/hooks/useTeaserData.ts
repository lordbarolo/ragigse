import { useMemo } from "react";
import type { SurveyData } from "@/components/Survey";

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

/**
 * Teaser data — every analysis is a consultant analysis.
 * If the user is currently a permanent employee, we still show what they
 * could earn as a consultant (since that is the platform's purpose).
 *
 * The user's reported salary is normalised to an hourly rate using 167h/month.
 * Permanent employees enter monthly salary, which we convert to an implied
 * hourly rate so it can be compared to the consultant range.
 */
export function useTeaserData(
  survey: SurveyData | null,
  pricingResult: PricingResult | null,
) {
  const result = pricingResult
    ? { low: pricingResult.recommended_hourly_min, high: pricingResult.recommended_hourly_max }
    : null;

  const noiseFactor = useMemo(() => getSessionNoiseFactor(), []);

  /** Noised market values for display — prevents reverse-engineering */
  const noisedResult = result
    ? { low: Math.round(result.low * noiseFactor), high: Math.round(result.high * noiseFactor) }
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
  const isUnderpaid = result ? userHourly < result.high : false;
  const diffPercent = result ? Math.round(((result.high - userHourly) / result.high) * 100) : 0;
  const isAboveThreshold = result ? userHourly >= result.high : false;

  return {
    isPermanent: false as const,
    result,
    noisedResult,
    benchmarkMonthly: null,
    userMonthly,
    userHourly,
    isUnderpaid,
    diffPercent,
    isAboveThreshold,
  };
}
