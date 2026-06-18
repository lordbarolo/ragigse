/**
 * Auto-scrolling carousel showcasing CONSULTANT compensation (kr/h) for the 15
 * most popular survey roles (positions 6–20), broken down per zone 1, 2, 3.
 * Consultant rate = SKR ramavtal 2026 customer price − agency margin.
 *   - Läkare / ST-läkare:    12% margin (konsult behåller 88%)
 *   - Sjuksköterskor:        17% margin (konsult behåller 83%)
 * Pure presentation — no PII, no backend calls.
 */

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
  zoneLabel: string;
  zoneHint: string;
  consultantRate: number;   // företagare (kundpris – marginal)
  employeeRate: number;   // löntagare bruttolön/h
  marginPct: number;
}

function roundTo5(n: number) {
  return Math.round(n / 5) * 5;
}

const EMPLOYER_FACTOR = 1.42;

const CARDS: Card[] = ROLES.flatMap((r) => {
  const margin = MARGIN[r.kind];
  return r.prices.map((p, i) => {
    const consultantRate = roundTo5(p * (1 - margin));
    return {
      role: r.name,
      short: r.short,
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

/**
 * Fisher–Yates shuffle, then a greedy pass that swaps any element which
 * would otherwise sit next to another card with the same `role`. Falls back
 * to the shuffled order if no valid swap exists (extremely unlikely with
 * 45 cards × 15 roles).
 */
function shuffleNoAdjacentRole(cards: Card[]): Card[] {
  const arr = [...cards];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  for (let i = 1; i < arr.length; i++) {
    if (arr[i].role !== arr[i - 1].role) continue;
    for (let k = i + 1; k < arr.length; k++) {
      if (arr[k].role !== arr[i - 1].role && (i + 1 >= arr.length || arr[k].role !== arr[i + 1].role)) {
        [arr[i], arr[k]] = [arr[k], arr[i]];
        break;
      }
    }
  }
  return arr;
}

/**
 * Returns a copy of the list rotated by the smallest offset so that the
 * first element has a different role than `prevRole`.
 */
function rotateUntilDifferent(cards: Card[], prevRole: string): Card[] {
  for (let i = 0; i < cards.length; i++) {
    if (cards[i].role !== prevRole) {
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
      className="shrink-0 w-[220px] md:w-[240px] rounded-xl border border-black/10 bg-white p-4 shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-[0_6px_20px_rgba(83,74,183,0.12)] hover:border-[#534AB7]/30 transition-all cursor-pointer"
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
        <span className="text-[10px] font-medium uppercase tracking-wider text-[#534AB7]/80">
          Företagare
        </span>
        <div className="flex items-baseline gap-1">
          <span className="font-editorial text-2xl font-bold text-[#534AB7]">
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

export default function RoleCarousel() {
  // Shuffle so cards appear in random order, but never two cards with the
  // same role back-to-back. Duplicate for seamless marquee, also avoiding
  // a same-role collision at the loop seam.
  const shuffled = shuffleNoAdjacentRole(CARDS);
  const loop =
    shuffled.length > 1 && shuffled[0].role === shuffled[shuffled.length - 1].role
      ? [...shuffled, ...rotateUntilDifferent(shuffled, shuffled[shuffled.length - 1].role)]
      : [...shuffled, ...shuffled];

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
            Exempel från 15 av de mest sökta rollerna — kundpris minus typisk bemanningsmarginal (12% läkare · 17% sjuksköterskor).
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
