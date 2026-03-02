import { ArrowRight } from "lucide-react";

interface Props {
  checkoutLoading: string | null;
  onCheckout: (plan: "single" | "yearly") => void;
}

export default function InlineCtaLink({ checkoutLoading, onCheckout }: Props) {
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
