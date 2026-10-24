import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { K } from '../timeline';
import { Kicker, glass } from '../lib/ui';
import { E, hash, lerp, seg } from '../lib/motion';

// S3 — changelog-scroll-brake (demos/data/scroll-brake-moves): out-exp-inbromsning,
// hastighetsdriven blur, målraden lyfts (scale 1.03–1.04 + kant), övriga dimmas till 0.38.

const ROLES = [
  'Sjuksköterska · Akuten',
  'Specialistläkare · Allmänmedicin',
  'Barnmorska · Förlossning',
  'Sjuksköterska · Geriatrik',
  'Röntgensjuksköterska',
  'Specialistsjuksköterska · Anestesi',
  'Distriktssköterska · VC',
  'Operationssjuksköterska',
  'Psykiatrisjuksköterska',
  'Sjuksköterska · Kirurgavd.',
];
const CITIES = ['Umeå', 'Kalmar', 'Gävle', 'Visby', 'Luleå', 'Falun', 'Östersund', 'Karlstad', 'Växjö', 'Skellefteå', 'Kiruna', 'Örebro'];

export const N = 34;
export const TARGET = 29;
const GAP = 18;
export const ROW_X = 60;
export const ROW_W = 960;
const rowH = (i: number) => (i === TARGET ? 176 : 140 + ((i * 29) % 3) * 18);
export const rowY: number[] = [];
{
  let y = 0;
  for (let i = 0; i < N; i++) {
    rowY.push(y);
    y += rowH(i) + GAP;
  }
}
const CENTER_Y = 1060; // målradens mitt på skärmen
const END_T = CENTER_Y - (rowY[TARGET] + rowH(TARGET) / 2);
const START_T = 1700;
export const HEADER_Y = 250; // där kortet hamnar i förhandlingsscenen

const S0 = 6;
const scrollAt = (f: number) => lerp(seg(f, S0, K.scanBrake, E.outExpo), START_T, END_T);

export const Row: React.FC<{ i: number; lift: number; dim: number }> = ({ i, lift, dim }) => {
  const isT = i === TARGET;
  const role = isT ? 'Specialistsjuksköterska · IVA' : ROLES[i % ROLES.length];
  const city = isT ? 'Sundsvall' : CITIES[(i * 7) % CITIES.length];
  const wk = 2 + ((i * 5) % 40);
  const rate = isT ? 790 : 640 + Math.round(hash(i) * 14) * 10;
  const match = isT ? 98 : 41 + Math.round(hash(i + 9) * 46);
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: rowY[i],
        width: ROW_W,
        height: rowH(i),
        ...glass(isT && lift > 0 ? `rgba(92,242,196,${0.25 + 0.75 * lift})` : C.line),
        borderRadius: 28,
        boxSizing: 'border-box',
        padding: '0 34px',
        display: 'flex',
        alignItems: 'center',
        gap: 26,
        transform: `scale(${1 + 0.04 * lift})`,
        boxShadow: isT && lift > 0 ? `0 ${20 + 30 * lift}px ${60 + 50 * lift}px rgba(0,0,0,0.55), 0 0 ${60 * lift}px rgba(92,242,196,${0.22 * lift})` : '0 10px 30px rgba(0,0,0,0.35)',
        opacity: 1 - 0.62 * dim,
        zIndex: isT ? 2 : 1,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontFamily: F.sans, fontSize: isT ? 42 : 36, fontWeight: 600, color: C.ink, letterSpacing: '-0.015em', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
          {role}
        </div>
        <div style={{ fontFamily: F.sans, fontSize: isT ? 32 : 28, color: C.mute, marginTop: 8 }}>
          {city} · v. {wk}–{wk + 8} · {isT ? 'Heltid, dag/kväll' : 'Heltid'}
        </div>
      </div>
      <div style={{ textAlign: 'right' }}>
        <div
          style={{
            display: 'inline-block',
            padding: '8px 18px',
            borderRadius: 999,
            fontFamily: F.mono,
            fontWeight: 600,
            fontSize: isT ? 32 : 26,
            color: isT ? C.bg : C.mute,
            background: isT ? C.mint : 'rgba(243,239,231,0.08)',
          }}
        >
          {match} %
        </div>
        <div style={{ fontFamily: F.mono, fontSize: isT ? 30 : 26, color: C.mute, marginTop: 10 }}>{rate} kr/h</div>
      </div>
    </div>
  );
};

const fmt = (n: number) => n.toLocaleString('sv-SE').replace(/ /g, ' ');

export const Scan: React.FC = () => {
  const f = useCurrentFrame();
  const T = scrollAt(f);
  const v = Math.abs(scrollAt(f) - scrollAt(f - 1));
  const blur = Math.min(v / 60, 1) * 7;

  const liftP = seg(f, K.scanLift, K.scanLift + 14, E.outCubic);
  const othersOut = seg(f, 96, 106, E.outQuad);
  // delat element: målraden flyger upp till förhandlingsheadern
  const fly = seg(f, 99, 111, E.inOutCubic);
  const targetScreenY = rowY[TARGET] + T;
  const flyDY = lerp(fly, 0, HEADER_Y - targetScreenY);

  // Droppchock: orben spricker till en ring + blixt (slam 1/3)
  const ring = seg(f, 0, 20, E.outCubic);
  const flash = 1 - seg(f, 0, 7);

  const count = Math.round(lerp(seg(f, 4, K.scanBrake, E.outQuart), 0, 1284));

  return (
    <AbsoluteFill>
      {/* Lista (maskad) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          WebkitMaskImage: 'linear-gradient(180deg, transparent 520px, black 700px, black 1520px, transparent 1700px)',
          maskImage: 'linear-gradient(180deg, transparent 520px, black 700px, black 1520px, transparent 1700px)',
          opacity: 1 - othersOut,
        }}
      >
        <div style={{ position: 'absolute', left: ROW_X, top: 0, width: ROW_W, transform: `translateY(${T}px)`, filter: blur > 0.15 ? `blur(${blur}px)` : undefined }}>
          {Array.from({ length: N }).map((_, i) => (i === TARGET ? null : <Row key={i} i={i} lift={0} dim={liftP} />))}
        </div>
      </div>
      {/* Målraden (omaskad, delat element mot förhandlingsscenen) */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          WebkitMaskImage: f < 60 ? 'linear-gradient(180deg, transparent 520px, black 700px, black 1520px, transparent 1700px)' : undefined,
          maskImage: f < 60 ? 'linear-gradient(180deg, transparent 520px, black 700px, black 1520px, transparent 1700px)' : undefined,
        }}
      >
        <div style={{ position: 'absolute', left: ROW_X, top: 0, width: ROW_W, transform: `translateY(${T + flyDY}px)`, filter: blur > 0.15 ? `blur(${blur}px)` : undefined }}>
          <Row i={TARGET} lift={liftP * (1 - fly)} dim={0} />
        </div>
      </div>

      {/* Etikett "Bästa matchningen" */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: CENTER_Y - 160,
          textAlign: 'center',
          opacity: seg(f, K.scanLift + 6, K.scanLift + 12) * (1 - othersOut),
          transform: `scale(${seg(f, K.scanLift + 6, K.scanLift + 16, (t) => E.outBack(t, 2.2))})`,
        }}
      >
        <Kicker>Bästa matchningen</Kicker>
      </div>

      {/* Räknare */}
      <div style={{ position: 'absolute', left: 0, right: 0, top: 260, textAlign: 'center', opacity: (1 - othersOut) * seg(f, 2, 8) }}>
        <Kicker>Skannar marknaden</Kicker>
        <div
          style={{
            fontFamily: F.sans,
            fontWeight: 700,
            fontSize: 150,
            letterSpacing: '-0.04em',
            color: C.ink,
            fontVariantNumeric: 'tabular-nums',
            marginTop: 10,
            lineHeight: 1,
          }}
        >
          {fmt(count)}
        </div>
        <div style={{ fontFamily: F.sans, fontSize: 40, color: C.mute, marginTop: 8 }}>uppdrag analyserade</div>
      </div>

      {/* Chockring + blixt */}
      {ring < 1 && (
        <div
          style={{
            position: 'absolute',
            left: 540,
            top: 1030,
            width: 0,
            height: 0,
          }}
        >
          <div
            style={{
              position: 'absolute',
              left: -lerp(ring, 130, 1300),
              top: -lerp(ring, 130, 1300),
              width: lerp(ring, 260, 2600),
              height: lerp(ring, 260, 2600),
              borderRadius: '50%',
              border: `${lerp(ring, 26, 3)}px solid rgba(92,242,196,${0.9 * (1 - ring)})`,
              boxShadow: `0 0 80px rgba(92,242,196,${0.5 * (1 - ring)})`,
            }}
          />
        </div>
      )}
      {flash > 0 && <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 54%, rgba(200,255,236,${0.55 * flash}), rgba(92,242,196,${0.12 * flash}) 60%)` }} />}
    </AbsoluteFill>
  );
};
