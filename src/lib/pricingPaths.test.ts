/**
 * Vaktpost: inga egna prisformler utanför prismodulen.
 *
 * Allt som räknar belopp ska gå via `src/lib/pricing.ts` (frontend) eller
 * `_shared/rate-guard.ts` (backend). Testet faller om en sida, komponent eller
 * hook återinför en marginalandel eller arbetsgivarfaktorn i egen aritmetik —
 * det var precis den spridningen som gav olika belopp på olika ytor.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/** Filer som får äga modellen. */
const ALLOWED = new Set([
  "src/lib/calc.ts",
  "src/lib/pricing.ts",
  "src/lib/pensionSimulation.ts",
]);

const FORMULA_PATTERNS: Array<{ re: RegExp; what: string }> = [
  { re: /\b1[.,]38\b/, what: "arbetsgivarfaktorn 1.38" },
  { re: /\b1[.,]42\b/, what: "gammal arbetsgivarfaktor 1.42" },
  { re: /[*/]\s*0\.(8|9)[0-9]?\b/, what: "multiplikation med marginalandel" },
  { re: /\b0\.(8|9)[0-9]?\s*\*/, what: "multiplikation med marginalandel" },
  { re: /\/\s*1\.[34][0-9]?\b/, what: "division med arbetsgivarfaktor" },
];

/** Rader som är styling/layout, inte beräkning. */
const NOISE = /className|aspect-|opacity|hsl\(|rgba?\(|font|scale\(|translate|duration|z-index/i;

function sourceFiles(): string[] {
  const out = execSync(
    "git ls-files 'src/**/*.ts' 'src/**/*.tsx' | grep -v '^src/_archive/' | grep -v '\\.test\\.tsx\\?$'",
    { encoding: "utf8" },
  );
  return out.split("\n").filter(Boolean);
}

describe("prisvägar — modellen bor på ett ställe", () => {
  it("hittar källfiler att granska", () => {
    expect(sourceFiles().length).toBeGreaterThan(50);
  });

  it("ingen fil utanför prismodulen räknar med marginal eller arbetsgivarfaktor", () => {
    const findings: string[] = [];
    for (const file of sourceFiles()) {
      if (ALLOWED.has(file)) continue;
      const lines = readFileSync(file, "utf8").split("\n");
      lines.forEach((line, i) => {
        if (NOISE.test(line)) return;
        for (const { re, what } of FORMULA_PATTERNS) {
          if (re.test(line)) findings.push(`${file}:${i + 1} ${what} — använd src/lib/pricing.ts`);
        }
      });
    }
    expect(findings).toEqual([]);
  });
});
