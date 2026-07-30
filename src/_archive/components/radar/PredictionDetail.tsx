import { Prediction } from "./radarMockData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Building2, MapPin, Clock, Radio, Info } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

function ProbabilityBalls({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1.5">
      {[1, 2, 3].map((i) => (
        <span key={i} className={`w-4 h-4 rounded-full ${i <= level ? "bg-primary" : "bg-muted"}`} />
      ))}
      <span className="text-[12px] text-muted-foreground ml-2">
        {level === 3 ? "Hög sannolikhet" : level === 2 ? "Återkommande mönster" : "Historisk bas"}
      </span>
    </div>
  );
}

interface PredictionDetailProps {
  prediction: Prediction | null;
  open: boolean;
  onClose: () => void;
}

export default function PredictionDetail({ prediction, open, onClose }: PredictionDetailProps) {
  const { user } = useAuth();
  const { toast } = useToast();

  if (!prediction) return null;

  const handleWatch = async () => {
    if (!user) {
      toast({ title: "Logga in", description: "Du behöver ett konto för att bevaka uppdrag." });
      return;
    }

    const { error } = await supabase.from("radar_watchlist").insert({
      user_id: user.id,
      competence: prediction.competence,
      location: prediction.location,
      buyer: prediction.buyer,
      predicted_date: prediction.predictedDate,
    });

    if (error) {
      toast({ title: "Kunde inte spara", description: error.message, variant: "destructive" });
    } else {
      toast({
        title: "Bevakning skapad ✓",
        description: `Du bevakar nu ${prediction.competence} hos ${prediction.buyer}. Påminnelser skickas 3, 2 och 1 månad innan.`,
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-background border-border px-5 pb-8">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="font-display text-lg font-bold text-foreground">
            {prediction.competence}
          </SheetTitle>
          <div className="flex flex-wrap gap-3 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" />{prediction.buyer}</span>
            <span className="flex items-center gap-1.5"><MapPin className="w-3.5 h-3.5" />{prediction.location}</span>
          </div>
        </SheetHeader>

        {/* Probability */}
        <div className="mb-4">
          <ProbabilityBalls level={prediction.probabilityLevel} />
        </div>

        {/* Seasonal signal */}
        {prediction.seasonalSignal && (
          <div className="text-[12px] text-accent font-medium bg-accent/10 border border-accent/20 rounded-lg px-3 py-2 mb-4">
            🔄 {prediction.seasonalSignal}
          </div>
        )}

        {/* Summary */}
        <p className="text-[14px] leading-relaxed text-foreground/80 mb-5">{prediction.summary}</p>

        {/* Signals */}
        <section className="mb-5">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">Historiska signaler</h4>
          <div className="space-y-2 text-[13px] text-foreground/80">
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary flex-shrink-0" /><span>{prediction.historicalSignal}</span></div>
            <div className="flex items-center gap-2"><Radio className="w-4 h-4 text-primary flex-shrink-0" /><span>Genomsnittligt intervall: {prediction.avgIntervalDays} dagar</span></div>
            <div className="flex items-center gap-2"><Clock className="w-4 h-4 text-primary flex-shrink-0" /><span>{prediction.lastActivity}</span></div>
            {prediction.predictedDate && (
              <div className="flex items-center gap-2"><Radio className="w-4 h-4 text-accent flex-shrink-0" /><span>Förväntat nästa: {prediction.predictedDate}</span></div>
            )}
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-5">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">Tidslinje</h4>
          <div className="relative pl-4 border-l-2 border-border space-y-3">
            {prediction.history.map((h, i) => (
              <div key={i} className="relative">
                <span className="absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full bg-primary border-2 border-background" />
                <div className="text-[12px] text-muted-foreground">{h.date}</div>
                <div className="text-[13px] text-foreground/80">{h.description}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Reasons */}
        <section className="mb-5">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />Varför visas detta?
          </h4>
          <ul className="space-y-1.5 text-[13px] text-foreground/70">
            {prediction.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />{r}
              </li>
            ))}
          </ul>
        </section>

        {/* Bevaknings-CTA gömd tillsvidare */}
      </SheetContent>
    </Sheet>
  );
}
