/**
 * Shared calculation module — single source of truth for salary formulas.
 *
 * IMPORTANT: This file is mirrored in src/lib/calc.ts.
 * Any changes here MUST be replicated there (and vice-versa).
 *
 * Margin model (uniform across employment types):
 *   - Specialistläkare (alla underspecialiteter): bemanning behåller 10–15%
 *     → konsult får 85–90% av kundpriset
 *   - Övriga roller (sjuksköterska, leg.läkare, ST-läkare, barnmorska,
 *     undersköterska, biomedicinsk analytiker, etc.): bemanning behåller 15–20%
 *     → konsult får 80–85% av kundpriset
 *
 * För anställda (`anstalld`) divideras share-beloppet med employer_factor (≈1.42)
 * för att konvertera bemanningens kostnad till konsultens timlön.
 */

// ── Default constants (fallbacks if DB lookup fails) ─────────────────────────

/** Specialistläkare share range (bemanning behåller 10–15%) */
export const SPECIALIST_DOCTOR_SHARE_MIN = 0.85;
export const SPECIALIST_DOCTOR_SHARE_MAX = 0.90;

/** Standard share range for all other roles (bemanning behåller 15–20%) */
export const STANDARD_SHARE_MIN = 0.80;
export const STANDARD_SHARE_MAX = 0.85;

/** Legacy aliases — kept for backwards compatibility, point to standard */
export const SHARE_MIN = STANDARD_SHARE_MIN;
export const SHARE_MAX = STANDARD_SHARE_MAX;
export const SHARE_MID = (STANDARD_SHARE_MIN + STANDARD_SHARE_MAX) / 2;

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

// ── Role detection ───────────────────────────────────────────────────────────

/**
 * Returns true if the given role string represents a "Specialistläkare"
 * (any of the 64 sub-specialties), in which case the lower agency margin
 * (10–15%) applies. All other roles use the standard 15–20% margin.
 */
export function isSpecialistDoctor(role: string | null | undefined): boolean {
  if (!role) return false;
  const normalized = role.trim().toLowerCase();
  // "Specialistläkare" or "Specialistläkare <subspeciality>"
  if (normalized.startsWith("specialistläkare") || normalized.startsWith("specialistlakare")) {
    return true;
  }
  return false;
}

/**
 * Returns the canonical share range for a role, ignoring employment type
 * (anstalld/foretagare both use the same share — only the employer_factor
 * differs in calculateSalaryRange).
 */
export function getMarginShares(role: string | null | undefined): {
  share_min: number;
  share_max: number;
  margin_text: string;
} {
  if (isSpecialistDoctor(role)) {
    return {
      share_min: SPECIALIST_DOCTOR_SHARE_MIN,
      share_max: SPECIALIST_DOCTOR_SHARE_MAX,
      margin_text: "10–15 %",
    };
  }
  return {
    share_min: STANDARD_SHARE_MIN,
    share_max: STANDARD_SHARE_MAX,
    margin_text: "15–20 %",
  };
}

// ── Pure functions (now accept optional MarginModel) ─────────────────────────

/**
 * Given a customer hourly rate, return the consultant's recommended salary range.
 * Uses provided model constants or falls back to standard defaults (15–20% margin).
 *
 * NOTE: Callers should resolve the role-specific share via getMarginShares(role)
 * and pass it as `model` to ensure specialistläkare get the correct 10–15% margin.
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

/**
 * Single-value salary estimate (mid-point of the range).
 */
export function estimateHourlySalary(
  timpris_kund: number,
  employmentType: EmploymentType,
  model?: MarginModel
): number {
  const shareMin = model?.share_min ?? SHARE_MIN;
  const shareMax = model?.share_max ?? SHARE_MAX;
  const empFactor = model?.employer_factor ?? EMPLOYER_FACTOR;
  const shareMid = (shareMin + shareMax) / 2;

  const factor = employmentType === "anstalld" ? empFactor : 1;
  return Math.round((timpris_kund * shareMid) / factor);
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
