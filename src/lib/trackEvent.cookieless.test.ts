import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock posthog with memory persistence (cookieless mode)
const captureMock = vi.fn();
vi.mock("@/lib/posthog", () => ({
  default: {
    capture: captureMock,
    get_distinct_id: () => "test-distinct-id",
    register: vi.fn(),
    identify: vi.fn(),
    has_opted_in_capturing: () => true, // irrelevant in cookieless, but ensure not gating
  },
}));

// Mock supabase edge function invoke
const invokeMock = vi.fn().mockResolvedValue({ error: null });
vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    functions: { invoke: (...args: unknown[]) => invokeMock(...args) },
  },
}));

// Force production-like host so isInternalTraffic() returns false
beforeEach(() => {
  captureMock.mockClear();
  invokeMock.mockClear();
  Object.defineProperty(window, "location", {
    value: { hostname: "vardbemanning.ai", search: "" },
    writable: true,
  });
  sessionStorage.clear();
});

describe("trackEvent — cookieless mode", () => {
  it("loggar hero_cta_clicked till både PostHog och edge function", async () => {
    const { trackEvent } = await import("./trackEvent");
    trackEvent("hero_cta_clicked", { source: "hero" });

    expect(captureMock).toHaveBeenCalledTimes(1);
    expect(captureMock).toHaveBeenCalledWith(
      "hero_cta_clicked",
      expect.objectContaining({
        source: "hero",
        hostname: "vardbemanning.ai",
        is_internal_traffic: false,
      })
    );

    expect(invokeMock).toHaveBeenCalledTimes(1);
    expect(invokeMock).toHaveBeenCalledWith(
      "track-event",
      expect.objectContaining({
        body: expect.objectContaining({ event_name: "hero_cta_clicked" }),
      })
    );
  });

  it("loggar survey_started med lead_id från sessionStorage", async () => {
    sessionStorage.setItem("leadId", "11111111-1111-1111-1111-111111111111");
    const { trackEvent } = await import("./trackEvent");
    trackEvent("survey_started", { entry: "landing" });

    expect(captureMock).toHaveBeenCalledWith(
      "survey_started",
      expect.objectContaining({ entry: "landing" })
    );
    expect(invokeMock).toHaveBeenCalledWith(
      "track-event",
      expect.objectContaining({
        body: expect.objectContaining({
          event_name: "survey_started",
          lead_id: "11111111-1111-1111-1111-111111111111",
        }),
      })
    );
  });

  it("blockerar inte event även om PostHog kastar (cookieless robust)", async () => {
    captureMock.mockImplementationOnce(() => {
      throw new Error("posthog crashed");
    });
    const { trackEvent } = await import("./trackEvent");

    expect(() => trackEvent("hero_cta_clicked")).not.toThrow();
    // edge function ska fortfarande kallas
    expect(invokeMock).toHaveBeenCalledTimes(1);
  });

  it("skippar tracking på interna hosts", async () => {
    Object.defineProperty(window, "location", {
      value: { hostname: "localhost", search: "" },
      writable: true,
    });
    const { trackEvent } = await import("./trackEvent");
    trackEvent("survey_started");

    expect(captureMock).not.toHaveBeenCalled();
    expect(invokeMock).not.toHaveBeenCalled();
  });
});
