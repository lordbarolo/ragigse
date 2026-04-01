import { Prediction } from "./radarMockData";
import { Eye, MapPin, Building2, Clock, Radio } from "lucide-react";

function ProbabilityBalls({ level }: { level: 1 | 2 | 3 }) {
  return (
    <div className="flex items-center gap-1" title={`Sannolikhet: ${level}/3`}>
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-3 h-3 rounded-full ${
            i <= level ? "bg-primary" : "bg-muted"
          }`}
        />
      ))}
      <span className="text-[11px] text-muted-foreground ml-1.5">
        {level === 3 ? "Hög sannolikhet" : level === 2 ? "Återkommande mönster" : "Historisk bas"}
      </span>
    </div>
  );
}

interface PredictionCardProps {
  prediction: Prediction;
  onOpen: (prediction: Prediction) => void;
  onWatch: (prediction: Prediction) => void;
}

export default function PredictionCard({ prediction, onOpen, onWatch }: PredictionCardProps) {
  return (
    <div className="bg-card border border-border rounded-2xl p-4 space-y-3 transition-shadow hover:shadow-[var(--card-shadow-hover)]">
      {/* Probability */}
      <ProbabilityBalls level={prediction.probabilityLevel} />

      {/* Seasonal signal */}
      {prediction.seasonalSignal && (
        <div className="text-[11px] text-accent font-medium bg-accent/10 border border-accent/20 rounded-lg px-2.5 py-1.5">
          🔄 {prediction.seasonalSignal}
        </div>
      )}

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
      </div>
    </div>
  );
}
