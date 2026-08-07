/**
 * Auto-scrolling carousel showcasing CONSULTANT compensation (kr/h) for the 15
 * most popular survey roles (positions 6–20), broken down per zone 1, 2, 3.
 * Consultant rate = SKR ramavtal 2026 customer price − agency margin.
 *   - Läkare / ST-läkare:    12% margin (konsult behåller 88%)
 *   - Sjuksköterskor:        17% margin (konsult behåller 83%)
 * Pure presentation — no PII, no backend calls.
 */
import { useEffect, useState } from "react";

type RoleKind = "lakare" | "ssk";

const MARGIN: Record<RoleKind, number> = {
  lakare: 0.12,
  ssk: 0.17,
};

const ROLES: { name: string; short: string; kind: RoleKind; prices: [number, number, number] }[] = [
  { name: "Specialistsjuksköterska anestesi", short: "Anestesi-ssk", kind: "ssk", prices: [770, 824, 880] },
  { name: "Specialistsjuksköterska psykiatrisk vård", short: "Psyk-ssk", kind: "ssk", prices: [715, 770, 824] },
  { name: "Specialistsjuksköterska intensivvård", short: "IVA-ssk", kind: "ssk", prices: [770, 824, 880] },
  { name: "Specialistsjuksköterska ambulanssjukvård", short: "Ambulans-ssk", kind: "ssk", prices: [715, 770, 824] },
  { name: "Specialistsjuksköterska barn och ungdom", short: "Barn-ssk", kind: "ssk", prices: [715, 770, 824] },
  { name: "Specialistsjuksköterska operationssjukvård", short: "Operations-ssk", kind: "ssk", prices: [770, 824, 880] },
  { name: "Specialistläkare akutsjukvård", short: "Akutläkare", kind: "lakare", prices: [1238, 1513, 1787] },
  { name: "Legitimerad sjuksköterska", short: "Leg. ssk", kind: "ssk", prices: [616, 660, 715] },
  { name: "Specialistläkare anestesi och intensivvård", short: "Anestesiläkare", kind: "lakare", prices: [1238, 1513, 1787] },
  { name: "Specialistläkare internmedicin", short: "Internmedicin", kind: "lakare", prices: [1238, 1513, 1787] },
  { name: "Specialistläkare barn- och ungdomsmedicin", short: "Barnläkare", kind: "lakare", prices: [1238, 1513, 1787] },
  { name: "ST-läkare", short: "ST-läkare", kind: "lakare", prices: [847, 1040, 1233] },
  { name: "Specialistläkare psykiatri", short: "Psykiatriker", kind: "lakare", prices: [1457, 1678, 1953] },
  { name: "Specialistläkare geriatrik", short: "Geriatriker", kind: "lakare", prices: [1238, 1513, 1787] },
  { name: "Specialistsjuksköterska akutsjukvård", short: "Akut-ssk", kind: "ssk", prices: [715, 770, 824] },
];

const ZONE_LABELS = ["Zon 1", "Zon 2", "Zon 3"] as const;
const ZONE_HINTS = ["Storstad", "Mellanort", "Glesbygd"] as const;

interface Card {
  role: string;
  short: string;
  kind: RoleKind;
  zoneLabel: string;
  zoneHint: string;
  consultantRate: number;   // företagare (kundpris – marginal)
  employeeRate: number;   // löntagare bruttolön/h
  marginPct: number;
}

function roundTo5(n: number) {
  return Math.round(n / 5) * 5;
}

const EMPLOYER_FACTOR = 1.38;

const CARDS: Card[] = ROLES.flatMap((r) => {
  const margin = MARGIN[r.kind];
  return r.prices.map((p, i) => {
    const consultantRate = roundTo5(p * (1 - margin));
    return {
      role: r.name,
      short: r.short,
      kind: r.kind,
      zoneLabel: ZONE_LABELS[i],
      zoneHint: ZONE_HINTS[i],
      consultantRate,
      employeeRate: roundTo5(consultantRate / EMPLOYER_FACTOR),
      marginPct: Math.round(margin * 100),
    };
  });
});

function fmt(n: number) {
  return n.toLocaleString("sv-SE");
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const firstLetter = (s: string) => s.trim()[0]?.toLowerCase() ?? "";

/**
 * Bygger en sekvens som varvar läkare/sjuksköterska och undviker att två
 * intilliggande kort börjar på samma bokstav. Greedy: vid varje position
 * väljs den första kandidaten i motsatt grupp som inte krockar bokstavligt;
 * faller tillbaka till samma grupp om motsatt grupp är tom.
 */
function buildAlternating(cards: Card[], randomize = true): Card[] {
  const order = <T,>(a: T[]) => (randomize ? shuffle(a) : a);
  const lakare = order(cards.filter((c) => c.kind === "lakare"));
  const ssk = order(cards.filter((c) => c.kind === "ssk"));
  const pools: Record<RoleKind, Card[]> = { lakare, ssk };
  const result: Card[] = [];
  // Starta med den större gruppen så alternationen blir så jämn som möjligt.
  let next: RoleKind = ssk.length >= lakare.length ? "ssk" : "lakare";

  while (pools.lakare.length + pools.ssk.length > 0) {
    const primary = pools[next];
    const other = pools[next === "lakare" ? "ssk" : "lakare"];
    const prevLetter = result.length ? firstLetter(result[result.length - 1].short) : "";

    const pickFrom = (pool: Card[]): Card | null => {
      const idx = pool.findIndex((c) => firstLetter(c.short) !== prevLetter);
      if (idx === -1) return null;
      return pool.splice(idx, 1)[0];
    };

    let picked = primary.length ? pickFrom(primary) : null;
    if (!picked) picked = other.length ? pickFrom(other) : null;
    // Sista utvägen: ta vad som finns även om bokstaven krockar.
    if (!picked) picked = (primary.length ? primary : other).shift() ?? null;
    if (!picked) break;

    result.push(picked);
    next = picked.kind === "lakare" ? "ssk" : "lakare";
  }
  return result;
}

/**
 * Returns a copy of the list rotated by the smallest offset so that the
 * first element has a different role/kind/letter than the previous tail.
 */
function rotateUntilDifferent(cards: Card[], prev: Card): Card[] {
  const prevLetter = firstLetter(prev.short);
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].kind !== prev.kind && firstLetter(cards[i].short) !== prevLetter) {
      return [...cards.slice(i), ...cards.slice(0, i)];
    }
  }
  return [...cards];
}


function RoleCard({ card }: { card: Card }) {
  const handleClick = () => {
    const el = document.getElementById("analys");
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <div
      onClick={handleClick}
      className="shrink-0 w-[220px] md:w-[240px] rounded-xl border border-black/10 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(83,74,183,0.12)] hover:border-[#ffffff]/30 transition-all cursor-pointer"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-mono uppercase tracking-wider text-black/45">
          {card.zoneLabel}
        </span>
        <span className="text-[10px] text-black/35">{card.zoneHint}</span>
      </div>
      <div className="text-sm font-semibold text-black leading-snug min-h-[36px] font-sans">
        {card.short}
      </div>

      {/* Företagare */}
      <div className="mt-3">
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#ffffff]/80">
          Företagare
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-editorial text-2xl font-bold text-[#ffffff]">
            {fmt(card.consultantRate)}
          </span>
          <span className="text-xs text-black/50">kr/h</span>
        </div>
      </div>

      {/* Löntagare */}
      <div className="mt-2 pt-2 border-t border-black/[0.06]">
        <span className="text-[10px] font-medium uppercase tracking-wider text-black/40">
          Löntagare
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-editorial text-xl font-bold text-black/80">
            {fmt(card.employeeRate)}
          </span>
          <span className="text-xs text-black/40">kr/h</span>
        </div>
      </div>
    </div>
  );
}

function buildLoop(randomize: boolean): Card[] {
  const shuffled = randomize ? buildAlternating(CARDS) : buildAlternating(CARDS, false);
  const last = shuffled[shuffled.length - 1];
  const first = shuffled[0];
  const seamCollides =
    shuffled.length > 1 &&
    (last.kind === first.kind || firstLetter(last.short) === firstLetter(first.short));
  return seamCollides
    ? [...shuffled, ...rotateUntilDifferent(shuffled, last)]
    : [...shuffled, ...shuffled];
}

export default function RoleCarousel() {
  // SSR renderar en deterministisk ordning (undviker hydration mismatch);
  // slumpordningen sätts efter mount.
  const [loop, setLoop] = useState<Card[]>(() => buildLoop(false));
  useEffect(() => {
    setLoop(buildLoop(true));
  }, []);




  return (
    <section
      aria-label="Exempel på konsultersättning per yrke och zon"
      className="relative w-full overflow-hidden py-10 md:py-12 border-t border-black/[0.06]"
    >
      <div className="max-w-[1200px] mx-auto px-5 sm:px-6 lg:px-10 mb-6">
        <div className="flex items-baseline justify-between gap-4 flex-wrap">
          <div>
            <p className="text-[11px] font-mono uppercase tracking-wider text-black/45 mb-1">
              SKR ramavtal 2026 · Konsultersättning per zon
            </p>
            <h2 className="font-editorial text-xl md:text-2xl font-bold text-black">
              Vad konsulten faktiskt får
            </h2>
          </div>
          <p className="text-sm text-black/55 max-w-[380px]">
            Exempel från 15 av de mest sökta rollerna — kundpris och möjlig ersättning enligt ramavtal.
          </p>
        </div>
      </div>

      <div
        className="relative"
        style={{
          maskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
          WebkitMaskImage:
            "linear-gradient(to right, transparent, black 6%, black 94%, transparent)",
        }}
      >
        <div className="flex w-max gap-3 animate-marquee whitespace-nowrap will-change-transform">
          {loop.map((c, i) => (
            <RoleCard key={`${c.role}-${c.zoneLabel}-${i}`} card={c} />
          ))}
        </div>
      </div>

      <style>{`
        @keyframes marquee {
          from { transform: translateX(0); }
          to   { transform: translateX(-50%); }
        }
        .animate-marquee {
          /* 45 unika kort × 3s per kort = 135s för ett helt varv. */
          animation: marquee 135s linear infinite;
        }
        .animate-marquee:hover {
          animation-play-state: paused;
        }
        @media (prefers-reduced-motion: reduce) {
          .animate-marquee { animation: none; }
        }
      `}</style>
    </section>
  );
}
