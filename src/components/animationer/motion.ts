/**
 * Liten, självständig tidslinjemotor för vårdbemanning.ai:s landningsanimationer.
 *
 * Ersätter designverktygets runtime (animations-v3.jsx). Inga globala variabler,
 * inga externa beroenden, SSR-säker (rör aldrig window/document).
 *
 * Easing-funktionerna är identiska med originalens så att rörelsen blir exakt
 * densamma som i handoff-designen.
 */

export const Easing = {
  linear: (t: number) => t,
  easeInQuad: (t: number) => t * t,
  easeOutQuad: (t: number) => t * (2 - t),
  easeInOutQuad: (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => (t -= 1) * t * t + 1,
  easeInOutCubic: (t: number) =>
    t < 0.5 ? 4 * t * t * t : (t - 1) * (2 * t - 2) * (2 * t - 2) + 1,
  easeInQuart: (t: number) => t * t * t * t,
  easeOutQuart: (t: number) => 1 - (t -= 1) * t * t * t,
  easeOutExpo: (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
  easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
  easeOutBack: (t: number) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
} as const;

export type EaseFn = (t: number) => number;

export const clamp = (v: number, min: number, max: number) =>
  Math.max(min, Math.min(max, v));

/** Normaliserad progress 0→1 för ett segment som startar på `s` och varar `d`. */
export const P = (T: number, s: number, d: number) => clamp((T - s) / d, 0, 1);

export const lerp = (a: number, b: number, p: number) => a + (b - a) * p;

/** interpolate([0,.5,1], [0,100,50], ease)(t) — Popmotion-stil. */
export function interpolate(
  input: number[],
  output: number[],
  ease: EaseFn | EaseFn[] = Easing.linear
) {
  return (t: number) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        const easeFn = Array.isArray(ease) ? ease[i] || Easing.linear : ease;
        return output[i] + (output[i + 1] - output[i]) * easeFn(local);
      }
    }
    return output[output.length - 1];
  };
}

/** animate({from,to,start,end,ease})(t) — enkel tween med clamp i båda ändar. */
export function animate({
  from = 0,
  to = 1,
  start = 0,
  end = 1,
  ease = Easing.easeInOutCubic,
}: {
  from?: number;
  to?: number;
  start?: number;
  end?: number;
  ease?: EaseFn;
}) {
  return (t: number) => {
    if (t <= start) return from;
    if (t >= end) return to;
    return from + (to - from) * ease((t - start) / (end - start));
  };
}

/** Rörelseprimitiv som scenerna delar. */
export const MOTION = {
  enter: (T: number, s: number, d = 0.6) => {
    const e = Easing.easeOutCubic(P(T, s, d));
    return {
      opacity: e,
      transform: 'translateY(' + (1 - e) * 26 + 'px)',
    } as const;
  },
  pop: (T: number, s: number, d = 0.55) => {
    const p = P(T, s, d);
    return {
      opacity: clamp(p * 2.5, 0, 1),
      transform: 'scale(' + (0.72 + 0.28 * Easing.easeOutBack(p)) + ')',
    } as const;
  },
  draw: (T: number, s: number, d = 1) => Easing.easeInOutCubic(P(T, s, d)),
};

/**
 * Svensk tusentalsformatering utan Intl.
 *
 * Avsiktligt handskriven: `toLocaleString('sv-SE')` kan ge olika mellanslagstecken
 * i Node (server) och i webbläsaren (klient), vilket ger hydration-mismatch i
 * TanStack Start. Vi låser separatorn till U+00A0 (hårt mellanslag) i båda miljöer.
 *
 * VIKTIGT: tecknet i strängen nedan MÅSTE vara U+00A0 (no-break space), skrivet
 * som escape-sekvensen \u00A0 — skriv den exakt så, konvertera den inte till ett
 * vanligt mellanslag.
 */
export function fmt(n: number): string {
  const v = Math.round(n);
  const neg = v < 0;
  const s = String(Math.abs(v));
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (i > 0 && (s.length - i) % 3 === 0) out += '\u00A0';
    out += s[i];
  }
  return (neg ? '-' : '') + out;
}

/**
 * Färg + alpha → rgba().
 *
 * Robustare än att konkatenera hex-suffix (`accent + '22'`), som tyst ger
 * ogiltig CSS om accentfärgen skickas in som rgb()/hsl()/namngiven färg.
 */
export function withAlpha(color: string, alpha: number): string {
  const a = clamp(alpha, 0, 1);
  const c = color.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(c);
  if (hex) {
    let h = hex[1];
    if (h.length === 3 || h.length === 4) {
      h = h
        .split('')
        .map((ch) => ch + ch)
        .join('');
    }
    const r = parseInt(h.slice(0, 2), 16);
    const g = parseInt(h.slice(2, 4), 16);
    const b = parseInt(h.slice(4, 6), 16);
    const baseA = h.length === 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return `rgba(${r}, ${g}, ${b}, ${+(baseA * a).toFixed(4)})`;
  }
  // rgb()/rgba() → byt ut alfakanalen
  const rgb = /^rgba?\(([^)]+)\)$/i.exec(c);
  if (rgb) {
    const parts = rgb[1].split(/[\s,/]+/).filter(Boolean);
    if (parts.length >= 3) {
      return `rgba(${parts[0]}, ${parts[1]}, ${parts[2]}, ${a})`;
    }
  }
  // Okänt format (hsl, namngiven färg) — låt CSS color-mix sköta det.
  return `color-mix(in srgb, ${c} ${Math.round(a * 100)}%, transparent)`;
}

/** En scen (beat) i tidslinjen. */
export type Scene = { name: string; dur: number };

export type Timeline = {
  /** Cue-tabell: scennamn → starttid i sekunder. */
  CUES: Record<string, number>;
  /** Total längd i sekunder. */
  total: number;
};

export function buildTimeline(scenes: Scene[]): Timeline {
  const CUES: Record<string, number> = {};
  let acc = 0;
  for (const s of scenes) {
    if (!(s.name in CUES)) CUES[s.name] = Math.round(acc * 1000) / 1000;
    acc += s.dur;
  }
  return { CUES, total: Math.round(acc * 1000) / 1000 };
}
