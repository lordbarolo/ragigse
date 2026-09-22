/**
 * Tester för dual-read-jämförelsen: match, mismatch, saknad legacy,
 * saknad trust, idempotens vid återkörning.
 */
import { describe, it, expect, vi } from "vitest";
import {
  compareDualRead,
  detailHash,
  expectedDocumentProjection,
  expectedReferenceProjection,
  recordDiscrepancies,
  type DualReadSnapshot,
  type TrustSnapshotRow,
} from "./dualRead.server";

const SUBJECT = "11111111-1111-1111-1111-111111111111";
const DOC_ID = "22222222-2222-2222-2222-222222222222";

const trustRow = (over: Partial<TrustSnapshotRow> = {}): TrustSnapshotRow => ({
  credential_id: "33333333-3333-3333-3333-333333333333",
  legacy_table: "consultant_documents",
  legacy_ref_id: DOC_ID,
  credential_type: "consultant_document",
  status: "pending",
  assurance_level: "self_asserted",
  ...over,
});

const legacyRow = () => ({
  legacy_table: "consultant_documents",
  legacy_ref_id: DOC_ID,
  expected_type: "consultant_document",
  expected_status: "pending",
  expected_assurance: "self_asserted",
});

const snap = (over: Partial<DualReadSnapshot> = {}): DualReadSnapshot => ({
  subject_user_id: SUBJECT,
  trust: [trustRow()],
  legacy: [legacyRow()],
  ...over,
});

describe("compareDualRead", () => {
  it("ger inga avvikelser när legacy och trust stämmer", () => {
    expect(compareDualRead(snap())).toEqual([]);
  });

  it("flaggar status_mismatch", () => {
    const result = compareDualRead(snap({ trust: [trustRow({ status: "active" })] }));
    expect(result.map((r) => r.discrepancy_kind)).toEqual(["status_mismatch"]);
    expect(result[0]?.expected_value).toBe("pending");
    expect(result[0]?.actual_value).toBe("active");
  });

  it("flaggar assurance_mismatch och type_mismatch separat", () => {
    const result = compareDualRead(
      snap({
        trust: [trustRow({ assurance_level: "document_verified", credential_type: "ivo_extract" })],
      }),
    );
    expect(result.map((r) => r.discrepancy_kind).sort()).toEqual([
      "assurance_mismatch",
      "type_mismatch",
    ]);
  });

  it("flaggar missing_trust när legacy-raden inte är projicerad", () => {
    const result = compareDualRead(snap({ trust: [] }));
    expect(result).toHaveLength(1);
    expect(result[0]?.discrepancy_kind).toBe("missing_trust");
    expect(result[0]?.credential_id).toBeNull();
  });

  it("flaggar missing_legacy när legacy-raden är borta", () => {
    const result = compareDualRead(snap({ legacy: [] }));
    expect(result).toHaveLength(1);
    expect(result[0]?.discrepancy_kind).toBe("missing_legacy");
    expect(result[0]?.legacy_ref_id).toBe(DOC_ID);
  });

  it("ignorerar trust-credentials utan legacy-pekare", () => {
    const result = compareDualRead(
      snap({ trust: [trustRow(), trustRow({ legacy_table: null, legacy_ref_id: null })] }),
    );
    expect(result).toEqual([]);
  });

  it("är deterministisk vid återkörning", () => {
    const input = snap({ trust: [trustRow({ status: "active" })] });
    expect(compareDualRead(input)).toEqual(compareDualRead(input));
  });
});

describe("förväntad projektion", () => {
  it("mappar verifierade dokument till active/document_verified", () => {
    expect(expectedDocumentProjection("ivo", "verified")).toEqual({
      type: "ivo_extract",
      status: "active",
      assurance: "document_verified",
    });
  });

  it("mappar okänd doc_type till consultant_document/pending", () => {
    expect(expectedDocumentProjection("nagot_annat", null)).toEqual({
      type: "consultant_document",
      status: "pending",
      assurance: "self_asserted",
    });
  });

  it("referenser projiceras alltid som pending self_asserted", () => {
    expect(expectedReferenceProjection()).toEqual({
      type: "employment_attestation",
      status: "pending",
      assurance: "self_asserted",
    });
  });

  it("detail_hash är stabil för samma innehåll", () => {
    expect(detailHash("status_mismatch", "pending", "active")).toBe(
      detailHash("status_mismatch", "pending", "active"),
    );
    expect(detailHash("status_mismatch", "pending", "active")).not.toBe(
      detailHash("status_mismatch", "pending", "expired"),
    );
  });
});

describe("recordDiscrepancies", () => {
  const discrepancies = compareDualRead(snap({ trust: [trustRow({ status: "active" })] }));

  const client = (error: { code?: string; message: string } | null) =>
    ({ from: () => ({ insert: vi.fn().mockResolvedValue({ error }) }) }) as never;

  it("loggar nya avvikelser", async () => {
    await expect(recordDiscrepancies(client(null), discrepancies)).resolves.toEqual({
      logged: 1,
      already_logged: 0,
    });
  });

  it("är idempotent: dubblett räknas som redan loggad", async () => {
    await expect(
      recordDiscrepancies(client({ code: "23505", message: "duplicate key" }), discrepancies),
    ).resolves.toEqual({ logged: 0, already_logged: 1 });
  });

  it("kastar vid obehörig skrivning (ingen tyst fallback)", async () => {
    await expect(
      recordDiscrepancies(client({ code: "42501", message: "permission denied" }), discrepancies),
    ).rejects.toThrow(/kunde inte logga avvikelse/);
  });
});
