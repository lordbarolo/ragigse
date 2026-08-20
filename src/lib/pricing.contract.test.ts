/**
 * Kontrakttest: frontend (`src/lib/pricing.ts`) och backend
 * (`supabase/functions/_shared/rate-guard.ts`) MÅSTE ge identiska belopp.
 *
 * Syftet är att fånga drift innan den syns i UI: om någon ändrar en
 * marginalandel, arbetsgivarfaktorn eller avrundningen på ena sidan faller
 * testet i stället för att två ytor börjar visa olika ersättning.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  possibleRange as fePossibleRange,
  shareRange as feShareRange,
  withFloor as feWithFloor,
  EMPLOYER_FACTOR as FE_FACTOR,
} from "./pricing";
import {
  possibleRange as bePossibleRange,
  shareRange as beShareRange,
  withFloor as beWithFloor,
  leaksForbiddenData,
  missingDataAnswer,
  EMPLOYER_FACTOR as BE_FACTOR,
} from "../../supabase/functions/_shared/rate-guard.ts";

const ROLES = [
  "Specialistläkare Allmänmedicin",
  "Specialistläkare Anestesi",
  "Läkare",
  "Sjuksköterska",
  "Specialistsjuksköterska anestesi",
  "Barnmorska",
  "Undersköterska",
  "Biomedicinsk analytiker",
];

const PRICES = [560, 616, 715, 770, 824, 880, 1180, 1400, 1650];
const EMPLOYMENT = ["foretagare", "anstalld"] as const;

describe("pricing-kontrakt — frontend och backend räknar likadant", () => {
  it("arbetsgivarfaktorn är samma konstant på båda sidor", () => {
    expect(FE_FACTOR).toBe(BE_FACTOR);
    expect(FE_FACTOR).toBe(1.38);
  });

  it("marginalandelar är identiska per roll", () => {
    for (const role of ROLES) {
      expect(feShareRange(role), role).toEqual(beShareRange(role));
    }
  });

  it("möjlig ersättning är identisk för hela matrisen roll × pris × anställningsform", () => {
    for (const role of ROLES) {
      for (const price of PRICES) {
        for (const employment of EMPLOYMENT) {
          const fe = fePossibleRange(price, role, employment);
          const be = bePossibleRange(price, role, employment);
          expect(fe, `${role} ${price} ${employment}`).toEqual(be);
        }
      }
    }
  });

  it("golvregeln (aldrig under nuvarande ersättning) är identisk", () => {
    const cases: Array<[number, number, number | null]> = [
      [500, 600, 650],
      [500, 600, 400],
      [500, 600, null],
      [500, 600, 500],
    ];
    for (const [min, max, current] of cases) {
      expect(feWithFloor({ min, max }, current)).toEqual(beWithFloor({ min, max }, current));
    }
  });

  it("modellkonstanterna i de två calc-modulerna har samma värden", () => {
    const constants = [
      "SPECIALIST_DOCTOR_SHARE_MIN",
      "SPECIALIST_DOCTOR_SHARE_MAX",
      "STANDARD_SHARE_MIN",
      "STANDARD_SHARE_MAX",
      "EMPLOYER_FACTOR",
      "HOURS_PER_MONTH",
      "ARBETSGIVARAVGIFT",
      "ITP1_LOW",
      "ITP1_HIGH",
      "ITP1_THRESHOLD_MONTHLY",
      "SARSKILD_LONESKATT",
      "AFA_TFA",
    ];
    const fe = readFileSync("src/lib/calc.ts", "utf8");
    const be = readFileSync("supabase/functions/_shared/calc.ts", "utf8");
    const read = (src: string, name: string) => {
      const m = src.match(new RegExp(`export const ${name}\\s*=\\s*([0-9.]+)`));
      return m ? m[1] : null;
    };
    for (const name of constants) {
      const feValue = read(fe, name);
      expect(feValue, `${name} saknas i src/lib/calc.ts`).not.toBeNull();
      expect(read(be, name), name).toBe(feValue);
    }
  });
});

describe("utgångsspärr — modellen och råa priser får inte läcka", () => {
  it("fångar rått kundpris i svaret", () => {
    expect(leaksForbiddenData("Regionens pris är 715 kr/h.", { forbiddenAmounts: [715] })).toBe(
      true,
    );
    expect(leaksForbiddenData("Möjlig ersättning är 572–608 kr/h.", { forbiddenAmounts: [715] }))
      .toBe(false);
  });

  it("fångan beräkningsmodellen (marginal, faktor, timmar)", () => {
    expect(leaksForbiddenData("Bolaget behåller 15–20 % i marginal.")).toBe(true);
    expect(leaksForbiddenData("Vi delar med 1,38 för arbetsgivarkostnad.")).toBe(true);
    expect(leaksForbiddenData("Vi räknar 167 timmar per månad.")).toBe(true);
  });

  it("tillåter inga belopp när underlag saknas", () => {
    expect(leaksForbiddenData("Du kan ligga på 600 kr/h.", { hasRateContext: false })).toBe(true);
    expect(leaksForbiddenData(missingDataAnswer(["vilken roll"]), { hasRateContext: false })).toBe(
      false,
    );
  });
});
