import { MessageSquare, ArrowRight } from "lucide-react";

export default function NegotiationAssistantTeaser() {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-primary/10">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-[15px] font-bold text-foreground">Löneassistenten</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Få konkreta förhandlingsråd baserade på din roll och region. Ställ frågor om din ersättning,
        bemanningsföretagets marginal och vad som är rimligt att begära.
      </p>
      <a
        href="/forhandla"
        className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:text-primary/80 transition-colors"
      >
        Prova Löneassistenten
        <ArrowRight className="w-4 h-4" />
      </a>
    </div>
  );
}
