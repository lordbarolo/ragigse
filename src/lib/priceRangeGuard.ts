/**
 * Price Range Guard — boundary invariant validator.
 *
 * Verifies that a displayed compensation range mathematically follows the
 * pricing model:
 *   timpris_kund × (1 − margin)  →  consultant range  →  optional employer transform
 *
 * Per affärsmodell-beslut: spannet ÄR en deterministisk funktion av
 * SKR-ramavtalet och BF-marginalspannet. Om denna invariant bryts visar vi
 * fallback istället för felaktiga siffror.
 *
 * Boundary check (primärt) + midpoint check (sekundärt).
 */

import {
  EMPLOYER_FACTOR,
  getMarginShares,
  type EmploymentType,
} from "@/lib/calc";

export const RANGE_TOLERANCE = 0.02; // 2 %

export type GuardReason =
  | "missing_inputs"
  | "invalid_numbers"
  | "inverted_range"
  | "min_out_of_tolerance"
  | "max_out_of_tolerance"
  | "midpoint_out_of_tolerance";

export interface RangeGuardInput {
  role: string | null | undefined;
  timpris_kund: number | null | undefined;
  employmentType: EmploymentType;
  /** Visat min (konsultens timlön). */
  hourly_min: number | null | undefined;
  /** Visat max (konsultens timlön). */
  hourly_max: number | null | undefined;
  /** Override för anestesi etc. */
  shareOverride?: { min: number; max: number };
  /** Override för employer factor. */
  employerFactor?: number;
}

export interface RangeGuardResult {
  ok: boolean;
  expected_min: number;
  expected_max: number;
  shown_min: number;
  shown_max: number;
  /** Visat min översatt till kundpris-ekvivalent (för felsökning). */
  shown_min_customer: number;
  shown_max_customer: number;
  expected_mid: number;
  shown_mid_customer: number;
  min_deviation_pct: number;
  max_deviation_pct: number;
  mid_deviation_pct: number;
  reason?: GuardReason;
}

const finite = (n: unknown): n is number =>
  typeof n === "number" && Number.isFinite(n);

/**
 * Boundary invariant: verifies that |shown_min−expected_min|/expected_min ≤ tol
 * AND |shown_max−expected_max|/expected_max ≤ tol. Midpoint sekundärt.
 *
 * För `anstalld` multipliceras shown med employer_factor innan jämförelse,
 * eftersom expected_* är i kundpris-kr/timme.
 */
export function validateRange(input: RangeGuardInput): RangeGuardResult {
  const empty = (reason: GuardReason): RangeGuardResult => ({
    ok: false,
    expected_min: 0,
    expected_max: 0,
    shown_min: 0,
    shown_max: 0,
    shown_min_customer: 0,
    shown_max_customer: 0,
    expected_mid: 0,
    shown_mid_customer: 0,
    min_deviation_pct: 0,
    max_deviation_pct: 0,
    mid_deviation_pct: 0,
    reason,
  });

  const { role, timpris_kund, employmentType, hourly_min, hourly_max } = input;

  if (!finite(timpris_kund) || !finite(hourly_min) || !finite(hourly_max)) {
    return empty("missing_inputs");
  }
  if (timpris_kund <= 0 || hourly_min <= 0 || hourly_max <= 0) {
    return empty("invalid_numbers");
  }
  if (hourly_min > hourly_max) {
    return empty("inverted_range");
  }

  const shares = input.shareOverride ?? (() => {
    const s = getMarginShares(role);
    return { min: s.share_min, max: s.share_max };
  })();

  // Konsult får MAX när BF har MIN marginal, och tvärtom.
  const expectedMaxCustomer = timpris_kund * shares.max; // motsvarar lägsta BF-marginalen
  const expectedMinCustomer = timpris_kund * shares.min; // motsvarar högsta BF-marginalen
  const expectedMid = (expectedMinCustomer + expectedMaxCustomer) / 2;

  const factor = employmentType === "anstalld"
    ? (input.employerFactor ?? EMPLOYER_FACTOR)
    : 1;
  const shownMinCustomer = hourly_min * factor;
  const shownMaxCustomer = hourly_max * factor;
  const shownMidCustomer = (shownMinCustomer + shownMaxCustomer) / 2;

  const minDev = Math.abs(shownMinCustomer - expectedMinCustomer) / expectedMinCustomer;
  const maxDev = Math.abs(shownMaxCustomer - expectedMaxCustomer) / expectedMaxCustomer;
  const midDev = Math.abs(shownMidCustomer - expectedMid) / expectedMid;

  const base: Omit<RangeGuardResult, "ok" | "reason"> = {
    expected_min: Math.round(expectedMinCustomer),
    expected_max: Math.round(expectedMaxCustomer),
    shown_min: hourly_min,
    shown_max: hourly_max,
    shown_min_customer: Math.round(shownMinCustomer),
    shown_max_customer: Math.round(shownMaxCustomer),
    expected_mid: Math.round(expectedMid),
    shown_mid_customer: Math.round(shownMidCustomer),
    min_deviation_pct: +(minDev * 100).toFixed(3),
    max_deviation_pct: +(maxDev * 100).toFixed(3),
    mid_deviation_pct: +(midDev * 100).toFixed(3),
  };

  if (minDev > RANGE_TOLERANCE) return { ...base, ok: false, reason: "min_out_of_tolerance" };
  if (maxDev > RANGE_TOLERANCE) return { ...base, ok: false, reason: "max_out_of_tolerance" };
  if (midDev > RANGE_TOLERANCE) return { ...base, ok: false, reason: "midpoint_out_of_tolerance" };

  return { ...base, ok: true };
}
