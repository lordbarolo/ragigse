/**
 * Automatiserat 390px responsivitetstest för H1/H2/H3 med långa svenska
 * compound words (t.ex. "Förhandlingsassistent", "Ersättningsanalys").
 *
 * Strategi:
 *  1. Verifierar att index.css innehåller global break-protection
 *     (overflow-wrap: anywhere + hyphens: auto) — skyddsnät för ALLA rubriker.
 *  2. För varje publik sida: hittar långa ord (>=16 tecken) i rubriker och
 *     failar om någon rubrik har inline-style som *överstyr* skyddsnätet
 *     (white-space: nowrap, overflow-wrap: normal, word-break: keep-all).
 *
 * Begränsning: jsdom mäter inte riktig text-rendering. För pixel-exakt
 * overflow-check krävs Playwright (separat).
 */
import { describe, it, expect, beforeAll } from "vitest";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { HelmetProvider } from "react-helmet-async";
import React from "react";

import Home from "@/pages/Home";
import FAQ from "@/pages/FAQ";


const VIEWPORT_WIDTH = 390;
const LONG_WORD_THRESHOLD = 16;

const IGNORED_WORDS = new Set<string>(["compcare"]);

function setMobileViewport() {
  Object.defineProperty(window, "innerWidth", { writable: true, configurable: true, value: VIEWPORT_WIDTH });
  Object.defineProperty(window, "innerHeight", { writable: true, configurable: true, value: 844 });
  window.dispatchEvent(new Event("resize"));
}

function wrap(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return (
    <HelmetProvider>
      <QueryClientProvider client={qc}>
        <MemoryRouter>{ui}</MemoryRouter>
      </QueryClientProvider>
    </HelmetProvider>
  );
}

/** Returnerar problembeskrivning om inline-style överstyr break-protection. */
function inlineOverridesBreak(el: HTMLElement): string | null {
  const style = el.getAttribute("style") || "";
  const norm = style.toLowerCase().replace(/\s/g, "");
  if (norm.includes("white-space:nowrap")) return "white-space:nowrap";
  if (norm.includes("overflow-wrap:normal")) return "overflow-wrap:normal";
  if (norm.includes("word-break:keep-all")) return "word-break:keep-all";
  // Tailwind-klasser som överstyr
  const cls = el.className || "";
  if (typeof cls === "string") {
    if (/\bwhitespace-nowrap\b/.test(cls)) return "class:whitespace-nowrap";
    if (/\bbreak-keep\b/.test(cls)) return "class:break-keep";
  }
  return null;
}

function findLongWords(text: string): string[] {
  return text
    .split(/\s+/)
    .map((w) => w.replace(/[.,;:!?–—()"'`´]/g, ""))
    .filter((w) => w.length >= LONG_WORD_THRESHOLD && !IGNORED_WORDS.has(w.toLowerCase()));
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

  it("index.css innehåller global rubrik break-protection", async () => {
    const fs = await import("fs");
    const path = await import("path");
    const css = fs.readFileSync(path.resolve(__dirname, "../index.css"), "utf-8");
    expect(css).toMatch(/overflow-wrap:\s*anywhere/);
    expect(css).toMatch(/hyphens:\s*auto/);
  });

  for (const page of PAGES) {
    it(`${page.name}: inga rubriker överstyr break-protection vid långa svenska ord`, () => {
      const { container, unmount } = render(wrap(page.el));
      const headings = Array.from(container.querySelectorAll<HTMLElement>("h1, h2, h3"));

      const failures: string[] = [];
      for (const h of headings) {
        const text = (h.textContent || "").trim();
        if (!text) continue;
        const longWords = findLongWords(text);
        if (longWords.length === 0) continue;
        const override = inlineOverridesBreak(h);
        if (override) {
          failures.push(
            `${page.name} <${h.tagName.toLowerCase()}>: "${text}" — långa ord [${longWords.join(", ")}] men ${override} förhindrar radbrytning`
          );
        }
      }

      unmount();
      expect(failures, "\n" + failures.join("\n")).toHaveLength(0);
    });
  }
});
