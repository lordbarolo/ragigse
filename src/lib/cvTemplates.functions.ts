import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { FALLBACK_CV_TEMPLATES, normalizeDesign, type CvTemplate } from "@/lib/cvTemplates";

const SaveSchema = z.object({
  draftId: z.string().uuid(),
  slug: z.string().trim().min(1).max(40),
});

/** Sparar användarens designval på ett eget CV-utkast. */
export const saveCvTemplateChoice = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => SaveSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("cv_optimizations")
      .update({ cv_template_slug: data.slug })
      .eq("id", data.draftId)
      .eq("user_id", context.userId);
    if (error) throw new Error("Kunde inte spara designvalet.");
    return { ok: true };
  });

/** Läser de aktiva CV-designerna. Publik data (endast layoutinställningar). */
export const listCvTemplates = createServerFn({ method: "GET" }).handler(
  async (): Promise<CvTemplate[]> => {
    const { createClient } = await import("@supabase/supabase-js");
    const url = process.env['SUPABASE_URL'] ?? process.env['VITE_SUPABASE_URL'];
    const key =
      process.env['SUPABASE_PUBLISHABLE_KEY'] ?? process.env['VITE_SUPABASE_PUBLISHABLE_KEY'];
    if (!url || !key) return FALLBACK_CV_TEMPLATES;

    const client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client
      .from("cv_templates")
      .select("slug, name, description, design")
      .eq("is_active", true)
      .order("sort_order");

    if (error || !data || data.length === 0) return FALLBACK_CV_TEMPLATES;

    return data.map((row) => ({
      slug: row.slug,
      name: row.name,
      description: row.description ?? "",
      design: normalizeDesign(row.design, row.slug),
    }));
  },
);
