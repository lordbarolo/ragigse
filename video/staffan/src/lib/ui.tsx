import React, { useId } from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { E, lerp, mulberry32, seg } from './motion';

// ── Bakgrund: bläck + två långsamt drivande ljuskällor + punktnät + korn ─────────
export const Background: React.FC<{ glow?: number }> = ({ glow = 1 }) => {
  const f = useCurrentFrame();
  const a = f / 30;
  const x1 = 760 + Math.sin(a * 0.35) * 90;
  const y1 = 420 + Math.cos(a * 0.27) * 80;
  const x2 = 260 + Math.cos(a * 0.31) * 80;
  const y2 = 1520 + Math.sin(a * 0.22) * 90;
  return (
    <AbsoluteFill style={{ background: C.bg, overflow: 'hidden' }}>
      <div
        style={{
          position: 'absolute',
          left: x1 - 700,
          top: y1 - 700,
          width: 1400,
          height: 1400,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(92,242,196,0.16) 0%, rgba(92,242,196,0.05) 38%, rgba(0,0,0,0) 68%)',
          opacity: glow,
        }}
      />
      <div
        style={{
          position: 'absolute',
          left: x2 - 800,
          top: y2 - 800,
          width: 1600,
          height: 1600,
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(70,120,255,0.13) 0%, rgba(70,120,255,0.04) 40%, rgba(0,0,0,0) 70%)',
          opacity: glow,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(rgba(243,239,231,0.10) 1.4px, transparent 1.6px)',
          backgroundSize: '54px 54px',
          backgroundPosition: '0px 0px',
          WebkitMaskImage: 'radial-gradient(ellipse 70% 55% at 50% 50%, black 10%, transparent 75%)',
          maskImage: 'radial-gradient(ellipse 70% 55% at 50% 50%, black 10%, transparent 75%)',
          opacity: 0.55,
        }}
      />
      <Grain seed={Math.floor(f / 2)} />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'radial-gradient(ellipse 85% 70% at 50% 48%, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)',
        }}
      />
    </AbsoluteFill>
  );
};

const Grain: React.FC<{ seed: number }> = ({ seed }) => (
  <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0, opacity: 0.07, mixBlendMode: 'overlay' }}>
    <filter id={`g${seed}`}>
      <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={seed % 97} stitchTiles="stitch" />
      <feColorMatrix type="saturate" values="0" />
    </filter>
    <rect width="100%" height="100%" filter={`url(#g${seed})`} />
  </svg>
);

// ── Staffan-orben: agentens närvaro ───────────────────────────────────────────
export const Orb: React.FC<{ size: number; energy?: number; spin?: number }> = ({ size, energy = 1, spin = 0 }) => {
  const f = useCurrentFrame();
  const breathe = 1 + Math.sin(f / 9) * 0.015 * energy;
  const s = size * breathe;
  return (
    <div style={{ position: 'relative', width: s, height: s }}>
      {/* yttre halo */}
      <div
        style={{
          position: 'absolute',
          left: -s * 0.9,
          top: -s * 0.9,
          width: s * 2.8,
          height: s * 2.8,
          borderRadius: '50%',
          background: `radial-gradient(circle, rgba(92,242,196,${0.32 * energy}) 0%, rgba(92,242,196,${0.08 * energy}) 35%, rgba(0,0,0,0) 62%)`,
        }}
      />
      {/* roterande kantljus */}
      <div
        style={{
          position: 'absolute',
          inset: -s * 0.035,
          borderRadius: '50%',
          background: `conic-gradient(from ${f * 3 + spin}deg, rgba(92,242,196,0) 0deg, rgba(92,242,196,0.95) 70deg, rgba(160,200,255,0.6) 140deg, rgba(92,242,196,0) 220deg, rgba(92,242,196,0) 360deg)`,
          filter: `blur(${s * 0.02}px)`,
        }}
      />
      {/* kropp */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          background:
            'radial-gradient(circle at 34% 30%, #E9FFF7 0%, #8CF8D6 16%, #2FD6A6 38%, #0B6E58 68%, #04221D 100%)',
          boxShadow: `inset 0 ${-s * 0.08}px ${s * 0.18}px rgba(0,0,0,0.55), inset 0 ${s * 0.04}px ${s * 0.1}px rgba(255,255,255,0.35)`,
        }}
      />
      {/* inre virvel */}
      <div
        style={{
          position: 'absolute',
          inset: s * 0.14,
          borderRadius: '50%',
          background: `conic-gradient(from ${-f * 2.2}deg, rgba(255,255,255,0) 0deg, rgba(255,255,255,0.28) 40deg, rgba(255,255,255,0) 120deg, rgba(255,255,255,0) 200deg, rgba(255,255,255,0.18) 250deg, rgba(255,255,255,0) 320deg)`,
          mixBlendMode: 'screen',
          filter: `blur(${s * 0.03}px)`,
        }}
      />
      {/* spekulär högdager */}
      <div
        style={{
          position: 'absolute',
          left: s * 0.2,
          top: s * 0.13,
          width: s * 0.3,
          height: s * 0.18,
          borderRadius: '50%',
          background: 'radial-gradient(ellipse, rgba(255,255,255,0.85) 0%, rgba(255,255,255,0) 70%)',
          transform: 'rotate(-28deg)',
        }}
      />
    </div>
  );
};

// ── blur-slide (demos/typography/blur-slide): y + blur + opacity på samma p ──────
export type Word = { t: string; accent?: boolean; italic?: boolean };

export const BlurWords: React.FC<{
  lines: Word[][];
  start: number;
  fontSize: number;
  gap?: number; // frames mellan ord
  dur?: number; // frames per ord
  color?: string;
  family?: string;
  weight?: number;
  lineHeight?: number;
  align?: 'center' | 'left';
  letterSpacing?: string;
  renderWord?: (w: Word, idx: number) => React.ReactNode;
}> = ({
  lines,
  start,
  fontSize,
  gap = 3.5,
  dur = 20,
  color = C.ink,
  family = F.serif,
  weight = 400,
  lineHeight = 1.02,
  align = 'center',
  letterSpacing = '-0.01em',
  renderWord,
}) => {
  const f = useCurrentFrame();
  let idx = 0;
  return (
    <div style={{ fontFamily: family, fontSize, fontWeight: weight, lineHeight, color, textAlign: align, letterSpacing }}>
      {lines.map((ln, li) => (
        <div key={li} style={{ display: 'flex', justifyContent: align === 'center' ? 'center' : 'flex-start', gap: '0.26em' }}>
          {ln.map((w) => {
            const i = idx++;
            const p = seg(f, start + i * gap, start + i * gap + dur, E.outCubic);
            return (
              <span
                key={i}
                style={{
                  display: 'inline-block',
                  opacity: p,
                  transform: `translateY(${lerp(p, fontSize * 0.55, 0)}px)`,
                  filter: p < 0.999 ? `blur(${(1 - p) * fontSize * 0.2}px)` : undefined,
                  color: w.accent ? C.mint : undefined,
                  fontStyle: w.italic ? 'italic' : undefined,
                  position: 'relative',
                }}
              >
                {renderWord ? renderWord(w, i) : w.t}
              </span>
            );
          })}
        </div>
      ))}
    </div>
  );
};

// ── Markerstreck (demos/typography/marker-underline-title) ─────────────────────
const buildStroke = (len: number, seed: number) => {
  const rand = mulberry32(seed);
  const N = 40;
  const top: string[] = [];
  const bot: string[] = [];
  const wob = Array.from({ length: N + 1 }, () => rand() - 0.5);
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = t * len;
    const mid = 19 - t * 9 + Math.sin(t * Math.PI * 1.6 + 0.4) * 2.6 + wob[i] * 1.6;
    const wBase = 14 + Math.sin(t * Math.PI) * 6 - Math.max(0, t - 0.86) * 46;
    const w = Math.max(2.2, wBase + wob[i] * 3);
    top.push(`${x.toFixed(1)},${(mid - w / 2).toFixed(1)}`);
    bot.push(`${x.toFixed(1)},${(mid + w / 2).toFixed(1)}`);
  }
  return `M${top.join('L')}L${bot.reverse().join('L')}Z`;
};

export const MarkerStroke: React.FC<{ start: number; len: number; color?: string; seed?: number; scale?: number; style?: React.CSSProperties }> = ({
  start,
  len,
  color = C.mint,
  seed = 77,
  scale = 1,
  style,
}) => {
  const f = useCurrentFrame();
  const id = `mk-${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const draw = seg(f, start, start + 10);
  const d = 1 - Math.pow(1 - draw, 2.2);
  if (draw <= 0) return null;
  return (
    <svg
      width={len * scale}
      height={44 * scale}
      viewBox={`0 0 ${len} 44`}
      style={{ position: 'absolute', overflow: 'visible', pointerEvents: 'none', ...style }}
    >
      <defs>
        <clipPath id={id}>
          <rect x={0} y={-20} width={d * (len + 6)} height={60} />
        </clipPath>
      </defs>
      <path d={buildStroke(len, seed)} fill={color} clipPath={`url(#${id})`} />
    </svg>
  );
};

// ── Liten mono-etikett ─────────────────────────────────────────────────────────
export const Kicker: React.FC<{ children: React.ReactNode; color?: string; dot?: boolean; size?: number }> = ({
  children,
  color = C.mint,
  dot = true,
  size = 28,
}) => {
  const f = useCurrentFrame();
  return (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 14,
        fontFamily: F.mono,
        fontSize: size,
        letterSpacing: '0.14em',
        color,
        textTransform: 'uppercase',
        fontWeight: 600,
      }}
    >
      {dot && (
        <span
          style={{
            width: size * 0.42,
            height: size * 0.42,
            borderRadius: '50%',
            background: color,
            boxShadow: `0 0 ${size * 0.6}px ${color}`,
            opacity: 0.55 + 0.45 * Math.abs(Math.sin(f / 7)),
          }}
        />
      )}
      {children}
    </div>
  );
};

export const glass = (accent?: string): React.CSSProperties => ({
  background: `linear-gradient(180deg, ${C.cardHi} 0%, ${C.card} 100%)`,
  border: `2px solid ${accent ?? C.line}`,
  borderRadius: 34,
  boxShadow: '0 30px 80px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.06)',
});
