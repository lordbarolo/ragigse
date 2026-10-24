import React from 'react';
import { AbsoluteFill, Easing, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { K, SHOTS } from '../timeline';
import { BlurWords, MarkerStroke, glass } from '../lib/ui';
import { E, seg } from '../lib/motion';

// S5 — row-embed (demos/ui-entrance/row-embed): rad faller från luften med perspektiv,
// rotateX 16°·air, scale 1.06→0.995→1 (press), FLY_EASE bezier(0.3,0,0.25,1) på 12f,
// sömmen i accentfärg expanderar från mitten vid landning. Cue-avstånd accelererar 12→10→8.

const FLY_EASE = Easing.bezier(0.3, 0, 0.25, 1);

const Icon: React.FC<{ kind: number }> = ({ kind }) => {
  const s = { fill: 'none', stroke: C.mint, strokeWidth: 3.2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <svg width={54} height={54} viewBox="0 0 48 48">
      {kind === 0 && (
        <>
          <path d="M13 6h15l9 9v27H13z" {...s} />
          <path d="M28 6v9h9M19 25h12M19 32h9" {...s} />
        </>
      )}
      {kind === 1 && (
        <>
          <path d="M24 5l15 6v11c0 10-7 17-15 21C16 39 9 32 9 22V11z" {...s} />
          <path d="M17 24l5 5 9-10" {...s} />
        </>
      )}
      {kind === 2 && (
        <>
          <circle cx="18" cy="17" r="6" {...s} />
          <circle cx="33" cy="19" r="5" {...s} />
          <path d="M7 39c1-7 6-11 11-11s10 4 11 11M29 30c5 0 10 3 11 9" {...s} />
        </>
      )}
      {kind === 3 && (
        <>
          <path d="M6 23L41 7 31 41l-8-14z" {...s} />
          <path d="M23 27L41 7" {...s} />
        </>
      )}
    </svg>
  );
};

const ROWS = [
  { t: 'CV optimerat', s: 'Anpassat för IVA-uppdraget · 14 nyckelord' },
  { t: 'Avtal granskat', s: 'Uppsägningstid 3 → 1 mån, omförhandlad' },
  { t: 'Referenser klara', s: '2 av 2 har bekräftat' },
  { t: 'Ansökan skickad', s: 'Mottagen av byrån 07:42' },
];

const X = 60;
const RW = 960;
const RH = 168;
const Y0 = 560;
const GAPY = 26;

export const Ops: React.FC = () => {
  const f = useCurrentFrame();
  const end = SHOTS.ops.dur;
  const out = seg(f, end - 10, end + 2, E.inOutCubic);

  return (
    <AbsoluteFill style={{ opacity: 1 - out, transform: `translateY(${-out * 80}px)` }}>
      <div style={{ position: 'absolute', top: 300, left: 0, right: 0 }}>
        <BlurWords start={0} fontSize={128} lines={[[{ t: 'Pappersjobbet?' }]]} />
      </div>

      {ROWS.map((r, i) => {
        const cue = K.opsCues[i];
        const land = cue + 12;
        const y = Y0 + i * (RH + GAPY);
        const p = seg(f, cue, land, FLY_EASE);
        const appear = seg(f, cue, cue + 3);
        const scale = f < land ? 1.06 - 0.065 * p : 0.995 + 0.005 * seg(f, land, land + 4, E.outQuad);
        const air = 1 - p;
        const spread = seg(f, land, land + 5, E.outCubic);
        const seamOp = f < land ? 0 : 1 - seg(f, land + 2, land + 8);
        // Status: snurra → bock (pop-burst-confirm i mini: 0.6 → 1.25 → 1)
        const tick = land + 8;
        const spin = f >= land && f < tick;
        const ck = seg(f, tick, tick + 5, E.outCubic);
        const ckScale = f < tick ? 0.6 : f < tick + 5 ? 0.6 + 0.65 * ck : 1.25 - 0.25 * seg(f, tick + 5, tick + 12, (t) => E.outBack(t, 2));
        const ring = seg(f, tick, tick + 14, E.outCubic);
        return (
          <div key={i} style={{ position: 'absolute', left: X, top: y, width: RW, height: RH, perspective: 900 }}>
            <div
              style={{
                position: 'absolute',
                inset: 0,
                ...glass(),
                borderRadius: 30,
                opacity: appear,
                transform: `translateY(${-140 * air}px) rotateX(${16 * air}deg) scale(${scale})`,
                boxShadow: `0 ${30 + 30 * air}px ${60 + 40 * air}px rgba(0,0,0,${0.4 + 0.2 * air})`,
                display: 'flex',
                alignItems: 'center',
                padding: '0 34px',
                gap: 28,
                boxSizing: 'border-box',
              }}
            >
              <div style={{ width: 92, height: 92, borderRadius: 24, background: C.mintSoft, border: '2px solid rgba(92,242,196,0.28)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Icon kind={i} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: F.sans, fontSize: 44, fontWeight: 600, color: C.ink, letterSpacing: '-0.02em' }}>{r.t}</div>
                <div style={{ fontFamily: F.sans, fontSize: 30, color: C.mute, marginTop: 6 }}>{r.s}</div>
              </div>
              <div style={{ position: 'relative', width: 72, height: 72 }}>
                {spin && (
                  <div
                    style={{
                      position: 'absolute',
                      inset: 6,
                      borderRadius: '50%',
                      border: '5px solid rgba(243,239,231,0.15)',
                      borderTopColor: C.mint,
                      transform: `rotate(${(f - land) * 40}deg)`,
                    }}
                  />
                )}
                {f >= tick && ring < 1 && (
                  <div
                    style={{
                      position: 'absolute',
                      left: 36 - 36 - 40 * ring,
                      top: 36 - 36 - 40 * ring,
                      width: 72 + 80 * ring,
                      height: 72 + 80 * ring,
                      borderRadius: '50%',
                      border: `${4 - 3 * ring}px solid rgba(92,242,196,${0.8 * (1 - ring)})`,
                    }}
                  />
                )}
                {f >= tick && (
                  <svg width={72} height={72} viewBox="0 0 72 72" style={{ position: 'absolute', inset: 0, transform: `scale(${ckScale})` }}>
                    <circle cx={36} cy={36} r={33} fill={C.mint} />
                    <path d="M22 37l9 9 18-20" fill="none" stroke={C.bg} strokeWidth={6} strokeLinecap="round" strokeLinejoin="round" pathLength={1} strokeDasharray={1} strokeDashoffset={1 - ck} />
                  </svg>
                )}
              </div>
            </div>
            {/* Söm vid landning */}
            {seamOp > 0 && (
              <div
                style={{
                  position: 'absolute',
                  left: (RW - RW * 0.9 * spread) / 2,
                  top: RH - 3,
                  width: RW * 0.9 * spread,
                  height: 3,
                  borderRadius: 2,
                  background: C.mint,
                  boxShadow: `0 0 14px ${C.mint}`,
                  opacity: seamOp,
                }}
              />
            )}
          </div>
        );
      })}

      {/* "Fixat." */}
      <div
        style={{
          position: 'absolute',
          top: 1355,
          left: 0,
          right: 0,
          display: 'flex',
          justifyContent: 'center',
        }}
      >
        <div
          style={{
            position: 'relative',
            fontFamily: F.serif,
            fontStyle: 'italic',
            fontSize: 190,
            color: C.mint,
            lineHeight: 1,
            opacity: seg(f, K.opsFixat, K.opsFixat + 3),
            transform: `scale(${f < K.opsFixat ? 1.5 : 1.5 - 0.5 * seg(f, K.opsFixat, K.opsFixat + 6, E.outCubic) + (f >= K.opsFixat + 6 ? -0.03 * Math.sin(seg(f, K.opsFixat + 6, K.opsFixat + 12) * Math.PI) : 0)})`,
          }}
        >
          Fixat.
          <MarkerStroke start={K.opsFixat + 8} len={280} seed={19} scale={1.6} style={{ left: -10, bottom: -40 }} color="rgba(92,242,196,0.55)" />
        </div>
      </div>
    </AbsoluteFill>
  );
};
