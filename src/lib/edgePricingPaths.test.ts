/**
 * Vaktpost: varje assistent som visar belopp går via rate-guard.
 *
 * Alla edge-funktioner som anropar AI-gatewayen OCH hanterar priser/ersättning
 * måste importera `_shared/rate-guard.ts` — där bor zonuppslag, spannberäkning
 * och utgångsspärren. Testet faller om en ny (eller återupplivad) assistent
 * bygger egen prislogik.
 */

import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

/** Funktioner som inte visar belopp för användare (ren dataleverans/analys). */
const EXEMPT = new Set([
  "compensation-intelligence",
  "pricing-engine",
  "public-lon-lookup",
  "agent-api-rates",
]);

const PRICE_HINT = /kundpris|price_median|ramavtalspris|kr\/h|kr\/tim|ersättning/i;
const AI_HINT = /ai\.gateway\.lovable\.dev|getAiGatewayUrl/;

function edgeIndexFiles(): string[] {
  const out = execSync("git ls-files 'supabase/functions/*/index.ts'", { encoding: "utf8" });
  return out.split("\n").filter(Boolean);
}

describe("edge-assistenter — belopp går via rate-guard", () => {
  it("hittar edge-funktioner att granska", () => {
    expect(edgeIndexFiles().length).toBeGreaterThan(5);
  });

  it("varje AI-funktion som hanterar belopp importerar rate-guard", () => {
    const findings: string[] = [];
    for (const file of edgeIndexFiles()) {
      const name = file.split("/")[2];
      if (EXEMPT.has(name)) continue;
      const src = readFileSync(file, "utf8");
      if (!AI_HINT.test(src) || !PRICE_HINT.test(src)) continue;
      if (!/_shared\/rate-guard\.ts/.test(src)) {
        findings.push(`${file} saknar import av _shared/rate-guard.ts`);
      }
    }
    expect(findings).toEqual([]);
  });
});
