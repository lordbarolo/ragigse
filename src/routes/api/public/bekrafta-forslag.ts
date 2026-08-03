import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bekrafta-forslag")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";
        const redirectBase = `${url.origin}/`;

        if (!/^[a-f0-9]{64}$/i.test(token)) {
          return new Response(null, {
            status: 302,
            headers: { Location: `${redirectBase}?forslag=ogiltig` },
          });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin
          .from("tool_suggestions")
          .update({ confirmed_at: new Date().toISOString() })
          .eq("confirm_token", token)
          .is("confirmed_at", null)
          .select("id")
          .maybeSingle();

        if (error) {
          console.error("[tool-suggestions] confirm failed", error.message);
        }

        const status = error ? "fel" : data ? "bekraftat" : "redan";
        return new Response(null, {
          status: 302,
          headers: { Location: `${redirectBase}?forslag=${status}` },
        });
      },
    },
  },
});
