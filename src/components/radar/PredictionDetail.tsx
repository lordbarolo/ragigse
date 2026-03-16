import { Prediction } from "./radarMockData";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Building2, MapPin, Clock, Radio, Info, CheckCircle2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

const READINESS_ITEMS = [
  "CV uppdaterat",
  "Legitimation redo",
  "Referenser redo",
  "Tillgänglighet uppdaterad",
];

interface PredictionDetailProps {
  prediction: Prediction | null;
  open: boolean;
  onClose: () => void;
}

export default function PredictionDetail({ prediction, open, onClose }: PredictionDetailProps) {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const { toast } = useToast();

  if (!prediction) return null;

  const handleWatch = () => {
    toast({
      title: "Bevakning skapad",
      description: `Du bevakar nu ${prediction.competence} i ${prediction.location}.`,
    });
  };

  const toggleCheck = (item: string) => {
    setChecked((prev) => ({ ...prev, [item]: !prev[item] }));
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent side="bottom" className="max-h-[90dvh] overflow-y-auto rounded-t-2xl bg-background border-border px-5 pb-8">
        <SheetHeader className="text-left pb-4">
          <SheetTitle className="font-display text-lg font-bold text-foreground">
            {prediction.competence}
          </SheetTitle>
          <div className="flex flex-wrap gap-3 text-[13px] text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Building2 className="w-3.5 h-3.5" />
              {prediction.buyer}
            </span>
            <span className="flex items-center gap-1.5">
              <MapPin className="w-3.5 h-3.5" />
              {prediction.location}
            </span>
          </div>
        </SheetHeader>

        {/* Summary */}
        <p className="text-[14px] leading-relaxed text-foreground/80 mb-5">
          {prediction.summary}
        </p>

        {/* Signals */}
        <section className="mb-5">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2">
            Historiska signaler
          </h4>
          <div className="space-y-2 text-[13px] text-foreground/80">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{prediction.calloffCount} liknande avrop senaste 12 månader</span>
            </div>
            <div className="flex items-center gap-2">
              <Radio className="w-4 h-4 text-primary flex-shrink-0" />
              <span>Genomsnittligt intervall: {prediction.avgIntervalDays} dagar</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-primary flex-shrink-0" />
              <span>{prediction.lastActivity}</span>
            </div>
          </div>
        </section>

        {/* Timeline */}
        <section className="mb-5">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Tidslinje
          </h4>
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

        {/* Why */}
        <section className="mb-5">
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5" />
            Varför visas detta?
          </h4>
          <ul className="space-y-1.5 text-[13px] text-foreground/70">
            {prediction.reasons.map((r, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-primary mt-2 flex-shrink-0" />
                {r}
              </li>
            ))}
          </ul>
        </section>

        {/* Watch CTA */}
        <button
          onClick={handleWatch}
          className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground py-3 text-[14px] font-semibold transition-colors hover:bg-primary/90 mb-6"
        >
          <Radio className="w-4 h-4" />
          Bevaka denna kombination
        </button>

        {/* Readiness */}
        <section>
          <h4 className="text-[12px] font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Var redo om uppdraget kommer
          </h4>
          <div className="space-y-2">
            {READINESS_ITEMS.map((item) => (
              <button
                key={item}
                onClick={() => toggleCheck(item)}
                className="flex items-center gap-3 w-full text-left rounded-lg border border-border px-3.5 py-2.5 transition-colors hover:bg-secondary"
              >
                <CheckCircle2
                  className={`w-4.5 h-4.5 flex-shrink-0 transition-colors ${
                    checked[item] ? "text-accent" : "text-muted-foreground/40"
                  }`}
                />
                <span className={`text-[13px] ${checked[item] ? "text-foreground" : "text-muted-foreground"}`}>
                  {item}
                </span>
              </button>
            ))}
          </div>
        </section>
      </SheetContent>
    </Sheet>
  );
}
