export type PredictionStatus = "high" | "medium" | "watch";

export interface HistoricalCalloff {
  date: string;
  description: string;
}

export interface Prediction {
  id: string;
  buyer: string;
  competence: string;
  location: string;
  status: PredictionStatus;
  forecastWindow: string;
  historicalSignal: string;
  lastActivity: string;
  calloffCount: number;
  avgIntervalDays: number;
  summary: string;
  reasons: string[];
  history: HistoricalCalloff[];
}
