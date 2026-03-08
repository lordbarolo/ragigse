import { ArrowRight, Tag } from "lucide-react";

interface CouponInfo {
  discount_type: "percent" | "fixed" | "free";
  discount_value: number;
}

interface Props {
  checkoutLoading: string | null;
  onCheckout: (plan: "single" | "yearly") => void;
  variant: "sticky" | "inline" | "stacked";
  coupon?: CouponInfo | null;
  priceKr?: number;
}

function getPriceLabel(basePrice: number, coupon?: CouponInfo | null): string {
  if (!coupon) return `${basePrice} kr`;
  if (coupon.discount_type === "free" || (coupon.discount_type === "percent" && coupon.discount_value >= 100)) {
    return "Gratis";
  }
  if (coupon.discount_type === "percent") {
    const price = Math.round(basePrice * (1 - coupon.discount_value / 100));
    return `${price} kr`;
  }
  if (coupon.discount_type === "fixed") {
    const price = Math.max(0, basePrice - coupon.discount_value);
    return `${price} kr`;
  }
  return `${basePrice} kr`;
}

export default function CheckoutCTA({ checkoutLoading, onCheckout, variant, coupon, priceKr = 49 }: Props) {
  const priceLabel = getPriceLabel(priceKr, coupon);
  const hasCoupon = !!coupon;

  if (variant === "inline") {
    return (
      <div className="text-center">
        <button
          data-cta
          disabled={checkoutLoading !== null}
          onClick={() => onCheckout("single")}
          className="inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline transition-all disabled:opacity-70"
        >
          {checkoutLoading === "single" ? "Laddar..." : "Få ditt exakta belopp + förhandlingsscript"}
          {checkoutLoading !== "single" && <ArrowRight className="w-4 h-4" />}
        </button>
      </div>
    );
  }

  if (variant === "sticky") {
    return (
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
        <div className="max-w-lg mx-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
          {hasCoupon && (
            <div className="flex items-center justify-center gap-1.5 mb-2">
              <Tag className="w-3.5 h-3.5 text-accent" />
              <span className="text-xs font-medium text-accent">Kupong tillämpad!</span>
            </div>
          )}
          <button
            data-cta
            disabled={checkoutLoading !== null}
            onClick={() => onCheckout("single")}
            className="w-full flex items-center justify-center gap-2 py-4 rounded-lg font-semibold text-base bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all disabled:opacity-70"
          >
            {checkoutLoading === "single"
              ? "Laddar..."
              : `Se din fulla ersättningsanalys — ${priceLabel}`}
            {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
          </button>
          <p className="text-center text-xs text-muted-foreground mt-2">
            {hasCoupon && priceLabel === "Gratis"
              ? "Gratis med kupong · Ingen betalning krävs"
              : "Engångsbetalning · Ingen bindningstid · Stripe säker betalning"}
          </p>
        </div>
      </div>
    );
  }

  // stacked
  return (
    <div className="space-y-3 px-4 pb-8 max-w-lg mx-auto">
      <button
        data-cta
        disabled={checkoutLoading !== null}
        onClick={() => onCheckout("single")}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-lg font-semibold text-base bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all disabled:opacity-70"
      >
        {checkoutLoading === "single"
          ? "Laddar..."
          : `Se din fulla ersättningsanalys — ${priceLabel}`}
        {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        {hasCoupon && priceLabel === "Gratis"
          ? "Gratis med kupong · Ingen betalning krävs"
          : "Engångsbetalning · Ingen bindningstid · Stripe säker betalning"}
      </p>
    </div>
  );
}
