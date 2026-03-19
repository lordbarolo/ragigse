export type PredictionStatus = "high" | "medium" | "watch";
export type ProbabilityLevel = 1 | 2 | 3;

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
  probabilityLevel: ProbabilityLevel;
  seasonalSignal: string | null;
  predictedDate: string | null;
  forecastWindow: string;
  historicalSignal: string;
  lastActivity: string;
  calloffCount: number;
  avgIntervalDays: number;
  summary: string;
  reasons: string[];
  history: HistoricalCalloff[];
}
