import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { buildTimeline, clamp, type Scene, type Timeline } from './motion';

/* ────────────────────────────────────────────────────────────────────────────
 * Typsnitt
 *
 * Designen är satt i Schibsted Grotesk + IBM Plex Mono. Startsidan laddar redan
 * Space Grotesk + IBM Plex Mono, så fallback-stacken landar mjukt även om
 * Google Fonts skulle vara blockerat. Länken injiceras en gång per dokument
 * och bara på klienten.
 * ──────────────────────────────────────────────────────────────────────────── */

export const FONT_SANS =
  "'Schibsted Grotesk','Space Grotesk','Inter','Helvetica Neue',Helvetica,Arial,sans-serif";
export const FONT_MONO =
  "'IBM Plex Mono','JetBrains Mono',ui-monospace,SFMono-Regular,Menlo,monospace";

const FONT_HREF =
  'https://fonts.googleapis.com/css2?family=Schibsted+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600;700&display=swap';

function ensureFonts() {
  if (typeof document === 'undefined') return;
  if (document.querySelector('link[data-vb-anim-fonts]')) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = FONT_HREF;
  link.setAttribute('data-vb-anim-fonts', '');
  document.head.appendChild(link);
}

/* ────────────────────────────────────────────────────────────────────────────
 * Klocka
 * ──────────────────────────────────────────────────────────────────────────── */

function useClock({
  total,
  loop,
  active,
  frozenAt,
}: {
  total: number;
  loop: boolean;
  active: boolean;
  frozenAt: number | null;
}) {
  // Server och första klientrendering ger alltid samma T → ingen hydration-mismatch.
  const [T, setT] = useState(() => frozenAt ?? 0);

  // Var vi var när vi senast pausade, så att återupptagning inte hoppar.
  const offsetRef = useRef(0);
  const latestRef = useRef(T);
  latestRef.current = T;

  useEffect(() => {
    if (frozenAt !== null) {
      setT(frozenAt);
      return;
    }
    if (!active) return;

    let raf = 0;
    let start: number | null = null;
    const from = offsetRef.current;

    const tick = (now: number) => {
      if (start === null) start = now;
      const elapsed = from + (now - start) / 1000;
      if (loop) {
        setT(total > 0 ? elapsed % total : 0);
      } else if (elapsed >= total) {
        setT(total);
        return;
      } else {
        setT(elapsed);
      }
      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      // Spara positionen inför nästa aktivering.
      offsetRef.current = latestRef.current;
    };
  }, [active, loop, total, frozenAt]);

  return T;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Synlighet: pausa utanför viewporten och i bakgrundsflikar
 * ──────────────────────────────────────────────────────────────────────────── */

function useInView<T extends Element>(ref: React.RefObject<T | null>) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setInView(e.isIntersecting);
      },
      { rootMargin: '120px 0px', threshold: 0.01 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [ref]);
  return inView;
}

function usePageVisible() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const onChange = () => setVisible(!document.hidden);
    onChange();
    document.addEventListener('visibilitychange', onChange);
    return () => document.removeEventListener('visibilitychange', onChange);
  }, []);
  return visible;
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    onChange();
    if (mq.addEventListener) {
      mq.addEventListener('change', onChange);
      return () => mq.removeEventListener('change', onChange);
    }
    // Safari < 14
    mq.addListener(onChange);
    return () => mq.removeListener(onChange);
  }, []);
  return reduced;
}

/* ────────────────────────────────────────────────────────────────────────────
 * Textremsor
 *
 * Renderas UTANFÖR den skalade scenen. I designen är de 26 px på en 1920 px bred
 * yta; här uttrycks samma storlek som 1.354cqw men med ett golv på 13 px, så att
 * de förblir läsbara även när scenen är 390 px bred på en telefon.
 * ──────────────────────────────────────────────────────────────────────────── */

const CAPTION_FADE = 0.18;

export type CaptionItem = { at: number; until?: number; text: string };

export type CaptionStyle = {
  /** Designstorlek i px vid 1920 px bredd. Standard 26. */
  size?: number;
  /** Minsta faktiska storlek i px. Standard 13. */
  minSize?: number;
  weight?: number | string;
  color?: string;
  /** Avstånd från underkant, i procent av scenens höjd. */
  bottom?: string;
};

export function Captions({
  T,
  items,
  fontFamily = FONT_SANS,
  size = 26,
  minSize = 13,
  weight = 600,
  color = '#f6f4ef',
  bottom = '7%',
  stageWidth = 1920,
}: {
  T: number;
  items: CaptionItem[];
  fontFamily?: string;
  stageWidth?: number;
} & CaptionStyle) {
  const sorted = useMemo(
    () => items.filter((i) => isFinite(i.at)).sort((a, b) => a.at - b.at),
    [items]
  );

  let active: CaptionItem | null = null;
  let end = Infinity;
  for (let i = 0; i < sorted.length; i++) {
    if (T < sorted[i].at) break;
    active = sorted[i];
    end =
      typeof active.until === 'number' && isFinite(active.until)
        ? active.until
        : i + 1 < sorted.length
          ? sorted[i + 1].at
          : Infinity;
  }
  if (!active || T >= end) return null;

  let o = Math.min(1, (T - active.at) / CAPTION_FADE);
  if (isFinite(end)) o = Math.min(o, (end - T) / CAPTION_FADE);
  o = clamp(o, 0, 1);

  const fluid = `${((size / stageWidth) * 100).toFixed(4)}cqw`;

  return (
    <div
      style={{
        position: 'absolute',
        left: '8%',
        right: '8%',
        bottom,
        textAlign: 'center',
        opacity: o,
        pointerEvents: 'none',
        fontFamily,
        fontWeight: weight,
        fontSize: `max(${minSize}px, ${fluid})`,
        lineHeight: 1.25,
        color,
        textWrap: 'balance',
      }}
    >
      {active.text}
    </div>
  );
}

/* ────────────────────────────────────────────────────────────────────────────
 * Scenen
 * ──────────────────────────────────────────────────────────────────────────── */

export type StageRenderArgs = {
  /** Aktuell tid i sekunder. */
  T: number;
  /** Scennamn → starttid i sekunder. */
  CUES: Record<string, number>;
  /** Total längd i sekunder. */
  AT: number;
};

export type AnimationStageProps = {
  scenes: Scene[];
  /** Scenens innehåll, ritat i designens koordinatsystem (1920×1080). */
  children: (args: StageRenderArgs) => ReactNode;
  /** Lager som INTE skalas — används för textremsor. */
  overlay?: (args: StageRenderArgs) => ReactNode;
  width?: number;
  height?: number;
  /** Bakgrund bakom scenen. */
  bg: string;
  /** Loopa (standard) eller spela en gång och frysa på sista bilden. */
  loop?: boolean;
  /**
   * Tiden (sek) som visas som stillbild vid `prefers-reduced-motion: reduce`
   * eller när `paused` är satt.
   */
  posterTime?: number;
  /** Tvinga stillbild. */
  paused?: boolean;
  /** Skärmläsartext. Utelämnas den markeras scenen som dekorativ. */
  ariaLabel?: string;
  className?: string;
  style?: CSSProperties;
  radius?: number | string;
};

export function AnimationStage({
  scenes,
  children,
  overlay,
  width = 1920,
  height = 1080,
  bg,
  loop = true,
  posterTime,
  paused = false,
  ariaLabel,
  className,
  style,
  radius = 0,
}: AnimationStageProps) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const { CUES, total }: Timeline = useMemo(() => buildTimeline(scenes), [scenes]);

  const inView = useInView(wrapRef);
  const pageVisible = usePageVisible();
  const reduced = useReducedMotion();

  const poster = posterTime ?? Math.max(0, total - 2.2);
  const frozenAt = reduced || paused ? poster : null;
  const active = inView && pageVisible && frozenAt === null;

  const T = useClock({ total, loop, active, frozenAt });

  /**
   * Skalning: designen är ritad i 1920×1080 och skalas proportionellt till
   * containerns bredd. Mätningen sker i useLayoutEffect (före målning), så
   * användaren ser aldrig en oskalad bildruta. Fram till mätningen hålls scenen
   * dold — ramen har redan rätt proportioner, så ingen layoutförskjutning sker.
   */
  const [scale, setScale] = useState<number | null>(null);
  const applyScale = useCallback(() => {
    const el = wrapRef.current;
    if (!el) return;
    const w = el.clientWidth;
    if (w > 0) setScale(w / width);
  }, [width]);

  useLayoutEffect(() => {
    ensureFonts();
    applyScale();
    const el = wrapRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(applyScale);
    ro.observe(el);
    return () => ro.disconnect();
  }, [applyScale]);

  const args: StageRenderArgs = { T, CUES, AT: total };

  return (
    <div
      ref={wrapRef}
      className={className}
      role={ariaLabel ? 'img' : undefined}
      aria-label={ariaLabel}
      aria-hidden={ariaLabel ? undefined : true}
      style={{
        position: 'relative',
        width: '100%',
        aspectRatio: `${width} / ${height}`,
        overflow: 'hidden',
        background: bg,
        borderRadius: radius,
        containerType: 'inline-size',
        ...style,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width,
          height,
          transformOrigin: '0 0',
          transform: scale === null ? undefined : `scale(${scale})`,
          visibility: scale === null ? 'hidden' : 'visible',
          willChange: 'transform',
          // ── Stilbrandvägg ──────────────────────────────────────────────
          // Scenen är ritad i en miljö utan CSS-reset (radavstånd `normal`).
          // Värdsidan sätter globalt `line-height: 1.5` via Tailwinds preflight,
          // vilket annars gör varje textblock ~25 % högre och får innehållet i
          // korten med fast höjd att svämma över. Vi nollställer de ärvda
          // egenskaperna som påverkar textmått så att scenen ser likadan ut
          // oavsett vilken sida den läggs på.
          lineHeight: 'normal',
          letterSpacing: 'normal',
          wordSpacing: 'normal',
          fontStyle: 'normal',
          fontWeight: 400,
          textAlign: 'left',
          textTransform: 'none',
          textIndent: 0,
          whiteSpace: 'normal',
          wordBreak: 'normal',
          overflowWrap: 'normal',
          hyphens: 'none',
          fontVariant: 'normal',
        }}
      >
        {children(args)}
      </div>
      {overlay ? overlay(args) : null}
    </div>
  );
}
