/**
 * Helhetlig testsvit för auto-redirect i AnalysisScreen.
 *
 * Verifierar att inloggade användare alltid landar på /rapport/:reportId
 * i alla edge cases:
 *   1. reportId finns i sessionStorage → direkt redirect
 *   2. reportId saknas men surveyData + leadId finns → skapa rapport + redirect
 *   3. reportId saknas + surveyData saknas → hämta lead, skapa rapport, redirect
 *   4. Fel/okänt leadId → visar felstate, ingen redirect
 *   5. createReport timeout / fel under auto-unlock → toast, ingen redirect
 *   6. Ej inloggad → ingen redirect (SignupGate visas)
 *   7. Saknat leadId helt → redirect till "/"
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";

// ── Hoisted mocks ────────────────────────────────────────────────────────────
const {
  navigateMock,
  getSessionMock,
  getUserMock,
  fromMock,
  invokeMock,
  fetchLeadMock,
  createReportMock,
  saveEmailMock,
} = vi.hoisted(() => ({
  navigateMock: vi.fn(),
  getSessionMock: vi.fn(),
  getUserMock: vi.fn(),
  fromMock: vi.fn(),
  invokeMock: vi.fn(),
  fetchLeadMock: vi.fn(),
  createReportMock: vi.fn(),
  saveEmailMock: vi.fn(),
}));

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>("react-router-dom");
  return { ...actual, useNavigate: () => navigateMock };
});

vi.mock("@/integrations/supabase/client", () => ({
  supabase: {
    auth: { getSession: getSessionMock, getUser: getUserMock },
    from: (...a: unknown[]) => fromMock(...a),
    functions: { invoke: (...a: unknown[]) => invokeMock(...a) },
  },
}));

vi.mock("@/services/leadService", () => ({
  fetchLead: (...a: unknown[]) => fetchLeadMock(...a),
  createReport: (...a: unknown[]) => createReportMock(...a),
  saveEmail: (...a: unknown[]) => saveEmailMock(...a),
  leadToSurvey: (lead: Record<string, unknown>) => ({
    email: "",
    employmentType: lead.employment_type ?? "anstalld",
    yrke: lead.yrke ?? "Sjuksköterska",
    kommun: lead.kommun ?? "Stockholm",
    experience: lead.experience ?? 3,
    salaryType: "hourly",
    currentSalary: lead.current_salary ?? 500,
    obShare: "",
    track: "consultant",
  }),
}));

vi.mock("@/lib/trackEvent", () => ({ trackEvent: vi.fn() }));
vi.mock("@/lib/identify", () => ({ identifyLeadWithEmail: vi.fn() }));
vi.mock("@/lib/posthog", () => ({ default: { capture: vi.fn(), isFeatureEnabled: vi.fn() } }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

vi.mock("@/components/Navbar", () => ({ default: () => null }));
vi.mock("@/components/CompcareLogo", () => ({ default: () => null }));
vi.mock("@/components/teaser/MarketDiagnosisCard", () => ({ default: () => <div data-testid="diagnosis" /> }));
vi.mock("@/components/teaser/SignupGate", () => ({
  default: () => <div data-testid="signup-gate" />,
}));

import AnalysisScreen from "./AnalysisScreen";
import { toast } from "sonner";

// ── Helpers ──────────────────────────────────────────────────────────────────
const LEAD_ID = "lead-123";
const REPORT_ID = "report-abc";
const SURVEY = {
  email: "",
  employmentType: "anstalld",
  yrke: "Sjuksköterska",
  kommun: "Stockholm",
  experience: 3,
  salaryType: "hourly",
  currentSalary: 500,
  obShare: "",
};

function renderAt(path = `/resultat/${LEAD_ID}`) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route path="/resultat/:leadId" element={<AnalysisScreen />} />
          <Route path="/resultat" element={<AnalysisScreen />} />
        </Routes>
      </MemoryRouter>
    </HelmetProvider>
  );
}

function mockRatesQuery() {
  // supabase.from("locations")/.from("rates") chainable
  const chain = {
    select: () => chain,
    eq: () => chain,
    limit: () => Promise.resolve({ data: [], error: null }),
  } as Record<string, unknown>;
  fromMock.mockReturnValue(chain);
}

beforeEach(() => {
  sessionStorage.clear();
  navigateMock.mockReset();
  getSessionMock.mockReset();
  getUserMock.mockReset();
  fromMock.mockReset();
  invokeMock.mockReset();
  fetchLeadMock.mockReset();
  createReportMock.mockReset();
  saveEmailMock.mockReset();
  (toast.error as ReturnType<typeof vi.fn>).mockReset();
  mockRatesQuery();
});

afterEach(() => {
  vi.clearAllTimers();
});

// ── Tests ────────────────────────────────────────────────────────────────────

describe("AnalysisScreen · auto-redirect för inloggade", () => {
  it("1. redirectar direkt till /rapport/:reportId när reportId finns i sessionStorage", async () => {
    sessionStorage.setItem("surveyData", JSON.stringify(SURVEY));
    sessionStorage.setItem("reportId", REPORT_ID);
    getSessionMock.mockResolvedValue({ data: { session: { user: { email: "a@b.se" } } } });

    renderAt();

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith(`/rapport/${REPORT_ID}`, { replace: true });
    });
  });

  it("2. saknar reportId men har surveyData → skapar rapport och redirectar", async () => {
    sessionStorage.setItem("surveyData", JSON.stringify(SURVEY));
    getSessionMock.mockResolvedValue({ data: { session: { user: { email: "a@b.se" } } } });
    getUserMock.mockResolvedValue({ data: { user: null } });
    createReportMock.mockResolvedValue({ reportId: REPORT_ID, abVariant: "A" });
    saveEmailMock.mockResolvedValue({ reportAccessToken: "tok" });

    renderAt();

    await waitFor(() => {
      expect(createReportMock).toHaveBeenCalled();
      expect(navigateMock).toHaveBeenCalledWith(`/rapport/${REPORT_ID}`, { replace: true });
    });
  });

  it("3. saknar både reportId och surveyData → hämtar lead, skapar rapport, redirectar", async () => {
    fetchLeadMock.mockResolvedValue({
      lead: { id: LEAD_ID, employment_type: "anstalld", yrke: "Sjuksköterska", kommun: "Stockholm", experience: 3, salary_type: "hourly", current_salary: 500 },
      report_id: null,
      ab_variant: "A",
      report_status: null,
      unlocked_by_referral: false,
    });
    getSessionMock.mockResolvedValue({ data: { session: { user: { email: "a@b.se" } } } });
    getUserMock.mockResolvedValue({ data: { user: null } });
    createReportMock.mockResolvedValue({ reportId: REPORT_ID, abVariant: "A" });
    saveEmailMock.mockResolvedValue({ reportAccessToken: "tok" });

    renderAt();

    await waitFor(() => {
      expect(fetchLeadMock).toHaveBeenCalledWith(LEAD_ID);
      expect(navigateMock).toHaveBeenCalledWith(`/rapport/${REPORT_ID}`, { replace: true });
    });
  });

  it("4. fel/okänt leadId → visar felstate, ingen redirect till /rapport", async () => {
    fetchLeadMock.mockRejectedValue(new Error("Lead not found"));
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { findByText } = renderAt();

    await findByText(/Något gick fel/i);
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/rapport\//),
      expect.anything()
    );
  });

  it("5. createReport failar under auto-unlock → toast fel, ingen redirect", async () => {
    sessionStorage.setItem("surveyData", JSON.stringify(SURVEY));
    getSessionMock.mockResolvedValue({ data: { session: { user: { email: "a@b.se" } } } });
    createReportMock.mockRejectedValue(new Error("timeout"));

    renderAt();

    await waitFor(() => {
      expect(createReportMock).toHaveBeenCalled();
      expect(toast.error).toHaveBeenCalled();
    });
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/rapport\//),
      expect.anything()
    );
  });

  it("6. ej inloggad → ingen redirect, SignupGate renderas", async () => {
    sessionStorage.setItem("surveyData", JSON.stringify(SURVEY));
    sessionStorage.setItem("reportId", REPORT_ID);
    getSessionMock.mockResolvedValue({ data: { session: null } });

    const { findByTestId } = renderAt();

    await findByTestId("diagnosis");
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/rapport\//),
      expect.anything()
    );
    await findByTestId("signup-gate");
  });

  it("7. helt saknat leadId (ingen url-param, ingen session) → redirect till /", async () => {
    getSessionMock.mockResolvedValue({ data: { session: null } });

    renderAt("/resultat");

    await waitFor(() => {
      expect(navigateMock).toHaveBeenCalledWith("/");
    });
    expect(navigateMock).not.toHaveBeenCalledWith(
      expect.stringMatching(/^\/rapport\//),
      expect.anything()
    );
  });
});
