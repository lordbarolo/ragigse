import { ArrowRight } from "lucide-react";

interface Props {
  checkoutLoading: string | null;
  onCheckout: (plan: "single" | "yearly") => void;
  layout: "sticky" | "stacked";
}

export default function CheckoutButtons({ checkoutLoading, onCheckout, layout }: Props) {
  if (layout === "sticky") {
    return null;
  }

  return (
    <div className="space-y-3">
      <button
        data-cta
        disabled={checkoutLoading !== null}
        onClick={() => onCheckout("single")}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base hero-gradient text-primary-foreground card-shadow-hover transition-all disabled:opacity-70"
      >
        {checkoutLoading === "single" ? "Laddar..." : "Se din fulla löneanalys — 49 kr"}
        {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Engångsbetalning · Ingen bindningstid · Stripe säker betalning
      </p>
    </div>
  );
}
