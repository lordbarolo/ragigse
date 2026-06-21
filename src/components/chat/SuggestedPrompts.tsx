import { Coins, MapPin, FileText } from "lucide-react";

interface Props {
  onSelect: (prompt: string) => void;
}

const PROMPTS = [
  {
    Icon: Coins,
    label: "Förhandling",
    prompt: "Vilket förhandlingsutrymme har jag baserat på marknadsdata?",
  },
  {
    Icon: MapPin,
    label: "Annan ort",
    prompt: "Hur ser ersättningen ut om jag jobbar i en annan ort?",
  },
  {
    Icon: FileText,
    label: "Avtalsnivå",
    prompt: "Vad är kundpriset enligt ramavtalet för min roll och zon?",
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
        Alla svar grundas i assistenten · Inga påhittade siffror
      </p>
    </div>
  );
}
