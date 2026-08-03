// @vitest-environment jsdom
/**
 * End-to-end-test för rollväljaren på startsidan (Rateraknare).
 *
 * Flödet som testas hela vägen:
 *   1. Riktiga priser hämtas från `rates` i Lovable Cloud (REST, publishable key).
 *   2. Komponenten renderas som i produktion (SearchableSelect + zonväljare).
 *   3. Vi väljer en dropdown-ETIKETT (t.ex. "IVA-sjuksköterska") precis som en
 *      användare gör — inte den kanoniska rollen.
 *   4. Vi läser av vad UI:t faktiskt visar (företagare kr/h, löntagare kr/h och
 *      kundpriset i källtexten).
 *   5. Siffrorna verifieras mot TVÅ oberoende beräkningsmodeller:
 *        Modell A: computeRate5c (produktionens vägen)
 *        Modell B: calculateSalaryRange i @/lib/calc (annan kodväg, mid-spann)
 *      En minimal avvikelse (±TOLERANCE kr) tillåts för avrundning.
 *
 * Kräver VITE_SUPABASE_URL + VITE_SUPABASE_PUBLISHABLE_KEY, annars skippas testet.
 */

import { describe, it, expect, beforeAll, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import "@testing-library/jest-dom/vitest";
import userEvent from "@testing-library/user-event";
import { Suspense } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

import { basePrices, computeRate5c, type RateRow } from "./rate5c";
import { roleLabel5c } from "./roleLabels5c";
import { calculateSalaryRange, getMarginShares, EMPLOYER_FACTOR } from "@/lib/calc";

/** Maximal tillåten avvikelse mellan modellerna och UI:t (avrundningsfönster). */
const TOLERANCE = 1;

const env = (k: string): string | undefined =>
  (import.meta as unknown as { env?: Record<string, string> }).env?.[k] ??
  (typeof process !== "undefined" ? process.env?.[k] : undefined);

const SUPABASE_URL = env("VITE_SUPABASE_URL");
const ANON_KEY = env("VITE_SUPABASE_PUBLISHABLE_KEY") ?? env("VITE_SUPABASE_ANON_KEY");
const hasEnv = Boolean(SUPABASE_URL && ANON_KEY);

/** Riktiga rader, delade mellan mocken och förväntningarna. */
let rows: RateRow[] = [];

// Transporten mockas, men datan är riktig (hämtas via REST nedan).
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: async () => ({ data: rowsRef.get(), error: null }),
    }),
  },
}));

const rowsRef = {
  get: () => rows as unknown,
};

async function fetchRates(): Promise<RateRow[]> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rates?select=*`, {
    headers: { apikey: ANON_KEY!, Authorization: `Bearer ${ANON_KEY}` },
  });
  if (!res.ok) throw new Error(`rates fetch failed: ${res.status}`);
  return (await res.json()) as RateRow[];
}

/** Modell B: oberoende kodväg via calculateSalaryRange (mid av spannet). */
function modelB(timpris_kund: number, role: string) {
  const shares = getMarginShares(role);
  const model = {
    share_min: shares.share_min,
    share_max: shares.share_max,
    employer_factor: EMPLOYER_FACTOR,
  };
  const foretagare = calculateSalaryRange(timpris_kund, "foretagare", model);
  const anstalld = calculateSalaryRange(timpris_kund, "anstalld", model);
  return {
    foretagareKrH: (foretagare.hourly_min + foretagare.hourly_max) / 2,
    lontagareKrH: (anstalld.hourly_min + anstalld.hourly_max) / 2,
  };
}

function renderRateraknare(Rateraknare: React.ComponentType) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <Suspense fallback={<div>laddar</div>}>
        <Rateraknare />
      </Suspense>
    </QueryClientProvider>
  );
}

/** Plockar ut heltal ur en text som "1 234" (sv-SE med hårt/tunt mellanslag). */
function parseKr(text: string): number {
  return Number(text.replace(/[^\d]/g, ""));
}

describe.skipIf(!hasEnv)("E2E: dropdown-etikett → pris och kalkyl", () => {
  let Rateraknare: React.ComponentType;

  beforeAll(async () => {
    rows = basePrices(await fetchRates());
    Rateraknare = (await import("./Rateraknare")).default;
  });

  const cases: Array<{ label: string; canonical: string; zone: string; zoneLabel: string }> = [
    {
      label: "IVA-sjuksköterska",
      canonical: "Specialistsjuksköterska intensivvård",
      zone: "Zon 2",
      zoneLabel: "Zon 2 · Mellannorrland",
    },
    {
      label: "Kirurg",
      canonical: "Specialistläkare kirurgi",
      zone: "Zon 1",
      zoneLabel: "Zon 1 · Storstad",
    },
  ];

  for (const c of cases) {
    it(`${c.label} (${c.zone}) visar pris som stämmer med båda modellerna`, async () => {
      const user = userEvent.setup();
      renderRateraknare(Rateraknare);

      await waitFor(() => expect(screen.getByLabelText("Zon")).toBeTruthy());

      // Etiketten måste matcha den kanoniska rollen — annars fel pris.
      expect(roleLabel5c(c.canonical)).toBe(c.label);

      // 1. Välj roll via dropdown-etiketten, som en användare.
      const trigger = screen.getAllByRole("combobox")[0];
      await user.click(trigger);
      await user.type(trigger, c.label);
      const option = await screen.findByText(c.label);
      await user.click(option);

      // 2. Välj zon.
      await user.selectOptions(screen.getByLabelText("Zon"), c.zone);

      // 3. Läs av vad UI:t visar.
      const foretagareCard = screen.getByText("Som företagare").closest("div")!;
      const lontagareCard = screen.getByText("Som löntagare").closest("div")!;
      const uiForetagare = parseKr(foretagareCard.textContent!.replace("Som företagare", ""));
      const uiLontagare = parseKr(lontagareCard.textContent!.replace("Som löntagare", ""));

      const sourceText = screen.getByText(/Kundpris/).textContent!;
      const uiKundpris = parseKr(sourceText.split("kr/h")[0]);

      // 4. Modell A — produktionens beräkning på riktig DB-rad.
      const a = computeRate5c(rows, c.canonical, c.zone);
      expect(a, `pris saknas för ${c.canonical} ${c.zone}`).not.toBeNull();
      expect(uiKundpris).toBe(a!.timpris_kund);
      expect(Math.abs(uiForetagare - a!.foretagareKrH)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(uiLontagare - a!.lontagareKrH)).toBeLessThanOrEqual(TOLERANCE);

      // 5. Modell B — oberoende kodväg, minimal avvikelse tillåten.
      const b = modelB(a!.timpris_kund, c.canonical);
      expect(Math.abs(uiForetagare - b.foretagareKrH)).toBeLessThanOrEqual(TOLERANCE);
      expect(Math.abs(uiLontagare - b.lontagareKrH)).toBeLessThanOrEqual(TOLERANCE);

      // 6. Sanity: löntagare = företagare / arbetsgivarfaktor.
      expect(Math.abs(uiLontagare - uiForetagare / EMPLOYER_FACTOR)).toBeLessThanOrEqual(
        TOLERANCE
      );

      // 7. Zonetiketten som användaren ser ska vara den valda.
      expect(screen.getByLabelText("Zon")).toHaveValue(c.zone);
      expect(screen.getByText(c.zoneLabel)).toBeTruthy();
    });
  }
});
