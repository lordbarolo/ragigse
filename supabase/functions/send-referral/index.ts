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
    const siteUrl = req.headers.get("origin") || "https://compcare.se";
    const utmParams = "utm_source=referral&utm_medium=email&utm_campaign=colleague_tip";
    const confirmLink = `${siteUrl}/referral/${referral.token}?${utmParams}`;
    const homepageLink = `${siteUrl}/?${utmParams}`;

    // Send email via Resend if API key is configured and email sending requested
    let emailSent = false;
    const lovableApiKey = Deno.env.get("LOVABLE_API_KEY");
    const resendApiKey = Deno.env.get("RESEND_API_KEY_1");
    const GATEWAY_URL = "https://connector-gateway.lovable.dev/resend";

    if (send_email && resendApiKey) {
      const regionDisplay = region || "din region";

      // Fetch lead data to build inline preview
      let occupation = "";
      let zone = "";
      let marketRate: number | null = null;
      try {
        const { data: lead } = await supabase
          .from("leads")
          .select("yrke, kommun")
          .eq("id", lead_id)
          .maybeSingle();
        if (lead) {
          occupation = lead.yrke || "";
          zone = lead.kommun || "";
        }
        // Get market rate for this role/zone
        if (occupation && zone) {
          const { data: loc } = await supabase
            .from("locations")
            .select("zon")
            .eq("kommun", zone)
            .maybeSingle();
          if (loc?.zon) {
            const { data: rate } = await supabase
              .from("rates")
              .select("timpris_kund")
              .eq("yrkeskategori", occupation)
              .eq("zon", loc.zon)
              .eq("typ", "Dag")
              .maybeSingle();
            if (rate) marketRate = rate.timpris_kund;
          }
        }
      } catch (e) {
        console.error("Preview data fetch error:", e);
      }

      // Build inline preview card
      const previewCard = marketRate && occupation ? `
        <div style="background: linear-gradient(135deg, #0f1729, #1a2040); border-radius: 12px; padding: 24px 28px; margin: 20px 0; color: #fff;">
          <div style="font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #94a3b8; margin-bottom: 4px;">Ramavtalspris för ${occupation}</div>
          <div style="font-size: 32px; font-weight: 700; color: #38bdf8; margin-bottom: 4px;">${marketRate.toLocaleString("sv-SE")} kr/h</div>
          <div style="font-size: 12px; color: #64748b; margin-bottom: 16px;">${zone ? zone + " · " : ""}Källa: SKR ramavtal 2026</div>
          <div style="background: rgba(255,255,255,0.08); border-radius: 8px; padding: 14px 16px; margin-bottom: 16px;">
            <div style="font-size: 13px; color: #cbd5e1; margin-bottom: 6px;">💡 Visste du att…</div>
            <div style="font-size: 14px; color: #f1f5f9; line-height: 1.5;">Kommuner och regioner betalar bemanningsbolagen <strong>${marketRate.toLocaleString("sv-SE")} kr/h</strong> för en ${occupation.toLowerCase()}. Frågan är — hur stor del av det hamnar i din ficka?</div>
          </div>
          <div style="text-align: center;">
            <a href="${homepageLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #38bdf8, #0d9488); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 15px;">Se din andel — tar 30 sek</a>
          </div>
        </div>
      ` : "";

      const emailHtml = `
        <div style="font-family: 'Inter', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #1a1a2e; line-height: 1.6;">
          <div style="background: linear-gradient(135deg, #0f1729, #1a2040); padding: 20px 28px; border-radius: 12px 12px 0 0;">
            <span style="color: #38bdf8; font-weight: 700; font-size: 18px;">compcare</span><span style="color: #fff; font-weight: 700; font-size: 18px;">.se</span>
          </div>
          <div style="padding: 28px; background: #fff; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 12px 12px;">
            <h2 style="margin: 0 0 12px; color: #1a1a2e; font-size: 18px;">Din kollega tipsar: kolla din ersättning</h2>
            <p style="color: #555; font-size: 14px;">En kollega till dig i <strong>${regionDisplay}</strong> har nyss gjort en ersättningskoll och tyckte att du borde göra samma sak.</p>
            ${previewCard}
            ${!previewCard ? `
              <p style="color: #555; font-size: 14px;">Det tar bara 30 sekunder att se om du ligger rätt jämfört med vad din arbetsgivare faktiskt betalar bemanningsbolagen.</p>
              <p style="margin: 24px 0; text-align: center;">
                <a href="${homepageLink}" style="display: inline-block; padding: 14px 32px; background: linear-gradient(135deg, #38bdf8, #0d9488); color: #fff; text-decoration: none; border-radius: 8px; font-weight: 600;">Kolla din ersättning</a>
              </p>
            ` : ""}
            <p style="color: #888; font-size: 12px; margin-top: 20px;">Hälsningar,<br/>Teamet på CompCare.se</p>
          </div>
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
            from: "CompCare.se <noreply@mail.compcare.se>",
            to: [referee_email],
            subject: "Din kollega tipsar: Har du rätt ersättning som konsult?",
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
