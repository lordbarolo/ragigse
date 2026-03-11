import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Tag, ShieldCheck } from "lucide-react";

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

const ITEMS = [
  "Din rekommenderade ersättning",
  "Förhandlingsspann för din roll och zon",
  "Vad regionen betalar till bemanningsföretaget",
  "Steg-för-steg script: exakt vad du ska säga",
];

export default function EmailGate({ onEmailSubmit, loading, coupon, isFree, priceKr = 49 }: Props) {
  const [email, setEmail] = useState("");
  const valid = EMAIL_REGEX.test(email.trim());

  return (
    <div className="space-y-4">
      {/* Value proposition — ABOVE email input */}
      <div>
        <h3 className="text-base font-bold text-foreground mb-3">I din rapport får du:</h3>
        <ul className="space-y-2.5">
          {ITEMS.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-primary mt-0.5 shrink-0" />
              <span className="text-sm text-muted-foreground">{item}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Email input */}
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Mail className="w-4 h-4 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Ange din e-post för att fortsätta</p>
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
      </div>

      {coupon && isFree && (
        <div className="flex items-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-accent">Kupong tillämpad — gratis rapport!</span>
        </div>
      )}

      {/* CTA — solid primary */}
      <button
        disabled={!valid || loading}
        onClick={() => onEmailSubmit(email.trim().toLowerCase())}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-lg font-semibold text-base transition-all ${
          valid && !loading
            ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {loading
          ? "Laddar..."
          : isFree
            ? "Visa min rapport"
            : `Köp rapport — ${priceKr} kr`}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  );
}
