import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

const WORDS = ["legitimation", "tid", "ersättning"] as const;
const INTERVAL_MS = 2400;

/**
 * Roterar mellan tre ord i hero-rubriken.
 * Visar en sköld-ikon endast bredvid "legitimation" för att förstärka
 * det säkerhetsmässiga löftet utan att urvattna symboliken.
 */
export default function RotatingHeroWord() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = setInterval(() => setIndex((i) => (i + 1) % WORDS.length), INTERVAL_MS);
    return () => clearInterval(id);
  }, []);

  const current = WORDS[index];
  const isLegitimation = current === "legitimation";

  return (
    <span
      key={current}
      className="inline-flex items-baseline gap-2 text-primary animate-fade-in"
      aria-live="polite"
    >
      {current}
      {isLegitimation && (
        <ShieldCheck
          className="w-[0.7em] h-[0.7em] self-center text-primary shrink-0"
          aria-hidden="true"
        />
      )}
    </span>
  );
}
