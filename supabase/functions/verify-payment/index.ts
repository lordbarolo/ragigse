import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0?target=deno";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const { session_id } = await req.json();

    if (!session_id) {
      return new Response(JSON.stringify({ error: "Missing session_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== "paid") {
      return new Response(
        JSON.stringify({ verified: false, status: session.payment_status }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const leadId = session.metadata?.lead_id;
    const reportId = session.metadata?.report_id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    if (leadId) {
      // Mark lead as paid
      await supabase.from("leads").update({ paid: true }).eq("id", leadId);
    }

    if (reportId) {
      // Update report status to paid
      await supabase
        .from("reports")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", reportId);
    }

    // Insert payment record (idempotent via unique stripe_session_id)
    await supabase.from("payments").insert({
      lead_id: leadId || null,
      report_id: reportId || null,
      stripe_session_id: session.id,
      amount_ore: session.amount_total || 0,
      currency: session.currency || "sek",
      status: "paid",
      plan: session.mode === "subscription" ? "yearly" : "single",
    });

    console.log(`Payment verified for lead ${leadId}, report ${reportId}`);

    return new Response(
      JSON.stringify({
        verified: true,
        email: session.customer_details?.email,
        lead_id: leadId,
        report_id: reportId,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Verify payment error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
