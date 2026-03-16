import { Prediction } from "./radarMockData";
import { Radio, Eye, MapPin, Building2, Clock } from "lucide-react";

const STATUS_CONFIG = {
  high: {
    label: "Hög sannolikhet snart",
    dotClass: "bg-accent",
    borderClass: "border-l-accent",
  },
  medium: {
    label: "Möjligt inom kort",
    dotClass: "bg-amber-400",
    borderClass: "border-l-amber-400",
  },
  watch: {
    label: "Bevaka framöver",
    dotClass: "bg-muted-foreground",
    borderClass: "border-l-muted-foreground",
  },
} as const;

interface PredictionCardProps {
  prediction: Prediction;
  onOpen: (prediction: Prediction) => void;
  onWatch: (prediction: Prediction) => void;
}

export default function PredictionCard({ prediction, onOpen, onWatch }: PredictionCardProps) {
  const cfg = STATUS_CONFIG[prediction.status];

  return (
    <div
      className={`bg-card border border-border ${cfg.borderClass} border-l-[3px] rounded-2xl p-4 space-y-3 transition-shadow hover:shadow-[var(--card-shadow-hover)]`}
    >
      {/* Status */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${cfg.dotClass} flex-shrink-0`} />
        <span className="text-[12px] font-medium tracking-wide text-muted-foreground uppercase">
          {cfg.label}
        </span>
      </div>

      {/* Buyer + competence */}
      <div>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mb-0.5">
          <Building2 className="w-3.5 h-3.5" />
          {prediction.buyer}
        </div>
        <h3 className="font-display text-[17px] font-bold tracking-tight text-foreground">
          {prediction.competence}
        </h3>
        <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground mt-0.5">
          <MapPin className="w-3.5 h-3.5" />
          {prediction.location}
        </div>
      </div>

      {/* Signals */}
      <div className="space-y-1.5 text-[13px] text-muted-foreground">
        <div className="flex items-center gap-2">
          <Radio className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span>{prediction.forecastWindow}</span>
        </div>
        <div className="flex items-center gap-2">
          <Clock className="w-3.5 h-3.5 text-primary flex-shrink-0" />
          <span>{prediction.historicalSignal}</span>
        </div>
        <div className="text-[12px] opacity-70">{prediction.lastActivity}</div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <button
          onClick={() => onOpen(prediction)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-border py-2 text-[13px] font-medium text-foreground transition-colors hover:bg-secondary"
        >
          <Eye className="w-3.5 h-3.5" />
          Visa mönster
        </button>
        <button
          onClick={() => onWatch(prediction)}
          className="flex-1 flex items-center justify-center gap-1.5 rounded-lg bg-primary text-primary-foreground py-2 text-[13px] font-semibold transition-colors hover:bg-primary/90"
        >
          <Radio className="w-3.5 h-3.5" />
          Bevaka
        </button>
      </div>
    </div>
  );
}
