import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const TOOL_SUGGESTION_OPTIONS = [
  { value: "ersattning", label: "Optimering av ersättning / förhandling" },
  { value: "uppdrag", label: "Nya uppdrag kopplat till mina önskemål" },
  { value: "fakturering", label: "Automatisering av företagande / fakturering" },
  { value: "cv_referenser", label: "AI-stöd för att skapa CV, hantera referenser m.m." },
  { value: "eget", label: "Eget förslag" },
] as const;

const schema = z.object({
  choice: z.enum(["ersattning", "uppdrag", "fakturering", "cv_referenser", "eget"]),
  ownText: z.string().trim().max(500).optional(),
  email: z.string().trim().email().max(255),
});

export const submitToolSuggestion = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => {
    const parsed = schema.parse(data);
    if (parsed.choice === "eget" && !parsed.ownText) {
      throw new Error("Beskriv ditt egna förslag.");
    }
    return parsed;
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().replace(/-/g, "");

    const { error } = await supabaseAdmin.from("tool_suggestions").insert({
      email,
      choice: data.choice,
      own_text: data.choice === "eget" ? (data.ownText ?? null) : null,
      confirm_token: token,
    });
    if (error) {
      console.error("[tool-suggestions] insert failed", error.message);
      throw new Error("Kunde inte spara förslaget just nu.");
    }

    const baseUrl = process.env["APP_BASE_URL"] || "https://vardbemanning.ai";
    const confirmUrl = `${baseUrl}/api/public/bekrafta-forslag?token=${token}`;
    const label =
      TOOL_SUGGESTION_OPTIONS.find((o) => o.value === data.choice)?.label ?? undefined;

    const supabaseUrl = process.env["SUPABASE_URL"];
    const serviceKey = process.env["SUPABASE_SERVICE_ROLE_KEY"];
    if (supabaseUrl && serviceKey) {
      const res = await fetch(`${supabaseUrl}/functions/v1/send-transactional-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceKey}`,
          apikey: serviceKey,
        },
        body: JSON.stringify({
          templateName: "tool-suggestion-confirm",
          recipientEmail: email,
          templateData: { confirmUrl, choiceLabel: label },
        }),
      });
      if (!res.ok) {
        console.error("[tool-suggestions] email send failed", res.status);
      }
    }

    return { ok: true as const };
  });
