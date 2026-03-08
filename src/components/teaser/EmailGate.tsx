import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Tag } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CouponInfo {
  discount_type: "percent" | "fixed" | "free";
  discount_value: number;
}

interface Props {
  onEmailSubmit: (email: string) => void;
  loading: boolean;
  coupon?: CouponInfo | null;
  isFree: boolean;
  priceKr?: number;
}

export default function EmailGate({ onEmailSubmit, loading, coupon, isFree, priceKr = 49 }: Props) {
  const [email, setEmail] = useState("");
  const valid = EMAIL_REGEX.test(email.trim());

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-1">
        <Mail className="w-4 h-4 text-muted-foreground" />
        <label className="text-sm font-medium text-foreground">
          Ange din e-post — vi skickar rapporten hit
        </label>
      </div>
      <Input
        type="email"
        inputMode="email"
        autoComplete="email"
        placeholder="namn@exempel.se"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="h-12 text-base"
        onKeyDown={(e) => {
          if (e.key === "Enter" && valid && !loading) onEmailSubmit(email.trim().toLowerCase());
        }}
      />
      <p className="text-xs text-muted-foreground">Din e-post delas aldrig vidare.</p>

      {coupon && isFree && (
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-accent">Kupong tillämpad — gratis rapport!</span>
        </div>
      )}

      <button
        disabled={!valid || loading}
        onClick={() => onEmailSubmit(email.trim().toLowerCase())}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-lg font-semibold text-base transition-all ${
          valid && !loading
            ? "bg-primary text-primary-foreground hover:opacity-90 shadow-sm"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {loading
          ? "Laddar..."
          : isFree
            ? "Visa min rapport"
            : "Köp rapport — 49 kr"}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  );
}
