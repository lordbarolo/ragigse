import { ArrowLeftRight, Coins, FileText } from "lucide-react";

interface Props {
  onSelect: (prompt: string) => void;
}

const PROMPTS = [
  {
    Icon: ArrowLeftRight,
    label: "Jämför roller",
    prompt: "Hur skiljer sig ersättningen mellan olika roller i min zon?",
  },
  {
    Icon: Coins,
    label: "Förhandling",
    prompt: "Vilket förhandlingsutrymme har jag baserat på marknadsdata?",
  },
  {
    Icon: FileText,
    label: "Avtalsnivåer",
    prompt: "Vad säger ramavtalet för min yrkesroll?",
  },
];

export default function SuggestedPrompts({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-5 pt-3 pb-4">
      <p className="text-sm text-foreground/80 text-center max-w-sm leading-relaxed">
        Ställ valfri fråga om din ersättning — alla svar baseras på officiella datakällor.
      </p>

      <div className="w-full">
        <p className="text-xs font-medium text-foreground/70 mb-2 text-center">
          Föreslagna ämnen
        </p>
        <div className="grid grid-cols-3 gap-2 w-full">
          {PROMPTS.map(({ Icon, label, prompt }) => (
            <button
              key={label}
              onClick={() => onSelect(prompt)}
              className="group flex flex-col items-center justify-start gap-2 px-2 py-3 rounded-xl bg-card/70 border border-border/60 text-center transition-all hover:bg-card hover:border-primary/40 hover:-translate-y-0.5 active:translate-y-0 active:bg-primary/10 active:border-primary/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
            >
              <Icon className="w-4 h-4 text-foreground/80 group-hover:text-primary transition-colors" />
              <span className="text-[11px] sm:text-xs font-medium text-foreground leading-tight break-words">
                {label}
              </span>
            </button>
          ))}
        </div>
      </div>

      <p className="text-[11px] text-foreground/60 text-center">
        Alla svar grundas i CI-motorn · Inga påhittade siffror
      </p>
    </div>
  );
}
