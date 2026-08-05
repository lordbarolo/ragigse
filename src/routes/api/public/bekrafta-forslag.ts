import { createFileRoute } from "@tanstack/react-router";

const TOKEN_RE = /^[a-f0-9]{64}$/i;

function page(body: string): Response {
  return new Response(
    `<!doctype html><html lang="sv"><head><meta charset="utf-8">` +
      `<meta name="viewport" content="width=device-width, initial-scale=1">` +
      `<meta name="robots" content="noindex, nofollow">` +
      `<title>Bekräfta ditt förslag — vårdbemanning.ai</title>` +
      `<style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;` +
      `background:#0e1016;color:#f5f5f7;font-family:Inter,-apple-system,Segoe UI,Arial,sans-serif}` +
      `main{max-width:420px;padding:32px;text-align:center;line-height:1.6}` +
      `h1{font-size:20px;margin:0 0 12px}p{font-size:14px;color:#a5a9b8}` +
      `button{margin-top:20px;font-size:14px;font-weight:600;padding:12px 24px;border:0;border-radius:8px;` +
      `background:#4f46e5;color:#fff;cursor:pointer}a{color:#8ab4ff}</style></head>` +
      `<body><main>${body}</main></body></html>`,
    { status: 200, headers: { "content-type": "text/html; charset=utf-8" } },
  );
}

export const Route = createFileRoute("/api/public/bekrafta-forslag")({
  server: {
    handlers: {
      // GET visar bara en sida med en knapp — ingen bekräftelse sker, så att
      // e-postskannrar och länkförhandsvisare inte kan auto-bekräfta.
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const token = url.searchParams.get("token") ?? "";

        if (!TOKEN_RE.test(token)) {
          return page(
            `<h1>Länken är ogiltig</h1><p>Bekräftelselänken saknas eller har fel format.</p>` +
              `<p><a href="/">Till startsidan</a></p>`,
          );
        }

        return page(
          `<h1>Bekräfta ditt förslag</h1>` +
            `<p>Klicka på knappen för att bekräfta att det var du som skickade in förslaget.</p>` +
            `<form method="post"><input type="hidden" name="token" value="${token}">` +
            `<button type="submit">Bekräfta förslaget</button></form>`,
        );
      },

      POST: async ({ request }) => {
        const url = new URL(request.url);
        const redirectBase = `${url.origin}/`;

        const form = await request.formData();
        const token = String(form.get("token") ?? "");

        if (!TOKEN_RE.test(token)) {
          return new Response(null, {
            status: 303,
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
          status: 303,
          headers: { Location: `${redirectBase}?forslag=${status}` },
        });
      },
    },
  },
});
