/**
 * Automatiserat 390px responsivitetstest för H1 (samt långa H2/H3) med
 * långa svenska compound words. Failar om:
 *  1. En H1 saknar break-protection (overflow-wrap/word-break/hyphens)
 *  2. En rubrik innehåller ett ord >= 16 tecken som riskerar spilla över
 *     på 390px utan break-protection.
 *
 * Begränsning: jsdom mäter inte riktig text-rendering. Detta är ett
 * strukturellt CI-skyddsnät, inte pixel-perfekt. För pixel-mätning krävs
 * Playwright.
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";

// Sidor att testa — endast statiska/publika sidor utan auth-krav.
import Index from "@/pages/Index";
import FAQ from "@/pages/FAQ";
import ReferenserInfo from "@/pages/ReferenserInfo";
import VerifyInfo from "@/pages/VerifyInfo";

const VIEWPORT_WIDTH = 390;
const LONG_WORD_THRESHOLD = 16; // tecken — "Förhandlingsassistent" = 21

// Ord som av designval bryts manuellt eller är acceptabla (whitelist).
const IGNORED_WORDS = new Set<string>([
  "compcare",
]);

function setMobileViewport() {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: VIEWPORT_WIDTH });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });
  window.dispatchEvent(new Event("resize"));
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

function hasBreakProtection(el: Element): boolean {
  const cs = window.getComputedStyle(el);
  // jsdom returnerar oftast tomma strängar för dessa. Vi godtar:
  //  - explicit värde satt på elementet
  //  - att globala CSS-regeln i index.css finns (vi importerar inte CSS i jsdom,
  //    så vi verifierar via en separat regex på källfilen i ett eget test).
  return (
    cs.overflowWrap === "anywhere" ||
    cs.wordBreak === "break-word" ||
    cs.wordBreak === "break-all" ||
    (cs as any).webkitHyphens === "auto" ||
    cs.hyphens === "auto"
  );
}

function findLongWord(text: string): string | null {
  const words = text.split(/\s+/).filter(Boolean);
  for (const w of words) {
    const clean = w.replace(/[.,;:!?–—()"'`´]/g, "");
    if (clean.length >= LONG_WORD_THRESHOLD && !IGNORED_WORDS.has(clean.toLowerCase())) {
      return clean;
    }
  }
  return null;
}

const PAGES: Array<{ name: string; el: React.ReactElement }> = [
  { name: "/", el: <Index /> },
  { name: "/vanliga-fragor", el: <FAQ /> },
  { name: "/referenser-info", el: <ReferenserInfo /> },
  { name: "/din-data", el: <VerifyInfo /> },
];

describe("H1 overflow @ 390px (svenska compound words)", () => {
  beforeAll(() => {
    setMobileViewport();
  });

  it("index.css innehåller global H1 break-protection", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const css = fs.readFileSync(path.resolve(__dirname, "../index.css"), "utf-8");
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/hyphens:\s*auto/);
  });

  for (const page of PAGES) {
    it(`${page.name}: H1 hanterar långa svenska ord`, () => {
      const { container, unmount } = render(wrap(page.el));
      const headings = container.querySelectorAll("h1, h2, h3");
      expect(headings.length, `${page.name} har ingen H1/H2/H3`).toBeGreaterThan(0);

      const failures: string[] = [];
      headings.forEach((h) => {
        const text = (h.textContent || "").trim();
        if (!text) return;
        const longWord = findLongWord(text);
        if (longWord && !hasBreakProtection(h)) {
          failures.push(
            `${page.name} <${h.tagName.toLowerCase()}>: "${text}" innehåller långt ord "${longWord}" (${longWord.length} tecken) utan break-protection`
          );
        }
      });

      unmount();
      expect(failures, failures.join("\n")).toHaveLength(0);
    });
  }
});
