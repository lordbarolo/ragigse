import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { K } from '../timeline';
import { Orb } from '../lib/ui';
import { E, lerp, seg } from '../lib/motion';
import { ApprovalCard, CARD } from './Approve';

// S7 — logo-shrink-wordmark-lockup (demos/outro/...): ikonen krymper in med inOutCubic +
// liten bromsöversläng, flyttar åt vänster, bokstäverna glider in vänster→höger.

const WORD = 'Staffan';
const ICON = 150;
const CY = 930;

export const Outro: React.FC = () => {
  const f = useCurrentFrame();
  const L = K.outroLetters;

  // Kortet kollapsar mot mitten → blir orben
  const col = seg(f, 0, 12, E.inOutCubic);
  // Orbens lockup: krymper från stor till ikonstorlek med bromsöversläng
  const k = seg(f, 4, 16, E.inOutCubic);
  const brake = Math.sin(seg(f, 14, 22) * Math.PI) * 0.06;
  const orbScale = lerp(k, 2.6, 1) * (1 + brake);
  const shift = seg(f, L - 2, L + 8, E.inOutCubic) * -330;
  const tag = seg(f, L + 16, L + 28, E.outCubic);
  const pill = seg(f, L + 24, L + 36, E.outCubic);

  return (
    <AbsoluteFill>
      {col < 1 && (
        <div
          style={{
            position: 'absolute',
            left: CARD.x,
            top: CARD.y,
            width: CARD.w,
            height: CARD.h,
            transform: `translate(${(540 - (CARD.x + CARD.w / 2)) * col}px, ${(CY - (CARD.y + CARD.h / 2)) * col}px) scale(${1 - 0.92 * col})`,
            opacity: 1 - seg(f, 6, 12),
            filter: col > 0 ? `blur(${col * 10}px)` : undefined,
          }}
        >
          <ApprovalCard f={99} />
        </div>
      )}

      {/* Orb-ikon */}
      <div
        style={{
          position: 'absolute',
          left: 540 - ICON / 2,
          top: CY - ICON / 2,
          transform: `translateX(${shift}px) scale(${orbScale * seg(f, 2, 8)})`,
        }}
      >
        <Orb size={ICON} energy={1.2} />
      </div>

      {/* Ordmärke */}
      <div style={{ position: 'absolute', left: 540 - 330 + ICON / 2 + 40, top: CY - 130, height: 260, display: 'flex', alignItems: 'center' }}>
        {[...WORD].map((ch, i) => {
          const p = seg(f, L + i * 2, L + i * 2 + 9, E.outCubic);
          return (
            <span
              key={i}
              style={{
                display: 'inline-block',
                fontFamily: F.serif,
                fontSize: 250,
                lineHeight: 1,
                color: C.ink,
                letterSpacing: '-0.02em',
                opacity: p,
                transform: `translateX(${lerp(p, 40, 0)}px)`,
                filter: p < 0.999 ? `blur(${(1 - p) * 12}px)` : undefined,
              }}
            >
              {ch}
            </span>
          );
        })}
      </div>

      {/* Tagline */}
      <div style={{ position: 'absolute', top: CY + 170, left: 0, right: 0, textAlign: 'center', opacity: tag, transform: `translateY(${(1 - tag) * 24}px)` }}>
        <div style={{ fontFamily: F.sans, fontSize: 54, fontWeight: 500, color: C.ink, letterSpacing: '-0.02em' }}>
          Din agent i <span style={{ fontFamily: F.serif, fontStyle: 'italic', fontSize: 64, color: C.mint }}>vården.</span>
        </div>
      </div>
      <div style={{ position: 'absolute', top: CY + 300, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: pill, transform: `translateY(${(1 - pill) * 20}px)` }}>
        <div
          style={{
            padding: '18px 34px',
            borderRadius: 999,
            border: `2px solid rgba(92,242,196,0.5)`,
            background: C.mintSoft,
            fontFamily: F.mono,
            fontSize: 32,
            fontWeight: 600,
            letterSpacing: '0.06em',
            color: C.mint,
          }}
        >
          Väntelistan är öppen →
        </div>
      </div>
    </AbsoluteFill>
  );
};
