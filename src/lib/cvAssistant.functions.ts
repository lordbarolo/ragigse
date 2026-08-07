import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OptimizeSchema = z.object({
  cvText: z.string().trim().max(30000).optional(),
  answers: z.record(z.string().trim().max(2000)).optional(),
});

/** Bygger om konsultens CV enligt best practice och returnerar ev. följdfrågor. */
export const optimizeCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => OptimizeSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("AI-tjänsten är inte tillgänglig just nu.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { loadUploadedCv, buildContextBlock, callCvGateway } = await import("@/lib/cvAssistant.server");

    const userId = context.userId;
    const pastedText = (data.cvText ?? "").trim();
    const file = await loadUploadedCv(supabaseAdmin as never, userId);

    if (!file && pastedText.length < 40) {
      throw new Error(
        "Ladda upp ditt CV i dokumentlistan eller klistra in innehållet, så bygger assistenten om det.",
      );
    }

    const { data: profile } = await context.supabase
      .from("consultant_profiles")
      .select("role_name, kommun_name, employment_type")
      .eq("user_id", userId)
      .maybeSingle();

    const answers = data.answers ?? {};
    const contextBlock = buildContextBlock({
      roleName: profile?.role_name ?? null,
      kommunName: profile?.kommun_name ?? null,
      employmentType: profile?.employment_type ?? null,
      answers,
      pastedText,
    });

    const result = await callCvGateway({ apiKey, contextBlock, file });

    const { data: saved, error } = await supabaseAdmin
      .from("cv_optimizations")
      .insert({
        user_id: userId,
        source_path: file?.path ?? null,
        source_file_name: file?.fileName ?? null,
        status: result.questions.length > 0 ? "needs_input" : "ready",
        questions: result.questions as unknown as never,
        answers,
        cv_markdown: result.cvMarkdown,
      })
      .select("id")
      .maybeSingle();

    if (error) console.error("[cv-assistant] kunde inte spara utkastet", error.message);

    return {
      id: saved?.id ?? null,
      cvMarkdown: result.cvMarkdown,
      summary: result.summary,
      strengths: result.strengths,
      questions: result.questions,
      usedUploadedFile: Boolean(file),
    };
  });
