import { describe, it, expect } from "vitest";
import {
  calculatePension,
  calculateTieredPension,
  calculatePensionScenario,
  calculateAllScenarios,
  calculateCompensationMix,
  PENSION_THRESHOLD_MONTHLY,
  PENSION_LOW_RATE,
  PENSION_HIGH_RATE,
} from "./pensionSimulation";

describe("calculateTieredPension", () => {
  it("uses 4.5% below threshold", () => {
    expect(calculateTieredPension(40000)).toBeCloseTo(40000 * 0.045, 4);
  });
  it("exactly at threshold uses 4.5% only", () => {
    expect(calculateTieredPension(PENSION_THRESHOLD_MONTHLY)).toBeCloseTo(
      PENSION_THRESHOLD_MONTHLY * PENSION_LOW_RATE,
      4
    );
  });
  it("above threshold mixes 4.5% + 30%", () => {
    const salary = 80000;
    const expected =
      PENSION_THRESHOLD_MONTHLY * PENSION_LOW_RATE +
      (salary - PENSION_THRESHOLD_MONTHLY) * PENSION_HIGH_RATE;
    expect(calculateTieredPension(salary)).toBeCloseTo(expected, 4);
  });
});

describe("calculatePension", () => {
  it("none returns 0", () => {
    expect(calculatePension(100000, "none")).toBe(0);
  });
  it("standard returns 4.5% on full salary", () => {
    expect(calculatePension(60000, "standard")).toBeCloseTo(60000 * 0.045, 4);
  });
  it("tiered above threshold > standard at same salary", () => {
    const salary = 100000;
    expect(calculatePension(salary, "tiered")).toBeGreaterThan(
      calculatePension(salary, "standard")
    );
  });
  it("never negative for zero/negative salary", () => {
    expect(calculatePension(0, "tiered")).toBe(0);
    expect(calculatePension(-5000, "standard")).toBe(0);
  });
});

describe("calculatePensionScenario", () => {
  it("none scenario has zero pension and zero särskild löneskatt", () => {
    const r = calculatePensionScenario(50000, "none");
    expect(r.pensionContribution).toBe(0);
    // employerFees = 50000 * (0.3142 + 0.0085)
    expect(r.employerFees).toBe(Math.round(50000 * (0.3142 + 0.0085)));
  });

  it("hourly equivalent uses 167h/month default", () => {
    const r = calculatePensionScenario(50100, "none");
    expect(r.hourlyEquivalent).toBe(300);
  });

  it("rounds all monetary fields to integers", () => {
    const r = calculatePensionScenario(54321, "tiered");
    expect(Number.isInteger(r.monthlySalary)).toBe(true);
    expect(Number.isInteger(r.pensionContribution)).toBe(true);
    expect(Number.isInteger(r.totalCost)).toBe(true);
    expect(Number.isInteger(r.employerFees)).toBe(true);
  });

  it("totalCost ≈ salary + fees + pension (within rounding)", () => {
    const r = calculatePensionScenario(75000, "tiered");
    const sum = r.monthlySalary + r.employerFees + r.pensionContribution;
    expect(Math.abs(r.totalCost - sum)).toBeLessThanOrEqual(1);
  });

  it("handles extreme salary 250000 deterministically", () => {
    const r = calculatePensionScenario(250000, "tiered");
    const expectedPension =
      PENSION_THRESHOLD_MONTHLY * 0.045 + (250000 - PENSION_THRESHOLD_MONTHLY) * 0.3;
    expect(r.pensionContribution).toBe(Math.round(expectedPension));
  });

  it("handles 0 salary without NaN", () => {
    const r = calculatePensionScenario(0, "standard");
    expect(r.totalCost).toBe(0);
    expect(r.hourlyEquivalent).toBe(0);
  });
});

describe("calculateAllScenarios", () => {
  it("returns all three scenarios with totalCost ascending none < standard < tiered (over threshold)", () => {
    const all = calculateAllScenarios(100000);
    expect(all.none.totalCost).toBeLessThan(all.standard.totalCost);
    expect(all.standard.totalCost).toBeLessThan(all.tiered.totalCost);
  });

  it("at salary exactly threshold, standard and tiered pensions are equal", () => {
    const all = calculateAllScenarios(PENSION_THRESHOLD_MONTHLY);
    expect(all.standard.pensionContribution).toBe(all.tiered.pensionContribution);
  });
});

describe("calculateCompensationMix", () => {
  it("shares sum to ~1", () => {
    const r = calculatePensionScenario(80000, "tiered");
    const mix = calculateCompensationMix(r);
    const sum = mix.salaryShare + mix.pensionShare + mix.feesShare;
    expect(sum).toBeCloseTo(1, 5);
  });
});
