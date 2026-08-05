/**
 * Steg 3: startsidan får aldrig fällas av ett prisdatafel.
 * ratesQueryOptions ska svälja fel och returnera en tom lista.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    from: () => ({
      select: () => Promise.resolve({ data: null, error: { message: "boom" } }),
    }),
  },
}));

describe("ratesQueryOptions · fail-soft", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => {});
  });

  it("returnerar tom lista i stället för att kasta när prisdata misslyckas", async () => {
    const { ratesQueryOptions } = await import("./useRates5c");
    await expect(ratesQueryOptions.queryFn()).resolves.toEqual([]);
  });
});
