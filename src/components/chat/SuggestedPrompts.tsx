import { Link } from "react-router-dom";

interface Props {
  onSelect: (prompt: string) => void;
}

const PROMPTS = [
  {
    emoji: "📊",
    label: "Benchmark-koll",
    prompt: "Hur ligger min lön jämfört med benchmark?",
  },
  {
    emoji: "🔄",
    label: "Jämför roller",
    prompt: "Hur skiljer sig ersättningen mellan olika roller i min zon?",
  },
  {
    emoji: "💰",
    label: "Förhandlingsutrymme",
    prompt: "Vilket förhandlingsutrymme har jag baserat på marknadsdata?",
  },
  {
    emoji: "📋",
    label: "Avtalsnivåer",
    prompt: "Vad säger ramavtalet och benchmark för min yrkesroll?",
  },
];

export default function SuggestedPrompts({ onSelect }: Props) {
  return (
    <div className="flex flex-col items-center gap-4 py-8">
      <div className="text-center mb-2">
        <h2 className="font-display text-lg font-bold text-foreground tracking-tight">
          Löneassistenten
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          Ställ frågor om din ersättning — alla svar baseras på officiella datakällor.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-2 w-full max-w-sm">
        {PROMPTS.map((p) => (
          <button
            key={p.label}
            onClick={() => onSelect(p.prompt)}
            className="flex flex-col items-start gap-1 p-3 rounded-xl bg-card border border-border text-left transition-all hover:border-primary/30 hover:bg-card/80 hover:-translate-y-0.5"
          >
            <span className="text-base">{p.emoji}</span>
            <span className="text-xs font-medium text-foreground/80">{p.label}</span>
          </button>
        ))}
      </div>

      <p className="text-[10px] text-muted-foreground/50 mt-2">
        Alla svar grundas i CI-motorn · Inga påhittade siffror
      </p>
    </div>
  );
}
