import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email } = await req.json();

    if (!email) {
      return new Response(JSON.stringify({ error: "Missing email" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
    if (!RESEND_API_KEY) {
      throw new Error("RESEND_API_KEY is not configured");
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "CompCare <noreply@mail.compcare.se>",
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
      <p style="font-size:14px;color:#64748b;margin:0;">CompCare – Kostnadsfri fakturaanalys</p>
    </div>

    <p style="font-size:15px;color:#334155;line-height:1.6;">
      Hej,
    </p>
    <p style="font-size:15px;color:#334155;line-height:1.6;">
      Vi har mottagit din förfrågan om en kostnadsfri analys av dina fakturor och tidrapporter. 
      Vårt team kommer att granska ditt ärende och kontakta dig inom kort med nästa steg.
    </p>

    <div style="background:#f1f5f9;border-radius:8px;padding:20px;margin:24px 0;">
      <p style="font-size:14px;color:#334155;margin:0 0 8px;font-weight:600;">Vad händer nu?</p>
      <ul style="font-size:14px;color:#475569;line-height:1.8;margin:0;padding-left:20px;">
        <li>Vi analyserar dina fakturor och tidrapporter</li>
        <li>Upptäcker vi felaktigheter kontaktar vi dig med en sammanställning</li>
        <li>Du kan ha rätt till ersättning för upp till 24 månader bakåt</li>
      </ul>
    </div>

    <p style="font-size:15px;color:#334155;line-height:1.6;">
      Har du frågor under tiden? Svara på detta mail eller kontakta oss på 
      <a href="mailto:hej@compcare.se" style="color:#0ea5e9;text-decoration:none;">hej@compcare.se</a>.
    </p>

    <hr style="border:none;border-top:1px solid #e2e8f0;margin:32px 0;" />
    <p style="font-size:12px;color:#94a3b8;text-align:center;margin:0;">
      © ${new Date().getFullYear()} CompCare.se · Detta mail skickades till ${email}
    </p>
  </div>
</body>
</html>
        `.trim(),
      }),
    });

    if (!res.ok) {
      const errBody = await res.text();
      console.error("Resend error:", errBody);
      throw new Error(`Resend API failed [${res.status}]: ${errBody}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("send-audit-confirmation error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
