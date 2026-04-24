import { useEffect, useState } from "react";
import { ShieldCheck } from "lucide-react";

/**
 * Roterar mellan tre ord i hero-rubriken med typewriter-effekt.
 * Varje ord skrivs ut tecken för tecken (vänster → höger) under en
 * specificerad varaktighet, hålls kvar en kort stund, försvinner och
 * sedan börjar nästa ord. Sköld-ikonen visas endast efter "legitimation".
 */
const WORDS = [
  { text: "tid", durationMs: 1000 },
  { text: "ersättning", durationMs: 2000 },
  { text: "legitimation", durationMs: 3000 },
] as const;

const HOLD_MS = 700; // håll fullständigt ord kvar innan det försvinner
const GAP_MS = 200;  // kort paus mellan ord

export default function RotatingHeroWord() {
  const [index, setIndex] = useState(0);
  const [typed, setTyped] = useState("");

  useEffect(() => {
    const word = WORDS[index];
    const stepMs = word.durationMs / word.text.length;
    let charIndex = 0;
    setTyped("");

    const typeId = setInterval(() => {
      charIndex += 1;
      setTyped(word.text.slice(0, charIndex));
      if (charIndex >= word.text.length) {
        clearInterval(typeId);
      }
    }, stepMs);

    const totalBeforeNext = word.durationMs + HOLD_MS + GAP_MS;
    const nextId = setTimeout(() => {
      setIndex((i) => (i + 1) % WORDS.length);
    }, totalBeforeNext);

    return () => {
      clearInterval(typeId);
      clearTimeout(nextId);
    };
  }, [index]);

  const current = WORDS[index];
  const isLegitimation = current.text === "legitimation";
  const isComplete = typed.length === current.text.length;

  return (
    <span
      className="inline-flex items-baseline gap-2 text-primary"
      aria-live="polite"
    >
      <span className="whitespace-pre">
        {typed}
        <span
          className="inline-block w-[0.06em] h-[0.9em] align-baseline bg-primary ml-[0.05em] animate-pulse"
          aria-hidden="true"
        />
      </span>
      {isLegitimation && isComplete && (
        <ShieldCheck
          className="w-[0.7em] h-[0.7em] self-center text-primary shrink-0 animate-fade-in"
          aria-hidden="true"
        />
      )}
    </span>
  );
}
