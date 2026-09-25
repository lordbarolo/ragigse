/**
 * Dual-write för dokument: projicerar en ny/uppdaterad consultant_documents-rad
 * till trust_credentials direkt vid skrivning, i stället för bara via backfill.
 *
 * Regler (oförändrade från dual-read-slicen):
 * - Legacy (consultant_documents) är fortsatt primär källa och styr allt beteende.
 * - Trust-projektionen är en spegel — den skriver aldrig tillbaka till legacy.
 * - Hela funktionen är gated av runtime-flaggan `trust_dualwrite_documents`
 *   (app_settings via get_feature_flag). Default OFF.
 * - Funktionen kastar aldrig: ett misslyckat trust-anrop får inte störa
 *   legacy-flödet. Fel returneras strukturerat i stället.
 * - Idempotent: trust_project_consultant_document returnerar befintlig
 *   credential om projektionen redan finns.
 *
 * Endast serverside.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

export const DUAL_WRITE_FLAG = "trust_dualwrite_documents";

export type DualWriteResult =
  | { projected: true; credentialId: string; created: boolean }
  | { projected: false; reason: "flag_off" | "not_owner" | "not_found" | "rpc_error"; detail?: string };

/**
 * Projicerar ett dokument till trust om flaggan är på och användaren äger dokumentet.
 *
 * @param userClient    Klient med användarens session (RLS gäller) — används för
 *                      ägarkontrollen så att ingen kan projicera andras dokument.
 * @param serviceClient Service-role-klient — används för flaggan och RPC:n
 *                      (trust_project_consultant_document är endast service_role).
 */
export async function projectDocumentToTrust(
  userClient: SupabaseClient,
  serviceClient: SupabaseClient,
  userId: string,
  documentId: string,
): Promise<DualWriteResult> {
  // 1. Feature flag (runtime, default OFF).
  const { data: flag, error: flagErr } = await serviceClient.rpc("get_feature_flag", {
    _key: DUAL_WRITE_FLAG,
  });
  if (flagErr || !(flag === true || flag === "true")) {
    return { projected: false, reason: "flag_off" };
  }

  // 2. Ägarkontroll via användarens egen klient (RLS). Returnerar ingen rad
  //    om dokumentet inte tillhör användaren.
  const { data: doc, error: docErr } = await userClient
    .from("consultant_documents")
    .select("id, user_id")
    .eq("id", documentId)
    .maybeSingle();
  if (docErr || !doc) {
    return { projected: false, reason: "not_found" };
  }
  if ((doc as { user_id?: string }).user_id !== userId) {
    return { projected: false, reason: "not_owner" };
  }

  // 3. Projektion via befintlig legacy-adapter (idempotent).
  const { data, error } = await serviceClient.rpc("trust_project_consultant_document", {
    _document_id: documentId,
  });
  if (error) {
    return { projected: false, reason: "rpc_error", detail: error.message };
  }

  const result = data as { credential_id?: string; created?: boolean } | null;
  return {
    projected: true,
    credentialId: String(result?.credential_id ?? ""),
    created: result?.created === true,
  };
}
