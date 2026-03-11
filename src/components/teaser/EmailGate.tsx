import { useState } from "react";
import { Input } from "@/components/ui/input";
import { ArrowRight, Mail } from "lucide-react";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

interface Props {
  onEmailSubmit: (email: string) => void;
  loading: boolean;
}

export default function EmailGate({ onEmailSubmit, loading }: Props) {
  const [email, setEmail] = useState("");
  const valid = EMAIL_REGEX.test(email.trim());

  return (
    <div className="space-y-4">
      <div className="text-center space-y-1.5">
        <h2 className="text-lg font-bold text-foreground">
          Vart ska vi skicka din rapport?
        </h2>
        <p className="text-sm text-muted-foreground">
          Ange din e-post så genererar vi rapporten direkt.
          Du får även en kopia i din inkorg.
        </p>
      </div>

      <div className="space-y-2">
        <div className="relative">
          <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder="namn@exempel.se"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="h-12 text-base pl-10"
            onKeyDown={(e) => {
              if (e.key === "Enter" && valid && !loading) onEmailSubmit(email.trim().toLowerCase());
            }}
          />
        </div>
        <p className="text-[11px] text-muted-foreground text-center">
          Vi delar aldrig din e-post med tredje part.
        </p>
      </div>

      <button
        disabled={!valid || loading}
        onClick={() => onEmailSubmit(email.trim().toLowerCase())}
        className={`w-full flex items-center justify-center gap-2 py-3.5 rounded-lg font-semibold text-base transition-all ${
          valid && !loading
            ? "bg-primary text-primary-foreground hover:opacity-90 shadow-md"
            : "bg-muted text-muted-foreground cursor-not-allowed"
        }`}
      >
        {loading ? "Genererar rapport..." : "Visa min rapport"}
        {!loading && <ArrowRight className="w-5 h-5" />}
      </button>
    </div>
  );
}
