import { beforeEach, describe, expect, it, vi } from "vitest";
const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }));
vi.mock("@/integrations/supabase/client", () => ({ supabase: { functions: { invoke } } }));
import { LeadNotFoundError, saveEmail } from "./leadService";
const input = { leadId: "stale-lead", reportId: "report", email: "test@example.com" };
beforeEach(() => invoke.mockReset());
describe("email save recovery classification", () => {
  it("recognizes a missing lead from the actual non-2xx response body", async () => {
    invoke.mockResolvedValue({ data: null, error: { context: new Response(JSON.stringify({ code: "lead_not_found" }), { status: 404 }) } });
    await expect(saveEmail(input)).rejects.toBeInstanceOf(LeadNotFoundError);
  });
  it("does not retry permission or network failures as missing leads", async () => {
    const error = { context: new Response(JSON.stringify({ error: "Forbidden" }), { status: 403 }) };
    invoke.mockResolvedValue({ data: null, error });
    await expect(saveEmail(input)).rejects.toBe(error);
  });
  it("returns the access token on success", async () => {
    invoke.mockResolvedValue({ data: { report_access_token: "test-token" }, error: null });
    await expect(saveEmail(input)).resolves.toEqual({ reportAccessToken: "test-token" });
  });
});