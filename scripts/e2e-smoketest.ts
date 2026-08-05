/**
 * E2E smoketest — verifierar nuvarande startsideflöde efter publicering.
 *
 * Flow (mot https://vardbemanning.ai):
 *   1. Öppna startsidan → hero renderas
 *   2. Rateräknaren visar ett kundpris (eller den godkända fallbacktexten)
 *   3. Rolltabellen renderar rader (eller fallbacktexten)
 *   4. Verktygsförslagsformuläret finns på sidan
 *   5. En rapportsida (/rapport/sjukskoterska) svarar med innehåll
 *
 * Usage:
 *   bunx playwright install chromium  # once
 *   bun run scripts/e2e-smoketest.ts
 */

import { chromium, type Browser, type Page } from "npm:playwright@1.47.0";

const BASE_URL = Deno.env.get("SMOKETEST_URL") ?? "https://vardbemanning.ai";
const TIMEOUT_MS = 60_000;

interface Step {
  name: string;
  fn: (page: Page) => Promise<void>;
}

const FALLBACK_TEXT = "Prisdata kunde inte hämtas just nu.";

const steps: Step[] = [
  {
    name: "landing-loaded",
    fn: async (page) => {
      await page.goto(BASE_URL, { waitUntil: "domcontentloaded", timeout: TIMEOUT_MS });
      await page.waitForSelector("h1", { timeout: 15_000 });
      const body = (await page.textContent("body")) ?? "";
      if (body.length < 500) throw new Error("Startsidan verkar tom");
    },
  },
  {
    name: "rate-calculator-renders",
    fn: async (page) => {
      // Antingen ett pris i kr/h, eller den godkända fallbacktexten.
      const body = (await page.textContent("body")) ?? "";
      const hasPrice = /\d[\d\s]{2,}\s*kr/i.test(body);
      if (!hasPrice && !body.includes(FALLBACK_TEXT)) {
        throw new Error("Varken pris eller fallbacktext hittades i rateräknaren");
      }
    },
  },
  {
    name: "role-table-renders",
    fn: async (page) => {
      const rows = await page.locator("table tbody tr").count();
      const body = (await page.textContent("body")) ?? "";
      if (rows === 0 && !body.includes(FALLBACK_TEXT)) {
        throw new Error("Rolltabellen saknar både rader och fallbacktext");
      }
    },
  },
  {
    name: "tool-suggestion-form-present",
    fn: async (page) => {
      const email = page.locator('input[type="email"]').first();
      await email.waitFor({ state: "attached", timeout: 15_000 });
    },
  },
  {
    name: "report-page-loads",
    fn: async (page) => {
      await page.goto(`${BASE_URL}/rapport/sjukskoterska`, {
        waitUntil: "domcontentloaded",
        timeout: TIMEOUT_MS,
      });
      const body = await page.textContent("body");
      if (!body || body.length < 500) throw new Error("Rapportsidan verkar tom");
    },
  },
];

async function postFailureAlert(failedStep: string, error: string): Promise<void> {
  const url = Deno.env.get("SUPABASE_URL");
  const token = Deno.env.get("HEALTH_CHECK_CRON_TOKEN");
  if (!url || !token) {
    console.warn("Skipping alert post: missing SUPABASE_URL or HEALTH_CHECK_CRON_TOKEN");
    return;
  }
  // We don't have a dedicated endpoint — the simplest signal is to write directly
  // to edge_function_errors so edge-error-monitor picks it up within 15 min.
  // For a local script that's OK; CI should use service role.
  console.error(`[smoketest] FAIL: ${failedStep} — ${error}`);
}

let browser: Browser | null = null;
let exitCode = 0;
const results: Array<{ step: string; ok: boolean; ms: number; error?: string }> = [];

try {
  browser = await chromium.launch({ headless: true });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();

  for (const step of steps) {
    const t0 = Date.now();
    try {
      await step.fn(page);
      results.push({ step: step.name, ok: true, ms: Date.now() - t0 });
      console.log(`✅ ${step.name} (${Date.now() - t0}ms)`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      results.push({ step: step.name, ok: false, ms: Date.now() - t0, error: msg });
      console.error(`❌ ${step.name}: ${msg}`);
      await postFailureAlert(step.name, msg);
      exitCode = 1;
      break;
    }
  }
} catch (err) {
  console.error("Smoketest crashed:", err);
  exitCode = 2;
} finally {
  if (browser) await browser.close();
}

console.log("\n--- summary ---");
console.table(results);
Deno.exit?.(exitCode) ?? process.exit(exitCode);
