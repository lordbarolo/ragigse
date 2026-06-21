// Förprogrammerade frågor för Lönekoll v2.
// Användare kan ENDAST välja från denna meny — ingen fri text.

export type LonekollTopicId = 1 | 2 | 3 | 4;

export interface LonekollQuestion {
  id: string;
  label: string;
}

export interface LonekollTopic {
  id: LonekollTopicId;
  title: string;
  description: string;
  icon: string; // emoji or lucide name
  questions: LonekollQuestion[];
}

export const LONEKOLL_TOPICS: LonekollTopic[] = [
  {
    id: 1,
    title: "Ersättningsnivåer",
    description: "Vad du kan begära baserat på roll, ort och anställningsform.",
    icon: "💰",
    questions: [
      { id: "ranges", label: "Vad är spannet för min roll och zon?" },
      { id: "nearby", label: "Finns närliggande orter med högre ersättning?" },
      { id: "cost_factors", label: "Vilka kostnader sänker timpriset (resa, boende, intro, vite)?" },
      { id: "role_comparison", label: "Hur jämförs min roll mot närliggande roller?" },
    ],
  },
  {
    id: 2,
    title: "Avtalsinnehåll",
    description: "Vad ramavtalet säger om priser, krav, OB och vite.",
    icon: "📜",
    questions: [
      { id: "pricing", label: "Vilket pris gäller per roll och zon i ramavtalet?" },
      { id: "vendor_requirements", label: "Vilka krav ställs på leverantören (HOSP, CV, referenser)?" },
      { id: "ob_jour", label: "Hur regleras OB-tillägg och jourpass?" },
      { id: "vitesansvar", label: "Vad gäller för vitesansvar?" },
    ],
  },
  {
    id: 3,
    title: "Förhandling",
    description: "Konkreta argument och hur du hanterar motbud.",
    icon: "🤝",
    questions: [
      { id: "realistic_range", label: "Vilket spann är realistiskt att begära?" },
      { id: "arguments", label: "Vilka argument stärker min position?" },
      { id: "counteroffer", label: "Hur hanterar jag motbud?" },
      { id: "walk_away", label: "När bör jag tacka nej?" },
    ],
  },
  {
    id: 4,
    title: "Företag vs anställd",
    description: "Skillnader mellan att vara konsult via AB och anställd.",
    icon: "🏢",
    questions: [
      { id: "ab_vs_employee", label: "Vad lönar sig — AB eller anställd?" },
      { id: "vite_foretagare", label: "Vilket vitesansvar har jag som företagare?" },
      { id: "insurance_private", label: "Vilka försäkringar behöver jag hos privat vårdgivare?" },
      { id: "net_diff", label: "Vad blir nettoskillnaden konkret?" },
    ],
  },
];
