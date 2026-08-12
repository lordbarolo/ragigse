import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Historikläsning för CV-assistenten. Endast SELECT — läses via användarens
// RLS-skyddade klient (cv_optimizations_owner_select) så ägarskapet
// upprätthålls av databasen, inte av applikationskod.

export interface CvDraftListItem {
  id: string;
  version: number;
  status: string;
  summary: string | null;
  source_file_name: string | null;
  created_at: string;
  updated_at: string;
}

/** Listar användarens tidigare CV-utkast, senast uppdaterade först. */
export const listCvDrafts = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("cv_optimizations")
      .select("id, version, status, summary, source_file_name, created_at, updated_at")
      .eq("user_id", context.userId)
      .not("cv_markdown", "is", null)
      .order("updated_at", { ascending: false })
      .limit(30);

    if (error) {
      console.error("[cv-assistant] kunde inte lista utkast", error.message);
      throw new Error("Kunde inte hämta historiken. Försök igen.");
    }
    return { drafts: (data ?? []) as CvDraftListItem[] };
  });

const GetDraftSchema = z.object({ id: z.string().uuid() });

/** Hämtar ett enskilt utkast i sin helhet (markdown, frågor, svar). */
export const getCvDraft = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => GetDraftSchema.parse(data))
  .handler(async ({ data, context }) => {
    const { data: draft, error } = await context.supabase
      .from("cv_optimizations")
      .select(
        "id, version, status, summary, strengths, questions, answers, cv_markdown, source_file_name, created_at, updated_at",
      )
      .eq("id", data.id)
      .eq("user_id", context.userId)
      .maybeSingle();

    if (error) {
      console.error("[cv-assistant] kunde inte hämta utkastet", error.message);
      throw new Error("Kunde inte hämta utkastet. Försök igen.");
    }
    if (!draft) throw new Error("Utkastet hittades inte.");
    return { draft };
  });
