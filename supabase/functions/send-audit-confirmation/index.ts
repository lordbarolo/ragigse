import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { fromAddress } from "../_shared/mailFrom.ts";
import { clientIp, emailKey } from "../_shared/emailCallerGate.ts";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Basic email format check
function isEmail(v: unknown): v is string {
  return typeof v === "string" && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) && v.length <= 254;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => ({}));
    const { email } = body ?? {};

    if (!isEmail(email)) {
      return new Response(JSON.stringify({ error: "Invalid email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Anti-abuse gate: only send to addresses that actually opted in via
    // invoice_review_leads within the last 10 minutes. Prevents this function
    // from being used to send arbitrary emails from our verified domain.
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Rate limit per IP and per recipient so the endpoint cannot be used to
    // hammer a single address or to fan out from one host.
    for (const key of [`ip:${clientIp(req)}`, await emailKey(email)]) {
      const rl = await checkRateLimit(supabase, "send-audit-confirmation", key, 3, 60);
      if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
    }


    const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: lead, error: leadErr } = await supabase
      .from("invoice_review_leads")
      .select("id, created_at")
      .eq("email", email)
      .gte("created_at", tenMinAgo)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (leadErr || !lead) {
      // Do not reveal whether the email is known. Return 202-style success
      // to keep the client flow silent while refusing to send.
      return new Response(JSON.stringify({ ok: true, sent: false }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY_1");
    if (!LOVABLE_API_KEY || !RESEND_API_KEY) {
      throw new Error("Email transport not configured");
    }

    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

    const res = await fetch(`${GATEWAY_URL}/emails`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": RESEND_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromAddress(),
        to: [email],
        subject: "Vi har tagit emot din intresseanmälan – kostnadsfri fakturaanalys",
        html: `
<!DOCTYPE html>
<html lang="sv">
<head><meta charset="utf-8"></head>
<body style="margin:0;padding:0;font-family:Arial,sans-serif;background:#ffffff;">
  <div style="max-width:560px;margin:0 auto;padding:40px 24px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="font-size:20px;color:#0f172a;margin:0 0 8px;">Tack för din intresseanmälan!</h1>
      <p style="font-size:14px;color:#64748b;margin:0;">vårdbemanning.ai — Fakturakontroll</p>
    </div>
    <p style="font-size:14px;color:#0f172a;line-height:1.6;">Vi hör av oss inom kort med nästa steg för din kostnadsfria fakturaanalys.</p>
  </div>
</body>
</html>`,
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error(`Resend error [${res.status}]: ${errBody}`);
      return new Response(JSON.stringify({ ok: false }), {
        status: 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ ok: true, sent: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("send-audit-confirmation error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
