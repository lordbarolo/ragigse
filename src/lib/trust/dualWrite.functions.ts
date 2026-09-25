/**
 * Serverfunktion för dual-write av dokument till trust.
 * Anropas efter en lyckad legacy-skrivning (consultant_documents).
 * Legacy-flödet påverkas aldrig av resultatet — klienten ska behandla
 * detta som fire-and-forget.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { projectDocumentToTrust, type DualWriteResult } from "./dualWrite.server";

const Schema = z.object({
  documentId: z.string().uuid(),
});

export const dualWriteDocument = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Schema.parse(data ?? {}))
  .handler(async ({ data, context }): Promise<DualWriteResult> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    return projectDocumentToTrust(context.supabase, supabaseAdmin, context.userId, data.documentId);
  });
