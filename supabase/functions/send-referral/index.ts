import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lead_id, referrer_email, referee_email } = await req.json();

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
    const siteUrl = req.headers.get("origin") || supabaseUrl;
    const confirmLink = `${siteUrl}/referral/${referral.token}`;

    // Use Lovable AI to generate a nice email body
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    
    // For MVP, we'll use a simple template. In production, integrate with an email service.
    // For now, log the referral and return success — the referral is tracked.
    console.log(`Referral created: ${referrer_email} -> ${referee_email}, link: ${confirmLink}`);

    // Send email via Supabase Auth admin (using the built-in mailer isn't ideal for custom emails)
    // For MVP: we'll use a simple approach - the link is returned to the frontend
    // In production, integrate Resend/SendGrid here.

    return new Response(
      JSON.stringify({ 
        success: true, 
        token: referral.token,
        // In production, remove this — email would be sent server-side
        confirm_link: confirmLink 
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
