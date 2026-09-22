import { createFileRoute } from "@tanstack/react-router";
import {
  OUTCOME_MESSAGES,
  readSharedCredentials,
  resolveGrant,
  serviceClient,
} from "@/lib/trust/share.server";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", "Cache-Control": "no-store" },
  });
}

export const Route = createFileRoute("/api/public/trust/share/$token")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { headers: corsHeaders }),
      GET: async ({ request, params }) => {
        try {
          const token = String((params as { token?: string }).token ?? "");
          const supabase = serviceClient();

          // share_read konsumerar inte länken (max_uses respekteras ändå).
          const { grant, outcome } = await resolveGrant(supabase, request, token, false);
          if (!grant) {
            return json({ error: OUTCOME_MESSAGES[outcome] ?? OUTCOME_MESSAGES["not_found"] }, 404);
          }
          if (grant.grant_kind !== "share_read") {
            return json({ error: OUTCOME_MESSAGES["scope_denied"] }, 404);
          }

          const credentials = await readSharedCredentials(supabase, grant);
          return json({ credentials, count: credentials.length });
        } catch (err) {
          console.error(
            "trust-share: oväntat fel",
            err instanceof Error ? err.message : "okänt",
          );
          return json({ error: "Ett oväntat fel inträffade" }, 500);
        }
      },
    },
  },
});
