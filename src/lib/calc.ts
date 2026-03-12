/**
 * Shared calculation module — single source of truth for salary formulas.
 *
 * IMPORTANT: This file is mirrored in supabase/functions/_shared/calc.ts.
 * Any changes here MUST be replicated there (and vice-versa).
 */

// ── Default constants (fallbacks if DB lookup fails) ─────────────────────────

export const SHARE_MIN = 0.85;
export const SHARE_MAX = 0.90;
export const SHARE_MID = 0.875;
export const SHARE_MAX = 0.90;
export const EMPLOYER_FACTOR = 1.42;
export const HOURS_PER_MONTH = 167;

// ── Types ────────────────────────────────────────────────────────────────────

export type EmploymentType = "anstalld" | "foretagare";

export interface MarginModel {
  share_min: number;
  share_max: number;
  employer_factor: number;
  hours_per_month: number;
}

export interface SalaryRange {
  hourly_min: number;
  hourly_max: number;
  monthly_min: number;
  monthly_max: number;
}

// ── Pure functions (now accept optional MarginModel) ─────────────────────────

/**
 * Given a customer hourly rate, return the consultant's recommended salary range.
 * Uses provided model constants or falls back to hardcoded defaults.
 */
export function calculateSalaryRange(
  timpris_kund: number,
  employmentType: EmploymentType,
  model?: MarginModel
): SalaryRange {
  const shareMin = model?.share_min ?? SHARE_MIN;
  const shareMax = model?.share_max ?? SHARE_MAX;
  const empFactor = model?.employer_factor ?? EMPLOYER_FACTOR;
  const hpm = model?.hours_per_month ?? HOURS_PER_MONTH;

  const factor = employmentType === "anstalld" ? empFactor : 1;
  const hourly_min = Math.round((timpris_kund * shareMin) / factor);
  const hourly_max = Math.round((timpris_kund * shareMax) / factor);
  return {
    hourly_min,
    hourly_max,
    monthly_min: hourly_min * hpm,
    monthly_max: hourly_max * hpm,
  };
}
