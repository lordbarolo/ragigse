import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guard test — protects cookieless pageview tracking from being built away.
 *
 * Cookieless mode = no cookies, no localStorage. This is core to CompCare's
 * privacy posture (see Privacy Policy 2026). If anyone changes posthog.ts and
 * accidentally re-enables cookies or disables manual pageviews, this test
 * fails in CI and blocks the regression.
 *
 * The matching runtime test lives in `trackEvent.cookieless.test.ts`.
 */

const SRC = readFileSync(resolve(__dirname, "./posthog.ts"), "utf8");

describe("posthog config — consent-gated guard", () => {
  it("startar med memory-persistence (uppgraderas först efter samtycke)", () => {
    expect(SRC).toMatch(/persistence:\s*["']memory["']/);
  });

  it("är opt-out by default tills användaren accepterar", () => {
    expect(SRC).toMatch(/opt_out_capturing_by_default:\s*true/);
  });

  it("uppgraderar persistens till localStorage+cookie vid samtycke", () => {
    expect(SRC).toMatch(/persistence:\s*["']localStorage\+cookie["']/);
  });

  it("exporterar applyAnalyticsConsent som consent-toggle", () => {
    expect(SRC).toMatch(/export\s+function\s+applyAnalyticsConsent\s*\(/);
    expect(SRC).toMatch(/opt_in_capturing\(\)/);
  });

  it("återtillämpar sparat samtycke vid sidladdning", () => {
    expect(SRC).toMatch(/getConsent\(\)\s*===\s*["']accepted["']/);
  });

  it("har autocapture avstängd", () => {
    expect(SRC).toMatch(/autocapture:\s*false/);
  });

  it("har automatisk pageview-capture avstängd (vi spårar manuellt via trackPageview)", () => {
    expect(SRC).toMatch(/capture_pageview:\s*false/);
    expect(SRC).toMatch(/capture_pageleave:\s*false/);
  });

  it("har session recording avstängt", () => {
    expect(SRC).toMatch(/disable_session_recording:\s*true/);
  });

  it("exporterar trackPageview för manuell pageview-spårning", () => {
    expect(SRC).toMatch(/export\s+function\s+trackPageview\s*\(/);
    expect(SRC).toMatch(/\.capture\(["']\$pageview["']\)/);
  });

  it("registrerar $ip: null så IP aldrig spåras", () => {
    expect(SRC).toMatch(/\$ip:\s*null/);
  });
});

describe("App routing — manuell pageview triggas vid varje navigering", () => {
  const APP = readFileSync(resolve(__dirname, "../App.tsx"), "utf8");

  it("anropar trackPageview från ScrollToTop-effekten", () => {
    expect(APP).toMatch(/trackPageview\(\)/);
    expect(APP).toMatch(/import\s*\{\s*[^}]*trackPageview[^}]*\}\s*from\s*["']@\/lib\/posthog["']/);
  });
});
