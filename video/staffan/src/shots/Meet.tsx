import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C, F } from '../theme';
import { K, SHOTS } from '../timeline';
import { BlurWords, Kicker, Orb } from '../lib/ui';
import { E, lerp, seg } from '../lib/motion';

const OX = 540;
const OY = 1030;
const ORB = 260;

// Vad Staffan vet om konsulten — kompetens, krav, önskemål.
const CHIPS = [
  { k: 'Roll', v: 'Specialistsjuksköterska · IVA', x: 540, y: 690 },
  { k: 'Erfarenhet', v: '9 år', x: 235, y: 860 },
  { k: 'Lägsta pris', v: '850 kr/h', x: 845, y: 860 },
  { k: 'Ort', v: 'Norrland funkar', x: 250, y: 1215 },
  { k: 'Krav', v: 'Boende ingår', x: 830, y: 1215 },
  { k: 'Ledig', v: 'v. 12–20', x: 540, y: 1390 },
];

export const Meet: React.FC = () => {
  const f = useCurrentFrame();
  const end = SHOTS.meet.dur;

  // Orben: liten cirkel andas, växer med lätt översläng (morph-from-primitive)
  const grow = seg(f, 0, 24, (t) => E.outBack(t, 1.5));
  // Inför droppet: dras ihop (anticipation) och laddas
  const charge = seg(f, K.meetSuck + 4, end, E.inCubic);
  const burst = seg(f, end, end + 5, E.outCubic);
  const orbScale = grow * (1 - 0.18 * charge) * (1 + 0.6 * burst);
  const headOut = seg(f, K.meetSuck, K.meetSuck + 12, E.inOutCubic);

  return (
    <AbsoluteFill>
      {/* Rubrik */}
      <div
        style={{
          position: 'absolute',
          top: 300,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: 1 - headOut,
          transform: `translateY(${-headOut * 60}px)`,
          filter: headOut > 0 ? `blur(${headOut * 14}px)` : undefined,
        }}
      >
        <BlurWords start={4} fontSize={150} lines={[[{ t: 'Möt' }, { t: 'Staffan.', accent: true, italic: true }]]} />
        <div style={{ height: 22 }} />
        <BlurWords
          start={12}
          gap={2.5}
          dur={16}
          fontSize={46}
          family={F.sans}
          weight={500}
          color={C.mute}
          letterSpacing="-0.01em"
          lines={[[{ t: 'Din' }, { t: 'AI-agent' }, { t: 'på' }, { t: 'vårdbemanningsmarknaden.' }]]}
        />
      </div>

      {/* Kopplingslinjer orb → chip */}
      <svg width={1080} height={1920} style={{ position: 'absolute', inset: 0 }}>
        {CHIPS.map((c, i) => {
          const t0 = K.meetChips[i];
          const p = seg(f, t0 - 4, t0 + 6, E.outCubic);
          const suck = seg(f, K.meetSuck + i * 1.2, K.meetSuck + 6 + i * 1.2, E.inCubic);
          const x2 = lerp(p, OX, c.x);
          const y2 = lerp(p, OY, c.y);
          return (
            <line
              key={i}
              x1={OX}
              y1={OY}
              x2={lerp(suck, x2, OX)}
              y2={lerp(suck, y2, OY)}
              stroke={C.mint}
              strokeOpacity={0.35 * (1 - suck)}
              strokeWidth={2}
              strokeDasharray="6 10"
            />
          );
        })}
      </svg>

      {/* Orben */}
      <div
        style={{
          position: 'absolute',
          left: OX - ORB / 2,
          top: OY - ORB / 2,
          transform: `scale(${orbScale})`,
          opacity: 1 - burst,
        }}
      >
        <Orb size={ORB} energy={1 + charge * 1.2} />
      </div>

      {/* Chips: poppar in i accelererande takt, sugs sedan in i orben */}
      {CHIPS.map((c, i) => {
        const t0 = K.meetChips[i];
        const pop = seg(f, t0, t0 + 12, (t) => E.outBack(t, 2.0));
        const op = seg(f, t0, t0 + 5);
        const suck = seg(f, K.meetSuck + i * 1.2, K.meetSuck + 6 + i * 1.2, E.inCubic);
        const fl = Math.sin((f + i * 17) / 14) * 6;
        const x = lerp(suck, c.x, OX);
        const y = lerp(suck, c.y + fl, OY);
        return (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: x,
              top: y,
              transform: `translate(-50%,-50%) scale(${(0.6 + 0.4 * pop) * (1 - 0.8 * suck)})`,
              opacity: op * (1 - suck),
              padding: '18px 30px 20px',
              borderRadius: 999,
              background: 'linear-gradient(180deg, rgba(30,38,48,0.92), rgba(16,20,28,0.92))',
              border: `2px solid rgba(92,242,196,0.32)`,
              boxShadow: '0 18px 50px rgba(0,0,0,0.45), 0 0 30px rgba(92,242,196,0.10)',
              whiteSpace: 'nowrap',
              textAlign: 'center',
            }}
          >
            <div style={{ fontFamily: F.mono, fontSize: 22, letterSpacing: '0.16em', color: C.mint, textTransform: 'uppercase', marginBottom: 4 }}>
              {c.k}
            </div>
            <div style={{ fontFamily: F.sans, fontSize: 38, fontWeight: 600, color: C.ink, letterSpacing: '-0.01em' }}>{c.v}</div>
          </div>
        );
      })}

      {/* Etikett under orben */}
      <div
        style={{
          position: 'absolute',
          top: 1540,
          left: 0,
          right: 0,
          textAlign: 'center',
          opacity: seg(f, 58, 68) * (1 - headOut),
        }}
      >
        <Kicker>Lär sig dina krav</Kicker>
      </div>
    </AbsoluteFill>
  );
};
