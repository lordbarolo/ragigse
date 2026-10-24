import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { K, SHOTS } from '../timeline';
import { BlurWords, Orb, glass } from '../lib/ui';
import { E, seg } from '../lib/motion';

// S6 — godkännandekort + tumtryck (pop-burst-confirm: tryck, ring, 10 strålar).
export const CARD = { x: 90, y: 700, w: 900, h: 600 };
const BTN = { x: 40, y: 440, w: 820, h: 120 };

export const ApprovalCard: React.FC<{ f: number }> = ({ f }) => {
  const tap = K.approveTap;
  const signed = f >= tap + 2;
  const press = f >= tap - 2 && f < tap + 4 ? 0.96 : 1;
  const fill = seg(f, tap + 1, tap + 7, E.outCubic);
  return (
    <div style={{ position: 'relative', width: CARD.w, height: CARD.h, ...glass('rgba(92,242,196,0.30)'), borderRadius: 44, boxSizing: 'border-box' }}>
      <div style={{ position: 'absolute', left: 40, top: 40, display: 'flex', alignItems: 'center', gap: 18 }}>
        <Orb size={56} />
        <div style={{ fontFamily: F.sans, fontSize: 34, fontWeight: 700, color: C.ink }}>Staffan</div>
        <div style={{ fontFamily: F.sans, fontSize: 30, color: C.mute }}>· nu</div>
      </div>
      <div style={{ position: 'absolute', left: 40, top: 140, right: 40 }}>
        <div style={{ fontFamily: F.sans, fontSize: 50, fontWeight: 600, color: C.ink, letterSpacing: '-0.02em', lineHeight: 1.12 }}>
          Ditt nya uppdrag är klart att signera.
        </div>
        <div style={{ marginTop: 26, display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {['IVA · Sundsvall', 'v. 12–20', '865 kr/h', 'Boende + resor'].map((t) => (
            <div key={t} style={{ padding: '10px 20px', borderRadius: 999, background: 'rgba(243,239,231,0.07)', border: `2px solid ${C.line}`, fontFamily: F.sans, fontSize: 30, fontWeight: 500, color: C.ink }}>
              {t}
            </div>
          ))}
        </div>
      </div>
      <div
        style={{
          position: 'absolute',
          left: BTN.x,
          top: BTN.y,
          width: BTN.w,
          height: BTN.h,
          borderRadius: 30,
          background: signed ? `linear-gradient(180deg, ${C.mint}, #3BD9A8)` : C.ink,
          transform: `scale(${press})`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: F.sans,
          fontSize: 46,
          fontWeight: 700,
          color: C.bg,
          overflow: 'hidden',
          boxShadow: signed ? `0 0 ${60 * fill}px rgba(92,242,196,0.45)` : 'none',
        }}
      >
        {signed ? '✓ Signerat' : 'Godkänn'}
      </div>
    </div>
  );
};

export const Approve: React.FC = () => {
  const f = useCurrentFrame();
  const tap = K.approveTap;
  const enter = seg(f, 0, 16, E.outQuint);
  // Tummen: glider in, trycker, lyfter
  const fin = seg(f, 6, tap - 1, E.outCubic);
  const lift = seg(f, tap + 3, tap + 10, E.inOutCubic);
  const bx = CARD.x + BTN.x + BTN.w * 0.62;
  const by = CARD.y + BTN.y + BTN.h / 2;
  const tx = bx + (1 - fin) * 180 + lift * 60;
  const ty = by + (1 - fin) * 320 + lift * 120;
  const tScale = f >= tap - 2 && f < tap + 4 ? 0.82 : 1;
  const ring = seg(f, tap, tap + 18, E.outCubic);
  const pt = seg(f, tap, tap + 14);
  const end = SHOTS.approve.dur;
  const hOut = seg(f, end - 3, end + 7, E.inOutCubic);

  return (
    <AbsoluteFill>
      <div style={{ position: 'absolute', top: 330, left: 0, right: 0, opacity: 1 - hOut, transform: `translateY(${-hOut * 50}px)`, filter: hOut > 0 ? `blur(${hOut * 12}px)` : undefined }}>
        <BlurWords start={3} fontSize={140} lines={[[{ t: 'Du' }, { t: 'säger' }, { t: 'bara' }, { t: 'ja.', accent: true, italic: true }]]} />
      </div>
      {f < end && <div style={{ position: 'absolute', left: CARD.x, top: CARD.y, transform: `translateY(${(1 - enter) * 420}px)`, opacity: seg(f, 0, 6) }}>
        <ApprovalCard f={f} />
      </div>}
      {/* Ring + strålar från knappen */}
      {f >= tap && ring < 1 && (
        <div style={{ position: 'absolute', left: bx, top: by }}>
          <div
            style={{
              position: 'absolute',
              left: -(60 + 340 * ring),
              top: -(60 + 340 * ring),
              width: 2 * (60 + 340 * ring),
              height: 2 * (60 + 340 * ring),
              borderRadius: '50%',
              border: `${12 - 9 * ring}px solid rgba(92,242,196,${0.8 * (1 - ring)})`,
            }}
          />
          <svg width={900} height={900} style={{ position: 'absolute', left: -450, top: -450, overflow: 'visible' }}>
            {Array.from({ length: 10 }).map((_, i) => {
              const ang = ((i * 36 + 9 * Math.sin(i * 7.31)) * Math.PI) / 180;
              const d = 90 + 150 * E.outCubic(pt);
              const l = 34 * (1 - pt);
              return (
                <line
                  key={i}
                  x1={450 + Math.cos(ang) * d}
                  y1={450 + Math.sin(ang) * d}
                  x2={450 + Math.cos(ang) * (d + l)}
                  y2={450 + Math.sin(ang) * (d + l)}
                  stroke={i % 3 === 0 ? C.ink : C.mint}
                  strokeWidth={8}
                  strokeLinecap="round"
                  opacity={1 - pt}
                />
              );
            })}
          </svg>
        </div>
      )}
      {/* Tumme (pekpunkt) */}
      <div
        style={{
          position: 'absolute',
          left: tx - 55,
          top: ty - 55,
          width: 110,
          height: 110,
          borderRadius: '50%',
          background: 'radial-gradient(circle at 40% 35%, rgba(255,255,255,0.95), rgba(230,236,240,0.78))',
          boxShadow: '0 20px 40px rgba(0,0,0,0.45)',
          transform: `scale(${tScale})`,
          opacity: seg(f, 6, 10) * (1 - seg(f, tap + 4, tap + 9)),
        }}
      />
    </AbsoluteFill>
  );
};
