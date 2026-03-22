import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse } from "../_shared/rateLimit.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PRICES: Record<string, { id: string; mode: "payment" | "subscription" }> = {
  single: {
    id: "price_1T89nmH6keeMaRQjc7ruhDC3",
    mode: "payment",
  },
  single_29: {
    id: "price_1T8hgPH6keeMaRQjCj9y7pWZ",
    mode: "payment",
  },
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientIp = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

    // Rate limit: 10 checkout attempts per IP per hour
    const rlSupabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const rl = await checkRateLimit(rlSupabase, "create-checkout", clientIp, 10, 60);
    if (!rl.allowed) {
      console.log(`[RATE_LIMIT] create-checkout blocked | ip=${clientIp} | count=${rl.count}`);
      return rateLimitResponse(rl, corsHeaders);
    }

    const { plan, email, lead_id, report_id, coupon_code, ab_variant } = await req.json();

    // Use 29kr price if ab_variant is price_29
    const effectivePlan = (ab_variant === "price_29" && plan === "single") ? "single_29" : plan;
    const priceConfig = PRICES[effectivePlan];
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

    const rawKey = Deno.env.get("STRIPE_SECRET_KEY") || "";
    const stripeKey = rawKey.replace(/[^\x20-\x7E]/g, "").trim();
    const stripe = new Stripe(stripeKey, {
      apiVersion: "2025-08-27.basil",
    });

    // Check for existing customer
    const customers = await stripe.customers.list({ email, limit: 1 });
    let customerId: string | undefined;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
    }

    const origin = req.headers.get("origin") || "https://compcare.se";

    // Build checkout session params
    const sessionParams: Record<string, unknown> = {
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
    };

    // Validate coupon server-side if a coupon_code was provided
    if (coupon_code && typeof coupon_code === "string") {
      const couponSupabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );
      const { data: coupon } = await couponSupabase
        .from("coupons")
        .select("id, discount_type, discount_value, max_uses, use_count, expires_at")
        .eq("code", coupon_code.trim().toUpperCase())
        .maybeSingle();

      if (!coupon) {
        return new Response(JSON.stringify({ error: "Invalid coupon code" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
        return new Response(JSON.stringify({ error: "Coupon expired" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (coupon.use_count >= coupon.max_uses) {
        return new Response(JSON.stringify({ error: "Coupon fully redeemed" }), {
          status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      if (coupon.discount_type === "free") {
        // Free coupon — don't create checkout, handled client-side
      } else if (coupon.discount_value > 0 && (coupon.discount_type === "percent" || coupon.discount_type === "fixed")) {
        const couponParams: Record<string, unknown> = { duration: "once", max_redemptions: 1 };
        if (coupon.discount_type === "percent") {
          couponParams.percent_off = Math.min(coupon.discount_value, 100);
        } else {
          couponParams.amount_off = coupon.discount_value * 100;
          couponParams.currency = "sek";
        }
        const stripeCoupon = await stripe.coupons.create(couponParams);
        sessionParams.discounts = [{ coupon: stripeCoupon.id }];
      }
    }

    const session = await stripe.checkout.sessions.create(sessionParams as Parameters<typeof stripe.checkout.sessions.create>[0]);

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
