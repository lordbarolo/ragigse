import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/trackEvent";

export function useCheckout() {
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  const handleCheckout = async (
    plan: "single" | "yearly",
    opts: { email: string; leadId?: string; reportId?: string }
  ) => {
    if (!opts.email) return;
    setCheckoutLoading(plan);
    trackEvent("checkout_started", { plan });
    try {
      const { data, error } = await supabase.functions.invoke("create-checkout", {
        body: {
          plan,
          email: opts.email,
          lead_id: opts.leadId || "",
          report_id: opts.reportId || "",
        },
      });
      if (error) throw error;
      if (data?.url) {
        if (data.report_id) {
          sessionStorage.setItem("reportId", data.report_id);
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
