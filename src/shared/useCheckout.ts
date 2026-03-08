import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

interface CouponDiscount {
  discount_type: "percent" | "fixed" | "free";
  discount_value: number;
}

export function useCheckout() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (
    plan: "single" | "yearly",
    opts: { email: string; leadId?: string; reportId?: string; coupon?: CouponDiscount | null; abVariant?: string }
  ) => {
    if (!opts.email) return;
    setCheckoutLoading(plan);
    trackEvent("checkout_started", { plan, has_coupon: !!opts.coupon });
    try {
      const body: Record<string, unknown> = {
        plan,
        email: opts.email,
        lead_id: opts.leadId || "",
        report_id: opts.reportId || "",
      };

      if (opts.coupon) {
        body.coupon_discount_type = opts.coupon.discount_type;
        body.coupon_discount_value = opts.coupon.discount_value;
      }

      const { data, error } = await supabase.functions.invoke("create-checkout", { body });
      if (error) throw error;
      if (data?.url) {
        if (data.report_id) {
          try {
            sessionStorage.setItem("reportId", data.report_id);
          } catch {
            // Ignore storage issues
          }
        }
        window.location.href = data.url;
      }
    } catch {
      toast({ title: "Kunde inte starta betalning, försök igen", variant: "destructive" });
    } finally {
      setCheckoutLoading(null);
    }
  };

  return { checkoutLoading, handleCheckout };
}
