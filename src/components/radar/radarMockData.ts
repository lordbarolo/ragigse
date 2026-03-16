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

export const COMPETENCES = [
  "Sjuksköterska",
  "Specialistsjuksköterska",
  "Anestesisjuksköterska",
  "Intensivvårdssjuksköterska",
  "Barnmorska",
  "Röntgensjuksköterska",
  "Operationssjuksköterska",
  "AT-läkare",
  "ST-läkare",
  "Specialist i allmänmedicin",
];

export const LOCATIONS = [
  "Stockholm",
  "Göteborg",
  "Malmö",
  "Uppsala",
  "Umeå",
  "Sundsvall",
  "Luleå",
  "Jönköping",
  "Kalmar",
  "Gävle",
];

export const BUYERS = [
  "Region Stockholm",
  "Region Västra Götaland",
  "Region Skåne",
  "Region Uppsala",
  "Region Västerbotten",
  "Region Västernorrland",
  "Region Norrbotten",
  "Region Jönköping",
  "Region Kalmar",
  "Region Gävleborg",
];

export const MOCK_PREDICTIONS: Prediction[] = [
  {
    id: "pred-1",
    buyer: "Region Västerbotten",
    competence: "Anestesisjuksköterska",
    location: "Umeå",
    status: "high",
    forecastWindow: "Sannolikt inom 1–2 veckor",
    historicalSignal: "6 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 18 dagar sedan",
    calloffCount: 6,
    avgIntervalDays: 58,
    summary:
      "Den här typen av uppdrag har återkommit flera gånger historiskt och bedöms därför kunna komma igen inom kort.",
    reasons: [
      "Återkommande avrop hos samma beställare",
      "Genomsnittligt intervall: 58 dagar — nästa fönster öppnar snart",
      "Historiskt mönster under samma period föregående år",
    ],
    history: [
      { date: "2025-12-14", description: "Avrop anestesisjuksköterska, 8 veckor" },
      { date: "2025-10-02", description: "Avrop anestesisjuksköterska, 6 veckor" },
      { date: "2025-07-21", description: "Avrop anestesisjuksköterska, 10 veckor" },
      { date: "2025-05-11", description: "Avrop anestesisjuksköterska, 4 veckor" },
      { date: "2025-02-18", description: "Avrop anestesisjuksköterska, 8 veckor" },
      { date: "2024-11-30", description: "Avrop anestesisjuksköterska, 6 veckor" },
    ],
  },
  {
    id: "pred-2",
    buyer: "Region Stockholm",
    competence: "Specialistsjuksköterska",
    location: "Stockholm",
    status: "high",
    forecastWindow: "Sannolikt inom 1–3 veckor",
    historicalSignal: "9 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 12 dagar sedan",
    calloffCount: 9,
    avgIntervalDays: 40,
    summary:
      "Hög frekvens av liknande avrop hos Region Stockholm. Mönstret tyder på att ett nytt avrop kan komma inom kort.",
    reasons: [
      "9 avrop senaste året med kort intervall",
      "Genomsnittligt intervall: 40 dagar",
      "Senaste avropet var 12 dagar sedan",
    ],
    history: [
      { date: "2026-01-04", description: "Avrop specialistsjuksköterska, 6 veckor" },
      { date: "2025-11-22", description: "Avrop specialistsjuksköterska, 4 veckor" },
      { date: "2025-10-10", description: "Avrop specialistsjuksköterska, 8 veckor" },
      { date: "2025-08-28", description: "Avrop specialistsjuksköterska, 6 veckor" },
      { date: "2025-07-15", description: "Avrop specialistsjuksköterska, 4 veckor" },
    ],
  },
  {
    id: "pred-3",
    buyer: "Region Skåne",
    competence: "Barnmorska",
    location: "Malmö",
    status: "medium",
    forecastWindow: "Möjligt inom 3–5 veckor",
    historicalSignal: "4 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 35 dagar sedan",
    calloffCount: 4,
    avgIntervalDays: 90,
    summary:
      "Återkommande avrop med jämna mellanrum. Nästa fönster öppnar inom några veckor baserat på historiskt mönster.",
    reasons: [
      "Kvartalsvis mönster identifierat",
      "4 avrop senaste 12 månader",
      "Senaste avropet 35 dagar sedan",
    ],
    history: [
      { date: "2025-12-10", description: "Avrop barnmorska, 8 veckor" },
      { date: "2025-09-15", description: "Avrop barnmorska, 6 veckor" },
      { date: "2025-06-20", description: "Avrop barnmorska, 10 veckor" },
      { date: "2025-03-08", description: "Avrop barnmorska, 6 veckor" },
    ],
  },
  {
    id: "pred-4",
    buyer: "Region Västra Götaland",
    competence: "Intensivvårdssjuksköterska",
    location: "Göteborg",
    status: "medium",
    forecastWindow: "Möjligt inom 2–4 veckor",
    historicalSignal: "5 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 28 dagar sedan",
    calloffCount: 5,
    avgIntervalDays: 72,
    summary:
      "Region Västra Götaland har avropat intensivvårdssjuksköterskor flera gånger det senaste året.",
    reasons: [
      "5 avrop senaste 12 månader",
      "Genomsnittligt intervall: 72 dagar",
      "Historiskt mönster under vårperioden",
    ],
    history: [
      { date: "2025-12-20", description: "Avrop IVA-ssk, 6 veckor" },
      { date: "2025-10-08", description: "Avrop IVA-ssk, 8 veckor" },
      { date: "2025-07-25", description: "Avrop IVA-ssk, 4 veckor" },
      { date: "2025-05-10", description: "Avrop IVA-ssk, 6 veckor" },
      { date: "2025-02-28", description: "Avrop IVA-ssk, 8 veckor" },
    ],
  },
  {
    id: "pred-5",
    buyer: "Region Norrbotten",
    competence: "Röntgensjuksköterska",
    location: "Luleå",
    status: "watch",
    forecastWindow: "Bevaka kommande 6–8 veckor",
    historicalSignal: "2 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 74 dagar sedan",
    calloffCount: 2,
    avgIntervalDays: 180,
    summary:
      "Få men återkommande avrop. Mönstret tyder på halvårsvis efterfrågan.",
    reasons: [
      "2 avrop senaste 12 månader",
      "Halvårsvis mönster",
      "Nästa fönster uppskattas öppna om ca 6 veckor",
    ],
    history: [
      { date: "2025-10-02", description: "Avrop röntgensjuksköterska, 10 veckor" },
      { date: "2025-04-05", description: "Avrop röntgensjuksköterska, 8 veckor" },
    ],
  },
  {
    id: "pred-6",
    buyer: "Region Västernorrland",
    competence: "Operationssjuksköterska",
    location: "Sundsvall",
    status: "watch",
    forecastWindow: "Bevaka kommande 4–6 veckor",
    historicalSignal: "3 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 52 dagar sedan",
    calloffCount: 3,
    avgIntervalDays: 120,
    summary:
      "Regelbundna avrop med relativt långa intervall. Värt att bevaka.",
    reasons: [
      "3 avrop senaste 12 månader",
      "Intervall ca 4 månader",
      "Senaste avropet 52 dagar sedan",
    ],
    history: [
      { date: "2025-11-24", description: "Avrop operationssjuksköterska, 6 veckor" },
      { date: "2025-07-30", description: "Avrop operationssjuksköterska, 8 veckor" },
      { date: "2025-04-02", description: "Avrop operationssjuksköterska, 6 veckor" },
    ],
  },
  {
    id: "pred-7",
    buyer: "Region Uppsala",
    competence: "ST-läkare",
    location: "Uppsala",
    status: "high",
    forecastWindow: "Sannolikt inom 1–2 veckor",
    historicalSignal: "7 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 10 dagar sedan",
    calloffCount: 7,
    avgIntervalDays: 50,
    summary:
      "Hög frekvens av avrop. Kort intervall tyder på att nytt avrop kan komma mycket snart.",
    reasons: [
      "7 avrop senaste 12 månader",
      "Genomsnittligt intervall: 50 dagar",
      "Senaste avropet bara 10 dagar sedan",
    ],
    history: [
      { date: "2026-01-06", description: "Avrop ST-läkare, 4 veckor" },
      { date: "2025-11-15", description: "Avrop ST-läkare, 6 veckor" },
      { date: "2025-09-28", description: "Avrop ST-läkare, 8 veckor" },
      { date: "2025-08-05", description: "Avrop ST-läkare, 4 veckor" },
      { date: "2025-06-14", description: "Avrop ST-läkare, 6 veckor" },
    ],
  },
  {
    id: "pred-8",
    buyer: "Region Gävleborg",
    competence: "Sjuksköterska",
    location: "Gävle",
    status: "medium",
    forecastWindow: "Möjligt inom 3–4 veckor",
    historicalSignal: "4 liknande avrop senaste 12 månader",
    lastActivity: "Senaste avrop: 42 dagar sedan",
    calloffCount: 4,
    avgIntervalDays: 85,
    summary:
      "Regelbundna avrop av sjuksköterskor. Nästa avrop förväntas inom några veckor.",
    reasons: [
      "4 avrop senaste 12 månader",
      "Regelbundet mönster med ca 3 månaders intervall",
      "Senaste avropet 42 dagar sedan",
    ],
    history: [
      { date: "2025-12-04", description: "Avrop sjuksköterska, 6 veckor" },
      { date: "2025-09-10", description: "Avrop sjuksköterska, 8 veckor" },
      { date: "2025-06-18", description: "Avrop sjuksköterska, 4 veckor" },
      { date: "2025-03-22", description: "Avrop sjuksköterska, 6 veckor" },
    ],
  },
];
