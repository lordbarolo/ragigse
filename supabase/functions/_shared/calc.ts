/**
 * Shared calculation module — single source of truth for salary formulas.
 *
 * IMPORTANT: This file is mirrored in src/lib/calc.ts.
 * Any changes here MUST be replicated there (and vice-versa).
 */

// ── Constants ────────────────────────────────────────────────────────────────

/** Consultant's share of the customer hourly rate (min / max). */
export const SHARE_MIN = 0.85;
export const SHARE_MAX = 0.90;

/** Mid-point share used for single-value estimates (e.g. MarketInsight bars). */
export const SHARE_MID = 0.875;

/** Employer cost factor (social fees, pension, vacation). Divide gross by this. */
export const EMPLOYER_FACTOR = 1.42;

/** Standard billable hours per month. */
export const HOURS_PER_MONTH = 167;

// ── Types ────────────────────────────────────────────────────────────────────

export type EmploymentType = "anstalld" | "foretagare";

export interface SalaryRange {
  hourly_min: number;
  hourly_max: number;
  monthly_min: number;
  monthly_max: number;
}

// ── Pure functions ───────────────────────────────────────────────────────────

/**
 * Given a customer hourly rate, return the consultant's recommended salary range.
 */
export function calculateSalaryRange(
  timpris_kund: number,
  employmentType: EmploymentType
): SalaryRange {
  const factor = employmentType === "anstalld" ? EMPLOYER_FACTOR : 1;
  const hourly_min = Math.round((timpris_kund * SHARE_MIN) / factor);
  const hourly_max = Math.round((timpris_kund * SHARE_MAX) / factor);
  return {
    hourly_min,
    hourly_max,
    monthly_min: hourly_min * HOURS_PER_MONTH,
    monthly_max: hourly_max * HOURS_PER_MONTH,
  };
}

/**
 * Single-value salary estimate (mid-point of the range).
 * Useful for bar-chart comparisons across zones.
 */
export function estimateHourlySalary(
  timpris_kund: number,
  employmentType: EmploymentType
): number {
  const factor = employmentType === "anstalld" ? EMPLOYER_FACTOR : 1;
  return Math.round((timpris_kund * SHARE_MID) / factor);
}

/**
 * Compute the delta between recommended monthly salary and current salary.
 */
export function monthlyDelta(
  recommended: SalaryRange,
  currentMonthlySalary: number
): { min: number; max: number } {
  return {
    min: recommended.monthly_min - currentMonthlySalary,
    max: recommended.monthly_max - currentMonthlySalary,
  };
}
