import { Bot, Sparkles } from "lucide-react";

const examples = [
  "Vilka regioner behöver sjuksköterskor i sommar?",
  "Hur ofta kommer uppdrag i Gävle?",
  "Vilka köpare avropar mest?",
];

export default function ReijdarPromo() {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-primary/[0.04] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10">
          <Bot className="w-4.5 h-4.5 text-primary" />
        </div>
        <div>
          <span className="text-[14px] font-bold text-foreground">Fråga Reijdar</span>
          <span className="text-[11px] text-muted-foreground ml-1.5">AI-assistent</span>
        </div>
      </div>
      <p className="text-[13px] text-muted-foreground leading-relaxed">
        Reijdar kan hjälpa dig analysera marknaden — ställ frågor om historiska mönster, priser och kommande behov.
      </p>
      <div className="flex flex-wrap gap-1.5">
        {examples.map((ex) => (
          <span
            key={ex}
            className="inline-flex items-center gap-1 rounded-lg bg-background border border-border px-2.5 py-1.5 text-[11px] text-muted-foreground"
          >
            <Sparkles className="w-3 h-3 text-primary/60 shrink-0" />
            {ex}
          </span>
        ))}
      </div>
    </div>
  );
}
