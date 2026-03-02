import { ArrowRight } from "lucide-react";

interface Props {
  checkoutLoading: string | null;
  onCheckout: (plan: "single" | "yearly") => void;
}

export default function StickyCheckoutBar({ checkoutLoading, onCheckout }: Props) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 bg-background border-t border-border shadow-[0_-4px_20px_rgba(0,0,0,0.08)]">
      <div className="max-w-lg mx-auto px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <button
          data-cta
          disabled={checkoutLoading !== null}
          onClick={() => onCheckout("single")}
          className="w-full flex items-center justify-center gap-2 py-4 rounded-lg font-semibold text-base bg-primary text-primary-foreground hover:opacity-90 shadow-sm transition-all disabled:opacity-70"
        >
          {checkoutLoading === "single" ? "Laddar..." : "Se din fulla löneanalys — 49 kr"}
          {checkoutLoading !== "single" && <ArrowRight className="w-5 h-5" />}
        </button>
        <p className="text-center text-xs text-muted-foreground mt-2">
          Engångsbetalning · Ingen bindningstid · Stripe säker betalning
        </p>
      </div>
    </div>
  );
}
