import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lead_id, referrer_email, referee_email, region, send_email } = await req.json();

    if (!lead_id || !referrer_email || !referee_email) {
      return new Response(JSON.stringify({ error: "Missing fields" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert referral and get back the token
    const { data: referral, error: insertError } = await supabase
      .from("referrals")
      .insert({ lead_id, referrer_email, referee_email })
      .select("token")
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(JSON.stringify({ error: "Could not create referral" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Build the confirmation link
    const siteUrl = req.headers.get("origin") || "https://bragig.se";
    const confirmLink = `${siteUrl}/referral/${referral.token}`;
    const homepageLink = siteUrl;

    // Send email via Resend if API key is configured and email sending requested
    let emailSent = false;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");

    if (send_email && resendApiKey) {
      const regionDisplay = region || "din region";
      const emailHtml = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e;">
          <p>Hej!</p>
          <p>En kollega till dig har precis använt vår lönekoll för att se om hen ligger rätt i förhållande till de senaste ramavtalspriserna i <strong>${regionDisplay}</strong>.</p>
          <p>Din kollega tyckte att även du borde göra en koll. Det tar bara 30 sekunder att se om du är en av de 75% som faktiskt är underbetalda i förhållande till vad kommunerna och regionerna faktiskt betalar bemanningsbolagen.</p>
          <p style="margin: 24px 0;">
            <a href="${homepageLink}" style="display: inline-block; padding: 12px 28px; background: linear-gradient(135deg, #1565c0, #0d47a1); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Kolla din lön här</a>
          </p>
          <p style="color: #666; font-size: 13px;">Hälsningar,<br/>Teamet på BraGig.se</p>
        </div>
      `;

      try {
        const resendRes = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${resendApiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            from: "BraGig.se <noreply@bragig.se>",
            to: [referee_email],
            subject: "Din kollega tipsar: Har du rätt lön som konsult?",
            html: emailHtml,
          }),
        });

        if (resendRes.ok) {
          emailSent = true;
          console.log(`Email sent to ${referee_email}`);
        } else {
          const errBody = await resendRes.text();
          console.error(`Resend error [${resendRes.status}]: ${errBody}`);
        }
      } catch (emailErr) {
        console.error("Email send error:", emailErr);
      }
    }

    console.log(`Referral created: ${referrer_email} -> ${referee_email}, link: ${confirmLink}`);

    return new Response(
      JSON.stringify({
        success: true,
        token: referral.token,
        confirm_link: confirmLink,
        email_sent: emailSent,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Error:", err);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
