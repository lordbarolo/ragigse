import { Check } from "lucide-react";

const STEPS = ["Ladda upp", "Resultat", "Motbud"] as const;

export function BetaStepIndicator({ current }: { current: 1 | 2 | 3 }) {
  return (
    <nav aria-label="Analysens steg" className="mx-auto w-full max-w-2xl">
      <ol className="grid grid-cols-3 gap-2">
        {STEPS.map((label, index) => {
          const number = (index + 1) as 1 | 2 | 3;
          const complete = number < current;
          const active = number === current;
          return (
            <li key={label} className="min-w-0">
              <div className="mb-2 h-0.5 overflow-hidden rounded-full bg-border">
                <div
                  className={`h-full bg-primary transition-all duration-500 ${number <= current ? "w-full" : "w-0"}`}
                />
              </div>
              <div className={`flex items-center gap-2 text-xs sm:text-sm ${active ? "text-foreground" : "text-muted-foreground"}`}>
                <span
                  className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[11px] ${
                    active || complete ? "border-primary bg-primary text-primary-foreground" : "border-border"
                  }`}
                >
                  {complete ? <Check className="h-3 w-3" aria-hidden="true" /> : number}
                </span>
                <span className="truncate">{label}</span>
              </div>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
