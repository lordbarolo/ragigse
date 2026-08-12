import { createFileRoute } from "@tanstack/react-router";
import { checkRateLimit, clientIpFrom } from "@/lib/rateLimit.server";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const SITE_NAME = "vardbemanning.ai";

function ok() {
  return Response.json({ success: true });
}

function confirmationHtml(url: string): string {
  return (
    `<!doctype html><html lang="sv"><body style="margin:0;background:#ffffff;` +
    `font-family:Inter,-apple-system,Segoe UI,Arial,sans-serif;color:#111318">` +
    `<div style="max-width:520px;margin:0 auto;padding:32px 24px">` +
    `<h1 style="font-size:20px;margin:0 0 16px">Bekräfta din e-postadress</h1>` +
    `<p style="font-size:15px;line-height:1.6;color:#3c4048">Klicka på knappen nedan för att aktivera ditt konto på vårdbemanning.ai.</p>` +
    `<p style="margin:24px 0"><a href="${url}" style="display:inline-block;background:#111318;color:#ffffff;` +
    `text-decoration:none;font-size:14px;font-weight:600;padding:12px 24px;border-radius:8px">Bekräfta e-postadress</a></p>` +
    `<p style="font-size:13px;line-height:1.6;color:#6b7280">Fungerar inte knappen? Kopiera denna länk:<br>` +
    `<a href="${url}" style="color:#534AB7;word-break:break-all">${url}</a></p>` +
    `<p style="font-size:12px;color:#9aa0ab;margin-top:32px">Du får detta mejl eftersom någon registrerade sig med din e-postadress på vårdbemanning.ai.</p>` +
    `</div></body></html>`
  );
}

export const Route = createFileRoute("/api/public/send-signup-confirmation")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const lovableApiKey = process.env["LOVABLE_API_KEY"];
        const resendKey =
          process.env["RESEND_API_KEY_1"] || process.env["RESEND_API_KEY"];
        const fromDomainRaw = (process.env["RESEND_FROM_DOMAIN"] || "")
          .trim()
          .toLowerCase();
        const fromDomain =
          fromDomainRaw === "vardbemanning.ai" ||
          fromDomainRaw.endsWith(".vardbemanning.ai")
            ? fromDomainRaw
            : "vardbemanning.ai";

        if (!lovableApiKey || !resendKey) {
          console.error("[signup-confirmation] missing email credentials");
          return new Response("Server configuration error", { status: 500 });
        }

        let email = "";
        let redirectTo = "";
        try {
          const body = (await request.json()) as {
            email?: unknown;
            redirectTo?: unknown;
          };
          email = String(body.email ?? "").trim().toLowerCase();
          redirectTo = String(body.redirectTo ?? "").trim();
        } catch {
          return new Response("Invalid JSON", { status: 400 });
        }

        if (!EMAIL_RE.test(email)) {
          return new Response("Valid email is required", { status: 400 });
        }

        const { supabaseAdmin } = await import(
          "@/integrations/supabase/client.server"
        );

        const rate = await checkRateLimit(
          supabaseAdmin,
          "send-signup-confirmation",
          clientIpFrom(request.headers),
          5,
          60,
        );
        if (!rate.allowed) {
          return new Response("Too many requests", {
            status: 429,
            headers: { "Retry-After": String(rate.retryAfterSeconds) },
          });
        }

        // Only redirect back to origins we control.
        let target = "https://vardbemanning.ai/consultant/profil";
        try {
          const parsed = new URL(redirectTo);
          if (
            parsed.hostname.endsWith("vardbemanning.ai") ||
            parsed.hostname.endsWith("lovable.app")
          ) {
            target = parsed.toString();
          }
        } catch {
          // keep default
        }

        const { data: linkData, error: linkError } =
          await supabaseAdmin.auth.admin.generateLink({
            type: "magiclink",
            email,
            options: { redirectTo: target },
          });

        const actionLink = linkData?.properties?.action_link;
        if (linkError || !actionLink) {
          // Never reveal whether the address exists.
          console.error(
            "[signup-confirmation] generateLink failed",
            linkError?.message,
          );
          return ok();
        }

        const messageId = crypto.randomUUID();
        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "signup",
          recipient_email: email,
          status: "pending",
        });

        const resp = await fetch(
          "https://connector-gateway.lovable.dev/resend/emails",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${lovableApiKey}`,
              "X-Connection-Api-Key": resendKey,
            },
            body: JSON.stringify({
              from: `${SITE_NAME} <noreply@${fromDomain}>`,
              to: [email],
              subject: "Bekräfta din e-postadress",
              html: confirmationHtml(actionLink),
            }),
          },
        );

        const respText = await resp.text();

        if (!resp.ok) {
          console.error("[signup-confirmation] Resend send failed", {
            status: resp.status,
            body: respText,
          });
          await supabaseAdmin.from("email_send_log").insert({
            message_id: messageId,
            template_name: "signup",
            recipient_email: email,
            status: "failed",
            error_message: `Resend ${resp.status}: ${respText}`.slice(0, 1000),
          });
          return new Response("Failed to send confirmation email", {
            status: 500,
          });
        }

        let resendId: string | null = null;
        try {
          resendId = (JSON.parse(respText) as { id?: string }).id ?? null;
        } catch {
          resendId = null;
        }

        await supabaseAdmin.from("email_send_log").insert({
          message_id: messageId,
          template_name: "signup",
          recipient_email: email,
          status: "sent",
          metadata: { resend_id: resendId },
        });

        return ok();
      },
    },
  },
});
