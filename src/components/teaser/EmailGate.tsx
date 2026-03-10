import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Tag, Coins, BarChart3, MessageSquare, FileText } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface CouponInfo {
  discount_type: "percent" | "fixed" | "free";
  discount_value: number;
}

interface ValueItem {
  icon: React.ElementType;
  text: string;
  highlight?: string;
}

interface Props {
  onEmailSubmit: (email: string) => void;
  loading: boolean;
  coupon?: CouponInfo | null;
  isFree: boolean;
  priceKr?: number;
  valueItems?: ValueItem[];
}

export default function EmailGate({ onEmailSubmit, loading, coupon, isFree, valueItems }: Props) {
  const [email, setEmail] = useState("");
  const valid = EMAIL_REGEX.test(email.trim());

  const defaultItems: ValueItem[] = [
    { icon: Coins, text: "Vad regionen betalar bemanningsföretaget", highlight: "ramavtalspris" },
    { icon: BarChart3, text: "Förhandlingsspann", highlight: "för din roll och zon" },
    { icon: MessageSquare, text: "Steg-för-steg script", highlight: "exakt vad du ska säga" },
    { icon: FileText, text: "Orter som betalar mer", highlight: "än din nuvarande" },
  ];

  const items = valueItems || defaultItems;

  return (
    <div className="space-y-4">
      {/* Value proposition */}
      <p className="text-base font-semibold text-foreground text-center leading-snug">
        I din rapport får du:
      </p>

      <div className="space-y-2.5">
        {items.map(({ icon: Icon, text, highlight }, i) => (
          <div key={i} className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Icon className="w-4 h-4 text-primary" />
            </div>
            <p className="text-sm text-muted-foreground">
              {text}{highlight && <>: <span className="text-foreground font-medium">{highlight}</span></>}
            </p>
          </div>
        ))}
      </div>

      {/* Email input */}
      <div className="pt-2 space-y-2">
        <p className="text-sm font-medium text-foreground text-center">
          Ange din e-post för att se dina siffror
        </p>
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
        <p className="text-xs text-muted-foreground text-center">
          Vi skickar din analys till din e-post så att du kan komma tillbaka till den senare.
        </p>
      </div>

      {coupon && isFree && (
        <div className="flex items-center justify-center gap-1.5">
          <Tag className="w-3.5 h-3.5 text-accent" />
          <span className="text-xs font-medium text-accent">Kupong tillämpad — gratis rapport!</span>
        </div>
      )}

      <button
        disabled={!valid || loading}
        onClick={() => onEmailSubmit(email.trim().toLowerCase())}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-lg font-semibold text-base transition-all ${
          valid && !loading
            ? "bg-primary text-primary-foreground hover:brightness-110 shadow-md shadow-primary/25"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {loading ? "Laddar..." : "Visa min rapport"}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  );
}
