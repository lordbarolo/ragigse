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

// ── Employer cost step function (ITP 1, 1979+) ───────────────────────────────
// Antaganden: semesterersättning ingår i timlönen (bruttolön).
// Komponenter:
//   - Arbetsgivaravgifter: 31.42 % av bruttolön
//   - ITP 1 pension: 4.5 % under brytpunkten (7.5 IBB), 30 % över
//   - Särskild löneskatt på pension: 24.26 % av pensionspremien
//   - AFA/TFA-försäkringar: 0.85 % av bruttolön
//
// Brytpunkten 7.5 IBB 2025 ≈ 52 750 kr/mån. Lönen jämförs månadsvis (timlön × 167).
export const ARBETSGIVARAVGIFT = 0.3142;
export const ITP1_LOW = 0.045;
export const ITP1_HIGH = 0.30;
export const ITP1_THRESHOLD_MONTHLY = 52750; // 7.5 IBB 2025
export const SARSKILD_LONESKATT = 0.2426;
export const AFA_TFA = 0.0085;

export interface EmployerCostBreakdown {
  hourly_salary: number;          // bruttolön/h (semester inkl.)
  monthly_salary: number;         // bruttolön/mån = hourly × 167
  arbetsgivaravgift_per_h: number;
  itp1_per_month: number;         // total ITP-premie per månad
  itp1_per_h: number;
  itp1_low_part: number;          // del under brytpunkt
  itp1_high_part: number;         // del över brytpunkt
  sarskild_loneskatt_per_h: number;
  afa_tfa_per_h: number;
  total_employer_cost_per_h: number;
  total_factor: number;           // total / hourly_salary
  components: Array<{ label: string; per_hour: number; pct_of_salary: number }>;
}

export function computeEmployerCost(
  hourly_salary: number,
  hours_per_month: number = HOURS_PER_MONTH
): EmployerCostBreakdown {
  const monthly = hourly_salary * hours_per_month;

  const arbetsgivaravgift = hourly_salary * ARBETSGIVARAVGIFT;

  // ITP 1 step function
  const lowPart = Math.min(monthly, ITP1_THRESHOLD_MONTHLY);
  const highPart = Math.max(0, monthly - ITP1_THRESHOLD_MONTHLY);
  const itp1Monthly = lowPart * ITP1_LOW + highPart * ITP1_HIGH;
  const itp1PerH = itp1Monthly / hours_per_month;

  const sarskild = itp1PerH * SARSKILD_LONESKATT;
  const afa = hourly_salary * AFA_TFA;

  const total = hourly_salary + arbetsgivaravgift + itp1PerH + sarskild + afa;
  const factor = total / hourly_salary;

  const components = [
    { label: "Bruttolön (semester inkl.)", per_hour: hourly_salary, pct_of_salary: 1 },
    { label: "Arbetsgivaravgifter (31,42 %)", per_hour: arbetsgivaravgift, pct_of_salary: ARBETSGIVARAVGIFT },
    { label: "ITP 1 pension", per_hour: itp1PerH, pct_of_salary: itp1PerH / hourly_salary },
    { label: "Särskild löneskatt på pension (24,26 %)", per_hour: sarskild, pct_of_salary: sarskild / hourly_salary },
    { label: "AFA/TFA-försäkringar (0,85 %)", per_hour: afa, pct_of_salary: AFA_TFA },
  ];

  return {
    hourly_salary,
    monthly_salary: monthly,
    arbetsgivaravgift_per_h: arbetsgivaravgift,
    itp1_per_month: itp1Monthly,
    itp1_per_h: itp1PerH,
    itp1_low_part: lowPart,
    itp1_high_part: highPart,
    sarskild_loneskatt_per_h: sarskild,
    afa_tfa_per_h: afa,
    total_employer_cost_per_h: total,
    total_factor: factor,
    components,
  };
}

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
