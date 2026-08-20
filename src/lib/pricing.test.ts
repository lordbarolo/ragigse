import { describe, it, expect } from "vitest";
import { possibleRange, midRate, shareRange, withFloor, EMPLOYER_FACTOR } from "./pricing";

describe("pricing — en modell för möjlig ersättning", () => {
  it("specialistläkare får 85–90 % av kundpriset som företagare", () => {
    expect(shareRange("Specialistläkare Allmänmedicin")).toEqual([0.85, 0.9]);
    expect(possibleRange(1400, "Specialistläkare Allmänmedicin", "foretagare")).toEqual({
      min: 1190,
      max: 1260,
    });
  });

  it("övriga roller får 80–85 % av kundpriset", () => {
    expect(shareRange("Sjuksköterska")).toEqual([0.8, 0.85]);
    expect(possibleRange(715, "Sjuksköterska", "foretagare")).toEqual({ min: 572, max: 608 });
  });

  it("anställd räknas om med arbetsgivarfaktorn", () => {
    expect(EMPLOYER_FACTOR).toBe(1.38);
    expect(possibleRange(715, "Sjuksköterska", "anstalld")).toEqual({
      min: Math.round((715 * 0.8) / 1.38),
      max: Math.round((715 * 0.85) / 1.38),
    });
  });

  it("midRate ligger mitt i spannet", () => {
    const { min, max } = possibleRange(880, "Specialistsjuksköterska anestesi", "foretagare");
    const mid = midRate(880, "Specialistsjuksköterska anestesi", "foretagare");
    expect(mid).toBeGreaterThanOrEqual(min);
    expect(mid).toBeLessThanOrEqual(max);
  });

  it("aldrig under nuvarande ersättning", () => {
    expect(withFloor({ min: 500, max: 600 }, 650)).toEqual({ min: 650, max: 650 });
    expect(withFloor({ min: 500, max: 600 }, 400)).toEqual({ min: 500, max: 600 });
  });
});
