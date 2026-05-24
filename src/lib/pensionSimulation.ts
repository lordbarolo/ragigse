/**
 * Pension simulation — pure deterministic functions.
 *
 * Three scenarios:
 *   1. "none"     — 0 % pension
 *   2. "standard" — 4,5 % pension på hela bruttolönen
 *   3. "tiered"   — 4,5 % upp till 52 125 kr/mån, 30 % över (ITP1-modell)
 *
 * Alla scenarier delar samma övriga arbetsgivarkostnader:
 *   - Arbetsgivaravgift 31,42 %
 *   - AFA/TFA 0,85 %
 *   - Särskild löneskatt på pension 24,26 %
 *
 * Total cost = bruttolön + arbetsgivaravgift + AFA + pension + särskild löneskatt
 */

import {
  ARBETSGIVARAVGIFT,
  AFA_TFA,
  SARSKILD_LONESKATT,
  HOURS_PER_MONTH,
} from "./calc";

export const PENSION_THRESHOLD_MONTHLY = 52125; // kr/mån
export const PENSION_LOW_RATE = 0.045;
export const PENSION_HIGH_RATE = 0.30;

export type PensionScenario = "none" | "standard" | "tiered";

export interface SimulationResult {
  scenario: PensionScenario;
  monthlySalary: number;        // bruttolön/mån (input)
  hourlyEquivalent: number;     // bruttolön/h
  pensionContribution: number;  // pensionspremie/mån
  employerFees: number;         // arbetsgivaravgift + AFA + särskild löneskatt /mån
  totalCost: number;            // total arbetsgivar-/kundkostnad /mån
  effectiveCompensation: number; // bruttolön + pension /mån (vad konsulten "får")
}

export interface CompensationMix {
  salaryShare: number;   // andel av total cost som går till bruttolön
  pensionShare: number;  // andel som går till pension
  feesShare: number;     // andel som går till skatt/avgifter
}

// ── Pension calculators ──────────────────────────────────────────────────────

export function calculateTieredPension(monthlySalary: number): number {
  if (monthlySalary <= PENSION_THRESHOLD_MONTHLY) {
    return monthlySalary * PENSION_LOW_RATE;
  }
  return (
    PENSION_THRESHOLD_MONTHLY * PENSION_LOW_RATE +
    (monthlySalary - PENSION_THRESHOLD_MONTHLY) * PENSION_HIGH_RATE
  );
}

export function calculatePension(
  monthlySalary: number,
  scenario: PensionScenario
): number {
  if (monthlySalary <= 0) return 0;
  switch (scenario) {
    case "none":
      return 0;
    case "standard":
      return monthlySalary * PENSION_LOW_RATE;
    case "tiered":
      return calculateTieredPension(monthlySalary);
  }
}

// ── Scenario calculator ──────────────────────────────────────────────────────

export function calculatePensionScenario(
  monthlySalary: number,
  scenario: PensionScenario,
  hoursPerMonth: number = HOURS_PER_MONTH
): SimulationResult {
  const salary = Math.max(0, monthlySalary);
  const pension = calculatePension(salary, scenario);

  const arbetsgivaravgift = salary * ARBETSGIVARAVGIFT;
  const afa = salary * AFA_TFA;
  const sarskildLoneskatt = pension * SARSKILD_LONESKATT;
  const employerFees = arbetsgivaravgift + afa + sarskildLoneskatt;

  const totalCost = salary + employerFees + pension;
  const hourlyEquivalent = hoursPerMonth > 0 ? salary / hoursPerMonth : 0;

  return {
    scenario,
    monthlySalary: Math.round(salary),
    hourlyEquivalent: Math.round(hourlyEquivalent),
    pensionContribution: Math.round(pension),
    employerFees: Math.round(employerFees),
    totalCost: Math.round(totalCost),
    effectiveCompensation: Math.round(salary + pension),
  };
}

export function calculateCompensationMix(result: SimulationResult): CompensationMix {
  const total = result.totalCost || 1;
  return {
    salaryShare: result.monthlySalary / total,
    pensionShare: result.pensionContribution / total,
    feesShare: result.employerFees / total,
  };
}

/**
 * Run all three scenarios for a given salary in one shot.
 */
export function calculateAllScenarios(
  monthlySalary: number,
  hoursPerMonth: number = HOURS_PER_MONTH
): Record<PensionScenario, SimulationResult> {
  return {
    none: calculatePensionScenario(monthlySalary, "none", hoursPerMonth),
    standard: calculatePensionScenario(monthlySalary, "standard", hoursPerMonth),
    tiered: calculatePensionScenario(monthlySalary, "tiered", hoursPerMonth),
  };
}
