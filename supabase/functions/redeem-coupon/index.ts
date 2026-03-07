import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

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
    const { code, report_id } = await req.json();

    if (!code || !report_id) {
      return new Response(
        JSON.stringify({ error: "code and report_id required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Look up coupon
    const { data: coupon, error: couponErr } = await supabase
      .from("coupons")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .single();

    if (couponErr || !coupon) {
      return new Response(
        JSON.stringify({ error: "Ogiltig kupongkod" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (coupon.use_count >= coupon.max_uses) {
      return new Response(
        JSON.stringify({ error: "Kupongkoden har redan använts maximalt antal gånger" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: "Kupongkoden har gått ut" }),
        { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For free coupons (100% discount): unlock report directly
    if (coupon.discount_type === "free" || (coupon.discount_type === "percent" && coupon.discount_value >= 100)) {
      // Mark coupon usage
      const newCount = (coupon.use_count || 0) + 1;
      await supabase
        .from("coupons")
        .update({ use_count: newCount, used: newCount >= coupon.max_uses, used_at: new Date().toISOString(), used_by_report_id: report_id })
        .eq("id", coupon.id);

      // Unlock the report
      await supabase
        .from("reports")
        .update({ status: "paid", paid_at: new Date().toISOString() })
        .eq("id", report_id);

      console.log(`Coupon ${code} redeemed for free report ${report_id}`);

      return new Response(
        JSON.stringify({ 
          status: "unlocked", 
          discount_type: coupon.discount_type,
          discount_value: coupon.discount_value,
          message: "Rapporten är upplåst!" 
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // For partial discounts: increment usage and return discount info
    const newCount = (coupon.use_count || 0) + 1;
    await supabase
      .from("coupons")
      .update({ use_count: newCount, used: newCount >= coupon.max_uses, used_at: new Date().toISOString(), used_by_report_id: report_id })
      .eq("id", coupon.id);

    console.log(`Coupon ${code} redeemed (${coupon.discount_type}: ${coupon.discount_value}) for report ${report_id}`);

    return new Response(
      JSON.stringify({
        status: "discount",
        discount_type: coupon.discount_type,
        discount_value: coupon.discount_value,
        message: coupon.discount_type === "percent" 
          ? `${coupon.discount_value}% rabatt tillämpad!`
          : `${coupon.discount_value} kr rabatt tillämpad!`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Coupon error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
