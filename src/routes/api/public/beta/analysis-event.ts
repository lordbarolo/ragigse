import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { isRateLimited } from "@/lib/beta/rateLimit";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i;

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/public/beta/analysis-event")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: corsHeaders }),
      POST: async ({ request }) => {
        const supabase = createClient(
          process.env["SUPABASE_URL"]!,
          process.env["SUPABASE_SERVICE_ROLE_KEY"]!,
          { auth: { persistSession: false } },
        );

        try {
          const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
          if (!body || typeof body !== "object") return json({ error: "Ogiltig förfrågan" }, 400);

          const analysisId = String(body["analysis_id"] ?? "");
          const event = String(body["event"] ?? "");
          const emailRaw = body["email"];
          const email = typeof emailRaw === "string" ? emailRaw.trim() : undefined;

          if (!UUID_RE.test(analysisId)) return json({ error: "Ogiltigt analys-id" }, 400);
          if (!["copied", "save_email", "lead_opt_in"].includes(event)) {
            return json({ error: "Okänd händelse" }, 400);
          }
          if (event !== "copied" && (!email || !EMAIL_RE.test(email))) {
            return json({ error: "Ange en giltig e-postadress" }, 400);
          }

          if (await isRateLimited(supabase, request, "event", 30)) {
            return json({ error: "Du har nått dygnsgränsen. Försök igen om ett dygn." }, 429);
          }

          const patch: Record<string, unknown> = {};
          if (event === "copied") patch["copied_counter_offer"] = true;
          if (event === "save_email") patch["user_email"] = email;
          if (event === "lead_opt_in") {
            patch["user_email"] = email;
            patch["lead_opt_in_agencies"] = true;
          }

          const { data, error } = await supabase
            .from("beta_contract_analyses")
            .update(patch)
            .eq("id", analysisId)
            .select("id")
            .maybeSingle();

          if (error) {
            console.error("beta-analysis-event: uppdatering misslyckades", error.message);
            return json({ error: "Kunde inte spara händelsen" }, 500);
          }
          if (!data) return json({ error: "Analysen hittades inte" }, 404);

          return json({ ok: true });
        } catch (err) {
          console.error(
            "beta-analysis-event: oväntat fel",
            err instanceof Error ? err.message : "okänt",
          );
          return json({ error: "Ett oväntat fel inträffade" }, 500);
        }
      },
    },
  },
});
