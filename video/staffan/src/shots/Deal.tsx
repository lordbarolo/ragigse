import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { K, SHOTS } from '../timeline';
import { Kicker, Orb } from '../lib/ui';
import { E, lerp, seg } from '../lib/motion';
import { HEADER_Y, ROW_X, ROW_W, Row, TARGET, rowY } from './Scan';

// S4 — agent-till-agent. Timpriset rullar som odometer (demos/data/odometer-digit-roll):
// per siffra out-cubic inbromsning + halv rads översläng tillbaka på 6f, spöksträngar
// grindade på hastighet, låsningspuls när affären är klar.

const MSGS: { who: 'byra' | 'staffan'; text: string }[] = [
  { who: 'byra', text: 'Vi kan erbjuda 790 kr/h.' },
  { who: 'staffan', text: '9 år på IVA. Marknaden ger 860+.' },
  { who: 'byra', text: '840 kr/h + boende.' },
  { who: 'staffan', text: '865 + resor, så är vi överens.' },
];

// Odometer
const ROWH = 262; // ≈1.11 × FS som i demo
const DW = 150;
const FS = 236;
// Startar stilla på byråns första bud (790), rullar vid motbud och vid Staffans 865.
const START = 790;
const KEYS = [
  { f: K.dealMsgs[2], v: 840 },
  { f: K.dealMsgs[3] + 2, v: 865 },
];
const digitsOf = (v: number) => [Math.floor(v / 100) % 10, Math.floor(v / 10) % 10, v % 10];

// Strängposition (i rader) för siffra i vid frame f — ren funktion.
const posAt = (f: number, i: number): number => {
  let pos = digitsOf(START)[i];
  for (let k = 0; k < KEYS.length; k++) {
    const key = KEYS[k];
    const s = key.f + i * 2;
    const d = digitsOf(key.v)[i];
    const minRows = 0;
    const prev = pos;
    let T = Math.ceil((prev + minRows - d) / 10) * 10 + d;
    if (T < prev) T += 10;
    if (f < s) return prev;
    if (T === prev) continue;
    const R = 12;
    if (f < s + R) return lerp(seg(f, s, s + R, E.outCubic), prev, T + 0.3);
    if (f < s + R + 5) return lerp(seg(f, s + R, s + R + 5, E.outCubic), T + 0.3, T);
    pos = T;
  }
  return pos;
};

const Strip: React.FC<{ pos: number; color: string; opacity?: number; dy?: number }> = ({ pos, color, opacity = 1, dy = 0 }) => (
  <div style={{ position: 'absolute', left: 0, top: 0, width: DW, transform: `translateY(${-(pos % 10) * ROWH + dy}px)`, opacity }}>
    {Array.from({ length: 20 }).map((_, k) => (
      <div key={k} style={{ width: DW, height: ROWH, lineHeight: `${ROWH}px`, textAlign: 'center', fontSize: FS, fontWeight: 700, fontVariantNumeric: 'tabular-nums', color, letterSpacing: '-0.04em' }}>
        {k % 10}
      </div>
    ))}
  </div>
);

const Reel: React.FC<{ f: number; i: number; color: string }> = ({ f, i, color }) => {
  const pos = posAt(f, i);
  const speed = Math.abs(pos - posAt(f - 1, i));
  const gate = seg(speed, 0.06, 0.5);
  return (
    <div style={{ position: 'relative', width: DW, height: ROWH, overflow: 'hidden' }}>
      {gate > 0.001 && (
        <>
          <Strip pos={pos} color={color} opacity={0.25 * gate} dy={ROWH * 0.5} />
          <Strip pos={pos} color={color} opacity={0.12 * gate} dy={-ROWH * 0.5} />
        </>
      )}
      <Strip pos={pos} color={color} />
    </div>
  );
};

const Bubble: React.FC<{ who: 'byra' | 'staffan'; text: string; at: number; f: number; y: number; fade: number }> = ({ who, text, at, f, y, fade }) => {
  const me = who === 'staffan';
  const p = seg(f, at, at + 10, (t) => E.outBack(t, 1.4));
  const op = seg(f, at, at + 5);
  const col = me ? C.mint : C.amber;
  return (
    <div
      style={{
        position: 'absolute',
        top: y,
        left: me ? undefined : 60,
        right: me ? 140 : undefined,
        maxWidth: 760,
        opacity: op * (1 - fade),
        transform: `translateX(${(1 - p) * (me ? 50 : -50)}px) scale(${0.92 + 0.08 * p})`,
        transformOrigin: me ? '100% 100%' : '0% 100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: me ? 'flex-end' : 'flex-start',
        gap: 10,
      }}
    >
      <div style={{ fontFamily: F.mono, fontSize: 24, fontWeight: 600, letterSpacing: '0.14em', color: col, textTransform: 'uppercase' }}>
        {me ? 'Staffan · din agent' : 'Byråns agent'}
      </div>
      <div
        style={{
          padding: '24px 32px',
          borderRadius: 32,
          borderTopLeftRadius: me ? 32 : 8,
          borderTopRightRadius: me ? 8 : 32,
          background: me ? 'linear-gradient(180deg, rgba(92,242,196,0.20), rgba(92,242,196,0.10))' : 'linear-gradient(180deg, rgba(255,184,103,0.16), rgba(255,184,103,0.07))',
          border: `2px solid ${me ? 'rgba(92,242,196,0.45)' : 'rgba(255,184,103,0.38)'}`,
          fontFamily: F.sans,
          fontSize: 42,
          fontWeight: 500,
          color: C.ink,
          letterSpacing: '-0.015em',
          lineHeight: 1.2,
        }}
      >
        {text}
      </div>
    </div>
  );
};

export const Deal: React.FC = () => {
  const f = useCurrentFrame();
  const end = SHOTS.deal.dur;
  const out = seg(f, end - 6, end + 6, E.inOutCubic);
  const done = seg(f, K.dealDone, K.dealDone + 8, E.outCubic);
  const lockPulse = Math.sin(seg(f, K.dealDone, K.dealDone + 8) * Math.PI);
  const ink = done > 0 ? C.mint : C.ink;

  return (
    <AbsoluteFill style={{ opacity: 1 - out, filter: out > 0 ? `blur(${out * 12}px)` : undefined }}>
      {/* Header — samma kort som målraden i S3 */}
      <div style={{ position: 'absolute', left: ROW_X, top: HEADER_Y - rowY[TARGET], width: ROW_W }}>
        <Row i={TARGET} lift={0.3 * seg(f, 0, 10, E.outCubic) + 0.7 * done} dim={0} />
      </div>

      {/* Versus-rad */}
      <div style={{ position: 'absolute', top: 465, left: 60, right: 140, display: 'flex', alignItems: 'center', justifyContent: 'space-between', opacity: seg(f, 0, 8) }}>
        <Kicker color={C.amber}>Byrå</Kicker>
        <div style={{ flex: 1, margin: '0 26px', height: 2, background: `linear-gradient(90deg, ${C.amber}, rgba(243,239,231,0.15), ${C.mint})` }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <Kicker color={C.mint} dot={false}>Staffan</Kicker>
          <Orb size={44} />
        </div>
      </div>

      {/* Tråd */}
      {MSGS.map((m, i) => (
        <Bubble key={i} who={m.who} text={m.text} at={K.dealMsgs[i]} f={f} y={545 + i * 150} fade={0} />
      ))}

      {/* Timpris */}
      <div style={{ position: 'absolute', top: 1160, left: 0, right: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: seg(f, K.dealMsgs[0] - 3, K.dealMsgs[0] + 3) }}>
        <Kicker color={done > 0 ? C.mint : C.mute} dot={false}>
          {done > 0 ? '✓ Överens · timpris' : 'Timpris · förhandlas'}
        </Kicker>
        <div style={{ display: 'flex', alignItems: 'flex-end', fontFamily: F.sans, transform: `scale(${1 + 0.035 * lockPulse})`, marginTop: 6 }}>
          <Reel f={f} i={0} color={ink} />
          <Reel f={f} i={1} color={ink} />
          <Reel f={f} i={2} color={ink} />
          <div style={{ fontFamily: F.sans, fontSize: 72, fontWeight: 600, color: C.mute, marginLeft: 18, marginBottom: 52 }}>kr/h</div>
        </div>
        <div
          style={{
            marginTop: 6,
            padding: '12px 26px',
            borderRadius: 999,
            background: C.mint,
            color: C.bg,
            fontFamily: F.mono,
            fontWeight: 600,
            fontSize: 32,
            opacity: seg(f, K.dealDone + 6, K.dealDone + 12),
            transform: `scale(${seg(f, K.dealDone + 6, K.dealDone + 16, (t) => E.outBack(t, 2.4))})`,
          }}
        >
          +75 kr/h mot första budet
        </div>
      </div>
    </AbsoluteFill>
  );
};
