import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
vi.mock("@/lib/router-compat", () => ({ useNavigate: () => vi.fn(), useSearchParams: () => [new URLSearchParams()] }));
vi.mock("@/hooks/useCalculator", () => ({ useLocations: () => ({ data: [] }) }));
vi.mock("@/hooks/usePricingEngine", () => ({ usePricingEngine: () => ({ calculate: vi.fn(), result: null }) }));
vi.mock("@/lib/trackEvent", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/surveyAbandon", () => ({ startAbandonWatcher: () => vi.fn() }));
vi.mock("@/lib/identify", () => ({ aliasLead: vi.fn() }));
import InlineTerminalSurvey from "@/components/survey/InlineTerminalSurvey";
afterEach(cleanup);
describe("existing onboarding survey receives report context", () => {
  it("opens at employment type with the nurse role preselected", () => {
    render(<InlineTerminalSurvey initialRole="Sjuksköterska" />);
    expect(screen.getByText("Hur driver du ditt uppdrag?")).toBeTruthy();
    expect(screen.queryByText("Vad jobbar du som?")).toBeNull();
  });
  it("opens at employment type with the doctor specialty preselected", () => {
    render(<InlineTerminalSurvey initialRole="Specialistläkare allmänmedicin" />);
    expect(screen.getByText("Hur driver du ditt uppdrag?")).toBeTruthy();
    expect(screen.queryByText("Vad är din specialitet?")).toBeNull();
  });
  it("asks for role when no report role was supplied", () => {
    render(<InlineTerminalSurvey />);
    expect(screen.getByText("Vad jobbar du som?")).toBeTruthy();
  });
});