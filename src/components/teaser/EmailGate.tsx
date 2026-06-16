import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail, Zap } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  onEmailSubmit: (email: string) => void;
  loading: boolean;
}

export default function EmailGate({ onEmailSubmit, loading }: Props) {
  const [email, setEmail] = useState("");
  const valid = EMAIL_REGEX.test(email.trim());

  return (
    <div className="space-y-3">
      <div className="relative">
        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-muted-foreground" />
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          placeholder="namn@exempel.se"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="h-14 text-base pl-11 rounded-xl"
          onKeyDown={(e) => {
            if (e.key === "Enter" && valid && !loading) onEmailSubmit(email.trim().toLowerCase());
          }}
        />
      </div>

      {/* Pop-badge above button */}
      {valid && !loading && (
        <div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-primary">
          <Zap className="w-3.5 h-3.5" />
          Kostnadsfritt — klart på 60 sekunder
        </div>
      )}

      <button
        disabled={!valid || loading}
        onClick={() => onEmailSubmit(email.trim().toLowerCase())}
        className={`w-full flex items-center justify-center gap-2 py-4 rounded-xl font-semibold text-base transition-all active:scale-[0.98] ${
          valid && !loading
            ? "bg-gradient-to-r from-[#8155FF] to-[#a855f7] text-white shadow-[0_8px_32px_-6px_rgba(129,85,255,0.45)] hover:shadow-[0_12px_40px_-6px_rgba(129,85,255,0.55)] hover:-translate-y-0.5"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {loading ? "Genererar rapport…" : "Visa min rapport"}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>

      <p className="text-[13px] text-foreground/40 text-center">
        Vi delar aldrig din e-post med tredje part.
      </p>
    </div>
  );
}
