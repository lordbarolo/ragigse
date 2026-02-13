import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICES: Record<string, { id: string; mode: "payment" | "subscription" }> = {
  single: {
    id: "price_1T0C0HHvw1WxEWyiopHnK2mA",
    mode: "payment",
  },
  yearly: {
    id: "price_1T0C0dHvw1WxEWyits8npOA5",
    mode: "subscription",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { plan, email, lead_id, report_id } = await req.json();

    const priceConfig = PRICES[plan];
    if (!priceConfig) {
      return new Response(JSON.stringify({ error: "Invalid plan" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!email) {
      return new Response(JSON.stringify({ error: "Email required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!report_id) {
      return new Response(JSON.stringify({ error: "report_id required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://bragig.se";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : email,
      line_items: [{ price: priceConfig.id, quantity: 1 }],
      mode: priceConfig.mode,
      success_url: `${origin}/betalning-klar?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/rapport/${report_id}`,
      metadata: {
        lead_id: lead_id || "",
        report_id,
      },
    });

    console.log(`Checkout session created: ${session.id} for ${email}, plan: ${plan}, report: ${report_id}`);

    return new Response(JSON.stringify({ url: session.url, report_id }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Checkout error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
