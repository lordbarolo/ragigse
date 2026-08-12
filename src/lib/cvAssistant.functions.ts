import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const OptimizeSchema = z.object({
  cvText: z.string().trim().max(30000).optional(),
  answers: z.record(z.string().trim().max(2000)).optional(),
  instruction: z.string().trim().max(1000).optional(),
  draftId: z.string().uuid().optional(),
  sourceDocumentId: z.string().uuid().optional(),
  usePastedText: z.boolean().optional(),
});

export type CvSourceType = "uploaded_cv" | "selected_document" | "pasted_text" | "previous_draft";

/**
 * Bygger om konsultens CV enligt best practice och returnerar ev. följdfrågor.
 * Med draftId uppdateras samma utkast iterativt (svar på frågor, fritextinstruktion)
 * istället för att en ny rad skapas. All skrivning sker via supabaseAdmin efter
 * verifierad auth, alltid låst till context.userId.
 */
export const optimizeCv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => OptimizeSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const apiKey = process.env['LOVABLE_API_KEY'];
    if (!apiKey) throw new Error("AI-tjänsten är inte tillgänglig just nu.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const {
      loadSourceDocument,
      buildContextBlock,
      callCvGateway,
      checkCvRateLimit,
      logCvUsage,
      CvGatewayError,
    } = await import("@/lib/cvAssistant.server");

    const userId = context.userId;

    // Dagligt AI-tak (delas med övriga AI-funktioner; admins undantas i DB-funktionen).
    const rate = await checkCvRateLimit(supabaseAdmin, userId);
    if (!rate.allowed) {
      throw new Error(
        `Du har nått dagens gräns på ${rate.limit ?? 30} AI-anrop. Gränsen återställs vid midnatt.`,
      );
    }

    const pastedText = (data.cvText ?? "").trim();
    const newAnswers = data.answers ?? {};

    // Iterativt läge: hämta befintligt utkast (alltid låst till user_id).
    let draft: {
      id: string;
      version: number;
      answers: Record<string, string>;
      questions: unknown;
      cv_markdown: string | null;
      source_path: string | null;
      source_file_name: string | null;
    } | null = null;

    if (data.draftId) {
      const { data: existing, error } = await supabaseAdmin
        .from("cv_optimizations")
        .select("id, version, answers, questions, cv_markdown, source_path, source_file_name")
        .eq("id", data.draftId)
        .eq("user_id", userId)
        .maybeSingle();
      if (error) {
        console.error("[cv-assistant] kunde inte hämta utkastet", error.message);
        throw new Error("Kunde inte hämta utkastet. Försök igen.");
      }
      if (!existing) throw new Error("Utkastet hittades inte.");
      draft = {
        ...existing,
        answers: (existing.answers ?? {}) as Record<string, string>,
      };
    }

    // Källa: vid iteration är föregående utkast basen (källfilen skickas inte om).
    // Vid ny körning: uttryckligt vald text > valt dokument > CV-slotten.
    const iterating = Boolean(draft?.cv_markdown);
    const file =
      iterating || data.usePastedText
        ? null
        : await loadSourceDocument(supabaseAdmin, userId, data.sourceDocumentId);

    if (!iterating && !file && pastedText.length < 40) {
      throw new Error(
        "Ladda upp ditt CV i dokumentlistan, välj ett annat uppladdat dokument eller klistra in innehållet.",
      );
    }

    const { data: profile } = await context.supabase
      .from("consultant_profiles")
      .select("role_name, kommun_name, employment_type")
      .eq("user_id", userId)
      .maybeSingle();

    const mergedAnswers = { ...(draft?.answers ?? {}), ...newAnswers };
    const previousQuestions =
      draft && Array.isArray(draft.questions)
        ? (draft.questions as Array<{ id: string; question: string; why?: string }>)
        : [];

    const contextBlock = buildContextBlock({
      roleName: profile?.role_name ?? null,
      kommunName: profile?.kommun_name ?? null,
      employmentType: profile?.employment_type ?? null,
      answers: mergedAnswers,
      pastedText,
      instruction: data.instruction,
      previousMarkdown: draft?.cv_markdown ?? null,
      previousQuestions,
    });

    const startedAt = Date.now();
    let result;
    try {
      result = await callCvGateway({ apiKey, contextBlock, file });
    } catch (err) {
      const status = err instanceof CvGatewayError ? err.status : "error";
      await logCvUsage(supabaseAdmin, {
        userId,
        inputTokens: 0,
        outputTokens: 0,
        durationMs: Date.now() - startedAt,
        status,
        errorMessage: err instanceof Error ? err.message : String(err),
      });
      throw err instanceof CvGatewayError
        ? new Error(err.message)
        : new Error("Assistenten kunde inte bearbeta CV:t. Försök igen.");
    }

    await logCvUsage(supabaseAdmin, {
      userId,
      inputTokens: result.inputTokens,
      outputTokens: result.outputTokens,
      durationMs: Date.now() - startedAt,
      status: "success",
      metadata: { iterating, source: file ? (data.sourceDocumentId ? "selected_document" : "uploaded_cv") : iterating ? "previous_draft" : "pasted_text" },
    });

    const status = result.questions.length > 0 ? "needs_input" : "ready";
    let savedId: string | null = draft?.id ?? null;
    let version = 1;

    if (draft) {
      version = draft.version + 1;
      const { error } = await supabaseAdmin
        .from("cv_optimizations")
        .update({
          status,
          questions: result.questions as unknown as never,
          answers: mergedAnswers as unknown as never,
          cv_markdown: result.cvMarkdown,
          summary: result.summary,
          strengths: result.strengths as unknown as never,
          user_instruction: data.instruction ?? null,
          version,
          updated_at: new Date().toISOString(),
        })
        .eq("id", draft.id)
        .eq("user_id", userId);
      if (error) console.error("[cv-assistant] kunde inte uppdatera utkastet", error.message);
    } else {
      const { data: saved, error } = await supabaseAdmin
        .from("cv_optimizations")
        .insert({
          user_id: userId,
          source_path: file?.path ?? null,
          source_file_name: file?.fileName ?? null,
          source_document_id: file?.documentId ?? null,
          status,
          questions: result.questions as unknown as never,
          answers: mergedAnswers as unknown as never,
          cv_markdown: result.cvMarkdown,
          summary: result.summary,
          strengths: result.strengths as unknown as never,
          user_instruction: data.instruction ?? null,
          version: 1,
        })
        .select("id")
        .maybeSingle();
      if (error) console.error("[cv-assistant] kunde inte spara utkastet", error.message);
      savedId = saved?.id ?? null;
    }

    const sourceType: CvSourceType = iterating
      ? "previous_draft"
      : file
        ? data.sourceDocumentId
          ? "selected_document"
          : "uploaded_cv"
        : "pasted_text";

    return {
      id: savedId,
      version,
      cvMarkdown: result.cvMarkdown,
      summary: result.summary,
      strengths: result.strengths,
      questions: result.questions,
      source: {
        type: sourceType,
        fileName: file?.fileName ?? draft?.source_file_name ?? null,
      },
    };
  });
