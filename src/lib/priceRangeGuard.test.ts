import { describe, it, expect } from "vitest";
import { validateRange, RANGE_TOLERANCE } from "./priceRangeGuard";

describe("priceRangeGuard.validateRange", () => {
  it("ok for foretagare with exact range (standard 15-20% margin)", () => {
    // timpris 1500 → 1500*0.80=1200, 1500*0.85=1275
    const r = validateRange({
      role: "Sjuksköterska",
      timpris_kund: 1500,
      employmentType: "foretagare",
      hourly_min: 1200,
      hourly_max: 1275,
    });
    expect(r.ok).toBe(true);
    expect(r.expected_min).toBe(1200);
    expect(r.expected_max).toBe(1275);
  });

  it("ok for specialistläkare (10-15%) foretagare", () => {
    // 1500*0.85=1275, 1500*0.90=1350
    const r = validateRange({
      role: "Specialistläkare Anestesi",
      timpris_kund: 1500,
      employmentType: "foretagare",
      hourly_min: 1275,
      hourly_max: 1350,
    });
    expect(r.ok).toBe(true);
  });

  it("ok for anstalld after employer_factor reverse-transform", () => {
    // foretagare-equiv = 1200-1275, anstalld lön = ÷1.42 ≈ 845-898
    const r = validateRange({
      role: "Sjuksköterska",
      timpris_kund: 1500,
      employmentType: "anstalld",
      hourly_min: Math.round(1200 / 1.42),
      hourly_max: Math.round(1275 / 1.42),
    });
    expect(r.ok).toBe(true);
    expect(r.min_deviation_pct).toBeLessThan(RANGE_TOLERANCE * 100);
  });

  it("flags max_out_of_tolerance when max is inflated 5%", () => {
    const r = validateRange({
      role: "Sjuksköterska",
      timpris_kund: 1500,
      employmentType: "foretagare",
      hourly_min: 1200,
      hourly_max: Math.round(1275 * 1.05),
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("max_out_of_tolerance");
  });

  it("flags min_out_of_tolerance when min is too low (e.g. 100-1900 case)", () => {
    const r = validateRange({
      role: "Sjuksköterska",
      timpris_kund: 1500,
      employmentType: "foretagare",
      hourly_min: 100,
      hourly_max: 1900,
    });
    expect(r.ok).toBe(false);
    // Båda kanter är off — lägg märke till att den första som faller är min
    expect(["min_out_of_tolerance", "max_out_of_tolerance"]).toContain(r.reason);
  });

  it("flags inverted_range", () => {
    const r = validateRange({
      role: "Sjuksköterska",
      timpris_kund: 1500,
      employmentType: "foretagare",
      hourly_min: 1300,
      hourly_max: 1200,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("inverted_range");
  });

  it("flags missing_inputs", () => {
    const r = validateRange({
      role: "Sjuksköterska",
      timpris_kund: null,
      employmentType: "foretagare",
      hourly_min: 1200,
      hourly_max: 1275,
    });
    expect(r.ok).toBe(false);
    expect(r.reason).toBe("missing_inputs");
  });

  it("respects shareOverride (anestesi 12-18%)", () => {
    // 1500*0.82=1230, 1500*0.88=1320
    const r = validateRange({
      role: "Anestesisjuksköterska",
      timpris_kund: 1500,
      employmentType: "foretagare",
      hourly_min: 1230,
      hourly_max: 1320,
      shareOverride: { min: 0.82, max: 0.88 },
    });
    expect(r.ok).toBe(true);
  });
});
