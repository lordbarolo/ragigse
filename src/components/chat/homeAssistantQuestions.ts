/**
 * Fasta frågor för startsidans assistent (utloggat läge).
 *
 * Designprincip: användaren väljer ett fråge-ID — ingen fritext skickas till
 * någon modell från klienten. Pris- och zonfrågor besvaras deterministiskt ur
 * publika ramavtalsdata (ingen LLM, ingen kostnad, samma marginalmodell som
 * resten av appen). Avropsfrågan går via edge-funktionen `home-assistant`,
 * som läser avropshistoriken med service-role.
 */

import { supabase } from "@/integrations/supabase/client";
import { EMPLOYER_FACTOR, getMarginShares } from "@/lib/calc";
import {
  buildRateCards,
  fetchActiveContractRates,
  formatRate,
  toRateCard,
  type ContractRate,
} from "@/lib/homeRates";

export type HomeQuestionId =
  | "region_rate"
  | "after_margin"
  | "zone_diff"
  | "recent_calloffs"
  | "framework_scope"
  | "employment_form"
  | "data_needed";

export interface HomeQuestion {
  id: HomeQuestionId;
  label: string;
  /** Sista chippet spänner över båda kolumnerna i designen. */
  fullWidth?: boolean;
}

export const HOME_QUESTIONS: HomeQuestion[] = [
  { id: "region_rate", label: "Vad betalar regionen för min roll?" },
  { id: "after_margin", label: "Vad kan jag fakturera efter bolagets marginal?" },
  { id: "zone_diff", label: "Hur skiljer sig priset mellan zonerna?" },
  { id: "recent_calloffs", label: "Vilka avrop har publicerats senaste 30 dagarna?" },
  { id: "framework_scope", label: "Vad ingår i SKR:s ramavtal — och vad ingår inte?" },
  { id: "employment_form", label: "Hur påverkar anställningsform min ersättning?" },
  { id: "data_needed", label: "Vilka uppgifter behöver ni om mig?", fullWidth: true },
];

export interface HomeAnswerCta {
  label: string;
  to: string;
}

export interface HomeAnswer {
  /** Ett stycke per element. */
  paragraphs: string[];
  /** Källhänvisning som visas under svaret. */
  source: string;
  cta?: HomeAnswerCta;
}

const SIGNUP_CTA: HomeAnswerCta = {
  label: "Skapa konto för din exakta nivå",
  to: "/registrera",
};

/** Plockar ut några representativa exempel att citera i svaret. */
function sampleRoles(rates: ContractRate[], count: number) {
  return buildRateCards(rates, count);
}

async function answerRegionRate(): Promise<HomeAnswer> {
  const rates = await fetchActiveContractRates();
  const cards = sampleRoles(rates, 3);

  if (cards.length === 0) {
    return {
      paragraphs: [
        "Jag hittar inga aktiva ramavtalspriser just nu. Det beror på att avtalsversionen håller på att uppdateras.",
      ],
      source: "SKR:s ramavtal · ingen aktiv version hittad",
    };
  }

  const examples = cards
    .map((c) => `${c.role} (${c.zone}): ${formatRate(c.customerRate)} kr/h till bemanningsbolaget`)
    .join(". ");

  return {
    paragraphs: [
      `Regionen betalar enligt SKR:s ramavtal, och priset styrs av din roll och vilken zon uppdraget ligger i. Exempel ur aktuell avtalsversion: ${examples}.`,
      "Det är kundpriset — alltså vad regionen betalar bemanningsbolaget, inte vad du får. Vill du se exakt vad som gäller för just din roll och ort behöver jag veta vilka de är.",
    ],
    source: `SKR:s ramavtal · ${cards.length} av ${new Set(rates.map((r) => r.yrkeskategori)).size} roller visade`,
    cta: SIGNUP_CTA,
  };
}

async function answerAfterMargin(): Promise<HomeAnswer> {
  const rates = await fetchActiveContractRates();
  const cards = sampleRoles(rates, 2);

  if (cards.length === 0) {
    return {
      paragraphs: [
        "Jag kan inte räkna fram ett exempel just nu eftersom det saknas aktiva ramavtalspriser.",
      ],
      source: "SKR:s ramavtal · ingen aktiv version hittad",
    };
  }

  const [first] = cards;
  const shares = getMarginShares(first.role);

  const examples = cards
    .map((c) => `${c.role}: ${formatRate(c.customerRate)} kr/h in, ca ${formatRate(c.foretagare)} kr/h till dig`)
    .join(". ");

  return {
    paragraphs: [
      `Bemanningsbolaget behåller en marginal på kundpriset. För specialistläkare ligger den typiskt på 10–15 %, för sjuksköterskor och övriga roller på 15–20 %.`,
      `Räknat på aktuella avtalspriser: ${examples}. För ${first.role} innebär marginalen ${shares.margin_text} att du som företagare fakturerar ungefär ${formatRate(first.foretagare)} kr/h.`,
    ],
    source: "SKR:s ramavtal · marginalmodell 10–15 % läkare, 15–20 % övriga",
    cta: SIGNUP_CTA,
  };
}

async function answerZoneDiff(): Promise<HomeAnswer> {
  const rates = await fetchActiveContractRates();

  // Välj den roll som har flest zoner representerade — tydligast exempel.
  const byRole = new Map<string, ContractRate[]>();
  for (const rate of rates) {
    const rows = byRole.get(rate.yrkeskategori);
    if (rows) rows.push(rate);
    else byRole.set(rate.yrkeskategori, [rate]);
  }

  const best = [...byRole.entries()].sort((a, b) => b[1].length - a[1].length)[0];

  if (!best || best[1].length < 2) {
    return {
      paragraphs: [
        "Jag har inte tillräckligt med zondata för att visa en jämförelse just nu.",
      ],
      source: "SKR:s ramavtal · zondata saknas",
    };
  }

  const [role, rows] = best;
  const sorted = [...rows].sort((a, b) => a.zon.localeCompare(b.zon, "sv"));
  const spread = sorted
    .map((r) => `${r.zon}: ${formatRate(toRateCard(r).foretagare)} kr/h`)
    .join(" · ");

  const lowest = Math.min(...sorted.map((r) => toRateCard(r).foretagare));
  const highest = Math.max(...sorted.map((r) => toRateCard(r).foretagare));
  const diff = highest - lowest;

  return {
    paragraphs: [
      "Zonerna speglar hur svårbemannad en ort är — ju längre från storstad, desto högre ersättning. Samma roll kan alltså betala olika mycket beroende på var uppdraget ligger.",
      `För ${role} ser det ut så här efter marginal: ${spread}. Skillnaden mellan lägsta och högsta zon är ${formatRate(diff)} kr/h.`,
    ],
    source: `SKR:s ramavtal · ${role}, ${sorted.length} zoner`,
    cta: SIGNUP_CTA,
  };
}

async function answerEmploymentForm(): Promise<HomeAnswer> {
  const rates = await fetchActiveContractRates();
  const cards = sampleRoles(rates, 1);

  if (cards.length === 0) {
    return {
      paragraphs: [
        "Jag kan inte räkna fram ett exempel just nu eftersom det saknas aktiva ramavtalspriser.",
      ],
      source: "SKR:s ramavtal · ingen aktiv version hittad",
    };
  }

  const [c] = cards;

  return {
    paragraphs: [
      "Anställningsformen ändrar inte vad regionen betalar — den ändrar hur mycket av beloppet som når dig. Som företagare fakturerar du hela beloppet efter bemanningsbolagets marginal. Som anställd ska samma belopp också täcka arbetsgivaravgifter, pension och försäkringar.",
      `Exempel för ${c.role} (${c.zone}): ca ${formatRate(c.foretagare)} kr/h som företagare motsvarar ungefär ${formatRate(c.lontagare)} kr/h i timlön som anställd, eftersom arbetsgivarkostnaden är ungefär ${EMPLOYER_FACTOR.toFixed(2).replace(".", ",")} gånger bruttolönen.`,
    ],
    source: "SKR:s ramavtal · arbetsgivarkostnad 31,42 % avgift + ITP1 + löneskatt + AFA",
    cta: SIGNUP_CTA,
  };
}

function answerFrameworkScope(): HomeAnswer {
  return {
    paragraphs: [
      "Ramavtalet reglerar takpriser per roll och zon, kraven på leverantören (legitimation, HOSP-kontroll, CV och referenser) samt hur OB, jour och vitesansvar hanteras. Det är alltså både en prislista och ett regelverk.",
      "Det som inte ingår är din individuella förhandling: restid, boende, introduktionspass och exakt uppdragslängd avtalas mellan dig och bemanningsbolaget, och det är där skillnaderna mellan två till synes lika uppdrag oftast uppstår.",
    ],
    source: "SKR:s ramavtal vårdbemanning 2026 · avtalsbilaga",
  };
}

function answerDataNeeded(): HomeAnswer {
  return {
    paragraphs: [
      "För att svara på din specifika situation behöver jag fyra uppgifter: roll, ort, anställningsform och din nuvarande ersättning. De används för att ställa dina villkor mot marknaden — inget annat.",
      "Uppgifterna lagras inom EU och delas aldrig med bemanningsbolag eller regioner. Du kan när som helst radera ditt konto och all tillhörande data.",
    ],
    source: "Integritetspolicy · data lagras inom EU",
    cta: { label: "Läs integritetspolicyn", to: "/integritetspolicy" },
  };
}

async function answerRecentCalloffs(): Promise<HomeAnswer> {
  const { data, error } = await supabase.functions.invoke("home-assistant", {
    body: { question_id: "recent_calloffs" },
  });

  if (error) throw new Error(error.message ?? "Kunde inte hämta avropsdata.");

  const payload = data as { paragraphs?: string[]; source?: string } | null;
  if (!payload?.paragraphs?.length) {
    throw new Error("Tomt svar från avropstjänsten.");
  }

  return {
    paragraphs: payload.paragraphs,
    source: payload.source ?? "Avropsdata",
    cta: SIGNUP_CTA,
  };
}

/**
 * Löser ut svaret för ett fråge-ID.
 * Kastar vid fel — anropande komponent visar då ett synligt feltillstånd
 * med möjlighet att försöka igen.
 */
export async function resolveHomeAnswer(id: HomeQuestionId): Promise<HomeAnswer> {
  switch (id) {
    case "region_rate":
      return answerRegionRate();
    case "after_margin":
      return answerAfterMargin();
    case "zone_diff":
      return answerZoneDiff();
    case "employment_form":
      return answerEmploymentForm();
    case "recent_calloffs":
      return answerRecentCalloffs();
    case "framework_scope":
      return answerFrameworkScope();
    case "data_needed":
      return answerDataNeeded();
  }
}
