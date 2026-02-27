import { ArrowRight } from "lucide-react";

interface Props {
  checkoutLoading: string | null;
  onCheckout: (plan: "single" | "yearly") => void;
  layout: "sticky" | "stacked";
}

export default function CheckoutButtons({ checkoutLoading, onCheckout, layout }: Props) {
  if (layout === "sticky") {
    return (
      <div className="fixed bottom-0 inset-x-0 bg-card/95 backdrop-blur-sm border-t border-border p-3 z-40 safe-area-bottom">
        <div className="max-w-lg mx-auto flex gap-2">
          <button
            data-cta
            disabled={checkoutLoading !== null}
            onClick={() => onCheckout("single")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-semibold text-sm hero-gradient text-primary-foreground transition-all disabled:opacity-70"
          >
            {checkoutLoading === "single" ? "Laddar..." : "49 kr"}
            {checkoutLoading !== "single" && <ArrowRight className="w-4 h-4" />}
          </button>
          <button
            data-cta
            disabled={checkoutLoading !== null}
            onClick={() => onCheckout("yearly")}
            className="flex-1 flex items-center justify-center gap-1.5 py-3 rounded-xl font-medium text-sm border border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-70"
          >
            {checkoutLoading === "yearly" ? "Laddar..." : "495 kr/år"}
          </button>
        </div>
      </div>
    );
  }

  // stacked layout (Report preview)
  return (
    <div className="space-y-3">
      <button
        data-cta
        disabled={checkoutLoading !== null}
        onClick={() => onCheckout("single")}
        className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base hero-gradient text-primary-foreground card-shadow-hover transition-all disabled:opacity-70"
      >
        {checkoutLoading === "single" ? "Laddar..." : "Köp rapport — 49 kr"}
        {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
      </button>
      <button
        data-cta
        disabled={checkoutLoading !== null}
        onClick={() => onCheckout("yearly")}
        className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-sm border-2 border-primary text-primary hover:bg-primary/5 transition-all disabled:opacity-70"
      >
        {checkoutLoading === "yearly" ? "Laddar..." : "Årsabonnemang — 495 kr/år"}
      </button>
      <p className="text-center text-xs text-muted-foreground">
        Engångsbetalning · Ingen bindningstid · Stripe säker betalning
      </p>
    </div>
  );
}
