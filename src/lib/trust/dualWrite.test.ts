/**
 * Tester för dual-write av dokument till trust (bakom feature flag).
 * Klienterna mockas — inga nätverksanrop.
 */
import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DUAL_WRITE_FLAG, projectDocumentToTrust } from "./dualWrite.server";

const USER = "11111111-1111-1111-1111-111111111111";
const DOC = "22222222-2222-2222-2222-222222222222";
const CRED = "33333333-3333-3333-3333-333333333333";

function mockUserClient(doc: { id: string; user_id: string } | null) {
  const maybeSingle = vi.fn().mockResolvedValue({ data: doc, error: null });
  const eq = vi.fn().mockReturnValue({ maybeSingle });
  const select = vi.fn().mockReturnValue({ eq });
  return { from: vi.fn().mockReturnValue({ select }) } as unknown as SupabaseClient;
}

function mockServiceClient(opts: { flag: unknown; rpcData?: unknown; rpcError?: { message: string } }) {
  const rpc = vi.fn().mockImplementation((name: string) => {
    if (name === "get_feature_flag") return Promise.resolve({ data: opts.flag, error: null });
    if (name === "trust_project_consultant_document") {
      return Promise.resolve({ data: opts.rpcData ?? null, error: opts.rpcError ?? null });
    }
    return Promise.resolve({ data: null, error: null });
  });
  return { rpc } as unknown as SupabaseClient;
}

describe("projectDocumentToTrust", () => {
  it("gör inget när flaggan är av (default OFF)", async () => {
    const service = mockServiceClient({ flag: false });
    const res = await projectDocumentToTrust(mockUserClient({ id: DOC, user_id: USER }), service, USER, DOC);
    expect(res).toEqual({ projected: false, reason: "flag_off" });
    expect(service.rpc).toHaveBeenCalledWith("get_feature_flag", { _key: DUAL_WRITE_FLAG });
    expect(service.rpc).not.toHaveBeenCalledWith("trust_project_consultant_document", expect.anything());
  });

  it("gör inget när dokumentet inte hittas via användarens klient", async () => {
    const res = await projectDocumentToTrust(
      mockUserClient(null),
      mockServiceClient({ flag: true }),
      USER,
      DOC,
    );
    expect(res).toEqual({ projected: false, reason: "not_found" });
  });

  it("vägrar projicera någon annans dokument", async () => {
    const service = mockServiceClient({ flag: true });
    const res = await projectDocumentToTrust(
      mockUserClient({ id: DOC, user_id: "99999999-9999-9999-9999-999999999999" }),
      service,
      USER,
      DOC,
    );
    expect(res).toEqual({ projected: false, reason: "not_owner" });
    expect(service.rpc).not.toHaveBeenCalledWith("trust_project_consultant_document", expect.anything());
  });

  it("projicerar när flaggan är på och användaren äger dokumentet", async () => {
    const service = mockServiceClient({
      flag: true,
      rpcData: { credential_id: CRED, created: true },
    });
    const res = await projectDocumentToTrust(mockUserClient({ id: DOC, user_id: USER }), service, USER, DOC);
    expect(res).toEqual({ projected: true, credentialId: CRED, created: true });
  });

  it("är idempotent — befintlig projektion ger created=false", async () => {
    const service = mockServiceClient({
      flag: true,
      rpcData: { credential_id: CRED, created: false },
    });
    const res = await projectDocumentToTrust(mockUserClient({ id: DOC, user_id: USER }), service, USER, DOC);
    expect(res).toEqual({ projected: true, credentialId: CRED, created: false });
  });

  it("kastar aldrig vid RPC-fel — returnerar strukturerat fel i stället", async () => {
    const service = mockServiceClient({ flag: true, rpcError: { message: "boom" } });
    const res = await projectDocumentToTrust(mockUserClient({ id: DOC, user_id: USER }), service, USER, DOC);
    expect(res.projected).toBe(false);
    if (!res.projected) {
      expect(res.reason).toBe("rpc_error");
      expect(res.detail).toBe("boom");
    }
  });
});
