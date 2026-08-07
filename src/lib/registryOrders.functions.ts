import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OrderSchema = z.object({
  docType: z.enum(["hosp", "ivo"]),
  fullName: z.string().trim().min(2).max(120),
  personnummer: z.string().trim().min(10).max(20),
});

export const REGISTRY_EXTRACT_PRICE_ORE = 3900;

/** Beställ ett HOSP- eller IVO-utdrag. Personnummer lagras aldrig läsbart via API:et. */
export const createRegistryExtractOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => OrderSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { normalizePersonnummer } = await import("@/lib/personnummer");
    const normalized = normalizePersonnummer(data.personnummer);
    if (!normalized) throw new Error("Personnummret ser inte ut att stämma. Ange det som ÅÅÅÅMMDD-XXXX.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: existing } = await supabaseAdmin
      .from("registry_extract_orders")
      .select("id")
      .eq("user_id", context.userId)
      .eq("doc_type", data.docType)
      .eq("status", "pending")
      .maybeSingle();

    if (existing?.id) {
      return { id: existing.id as string, alreadyPending: true, priceOre: REGISTRY_EXTRACT_PRICE_ORE };
    }

    const { data: inserted, error } = await supabaseAdmin
      .from("registry_extract_orders")
      .insert({
        user_id: context.userId,
        doc_type: data.docType,
        full_name: data.fullName,
        personnummer: normalized,
        price_ore: REGISTRY_EXTRACT_PRICE_ORE,
      })
      .select("id")
      .maybeSingle();

    if (error || !inserted) {
      console.error("[registry-order] insert misslyckades", error?.message);
      throw new Error("Kunde inte registrera beställningen just nu. Försök igen.");
    }

    return { id: inserted.id as string, alreadyPending: false, priceOre: REGISTRY_EXTRACT_PRICE_ORE };
  });

/** Konsultens egna beställningar — utan personnummer. */
export const listMyRegistryExtractOrders = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase.rpc("get_my_registry_orders");
    if (error) {
      console.error("[registry-order] kunde inte hämta beställningar", error.message);
      return [];
    }
    return (data ?? []).map((row) => ({
      id: row.id as string,
      docType: row.doc_type as "hosp" | "ivo",
      status: row.status as string,
      priceOre: row.price_ore as number,
      createdAt: row.created_at as string,
    }));
  });
