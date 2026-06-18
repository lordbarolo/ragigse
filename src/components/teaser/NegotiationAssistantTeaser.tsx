import { MessageSquare } from "lucide-react";

export default function NegotiationAssistantTeaser() {
  return (
    <div className="rounded-2xl border border-border/60 bg-white/80 backdrop-blur-sm p-5 space-y-3 shadow-sm">
      <div className="flex items-center gap-2.5">
        <div className="p-2 rounded-xl bg-primary/10">
          <MessageSquare className="w-4 h-4 text-primary" />
        </div>
        <h3 className="text-[15px] font-bold text-foreground">Förhandlingsassistenten</h3>
      </div>
      <p className="text-sm text-muted-foreground leading-relaxed">
        Skapa kostnadsfritt konto och få konkreta förhandlingsråd utifrån roll och region. Du kan
        ställa frågor om din ersättning, bemanningsföretagets marginal och vad som är rimligt att begära.
      </p>
    </div>
  );
}
