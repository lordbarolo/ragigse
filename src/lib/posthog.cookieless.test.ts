import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

/**
 * Guard test — protects cookieless tracking from being built away.
 *
 * PostHog initieras i <head> via snippet i index.html (laddas på ALLA sidor).
 * Konfigurationen är cookie-fri: memory-persistence, ingen autocapture,
 * manuella pageviews, ingen session recording, $ip null och URL-redaktion.
 * Detta är kärnan i vårdbemanning.ai:s integritetsposition (se Privacy Policy 2026).
 *
 * Consent-toggle och pageview-hjälpare bor kvar i src/lib/posthog.ts.
 * Den matchande runtime-testen ligger i `trackEvent.cookieless.test.ts`.
 */

const HTML = readFileSync(resolve(__dirname, "../../index.html"), "utf8");
const SRC = readFileSync(resolve(__dirname, "./posthog.ts"), "utf8");

describe("posthog head-snippet — cookie-fri konfiguration", () => {
  it("initierar PostHog i <head> så tracking laddas på varje sida", () => {
    expect(HTML).toMatch(/window\.posthog\.init\(/);
    expect(HTML).toMatch(/phc_/);
  });

  it("går via vår egen ph-proxy", () => {
    expect(HTML).toMatch(/api_host:\s*["'][^"']*\/functions\/v1\/ph-proxy["']/);
  });

  it("startar med memory-persistence (uppgraderas först efter samtycke)", () => {
    expect(HTML).toMatch(/persistence:\s*["']memory["']/);
  });

  it("capturar direkt i memory-läge (cookie-fritt kräver inget samtycke)", () => {
    expect(HTML).toMatch(/opt_out_capturing_by_default:\s*false/);
  });

  it("har autocapture avstängd", () => {
    expect(HTML).toMatch(/autocapture:\s*false/);
  });

  it("har automatisk pageview-capture avstängd (vi spårar manuellt via trackPageview)", () => {
    expect(HTML).toMatch(/capture_pageview:\s*false/);
    expect(HTML).toMatch(/capture_pageleave:\s*false/);
  });

  it("har session recording avstängt", () => {
    expect(HTML).toMatch(/disable_session_recording:\s*true/);
  });

  it("registrerar $ip: null så IP aldrig spåras", () => {
    expect(HTML).toMatch(/\$ip:\s*null/);
  });

  it("redigerar bort tokens/UUID:er från URL:er innan de skickas", () => {
    expect(HTML).toMatch(/before_send/);
    expect(HTML).toMatch(/\[uuid\]/);
    expect(HTML).toMatch(/\[token\]/);
  });

  it("initierar inte PostHog en andra gång i appen", () => {
    expect(SRC).not.toMatch(/posthog\.init\(/);
  });
});

describe("posthog.ts — consent-toggle och hjälpare", () => {
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

  it("exporterar trackPageview för manuell pageview-spårning", () => {
    expect(SRC).toMatch(/export\s+function\s+trackPageview\s*\(/);
    expect(SRC).toMatch(/\.capture\(["']\$pageview["']\)/);
  });
});

describe("App routing — manuell pageview triggas vid varje navigering", () => {
  const APP = readFileSync(resolve(__dirname, "../App.tsx"), "utf8");

  it("anropar trackPageview från ScrollToTop-effekten", () => {
    expect(APP).toMatch(/trackPageview\(\)/);
    expect(APP).toMatch(/import\s*\{\s*[^}]*trackPageview[^}]*\}\s*from\s*["']@\/lib\/posthog["']/);
  });
});
