/**
 * Missade timmar — "Timmar du missat att fakturera."
 *
 * Fem beats: veckan byggs upp → skanningslinjen sveper och flaggar → flaggade
 * timmar flyger in i summeringen → totalsumman lyfts fram → varumärket.
 *
 * Portad rakt av från handoff-designen (timmar-scene.jsx).
 */
import { AnimationStage, Captions, FONT_MONO, FONT_SANS, type CaptionItem } from './AnimationStage';
import {
  Easing,
  fmt,
  interpolate,
  lerp,
  MOTION,
  P,
  clamp,
  withAlpha,
  type Scene,
} from './motion';
import { ACCENT_DEFAULT, LIGHT, type SceneProps } from './palett';

const SCENES: Scene[] = [
  { name: 'Öppning', dur: 2.5 },
  { name: 'Skanning', dur: 3.5 },
  { name: 'Hittat', dur: 3.5 },
  { name: 'Summan', dur: 3.5 },
  { name: 'Avslut', dur: 2 },
];

const CX = 140;
const CY = 300;
const CW = 1008;
const COLW = 132;
const GAP = 14;
const colX = (i: number) => CX + i * (COLW + GAP);
const DAYS = ['Mån', 'Tis', 'Ons', 'Tor', 'Fre', 'Lör', 'Sön'];

type Block = { d: number; y: number; h: number; t: string; m?: number };
const BLOCKS: Block[] = [
  { d: 0, y: 18, h: 130, t: '07–15' },
  { d: 0, y: 168, h: 92, t: '16–21' },
  { d: 1, y: 18, h: 150, t: '07–17', m: 0 },
  { d: 2, y: 58, h: 120, t: '10–18', m: 1 },
  { d: 3, y: 18, h: 110, t: '07–14' },
  { d: 3, y: 148, h: 100, t: '15–21' },
  { d: 4, y: 98, h: 140, t: '12–20', m: 2 },
  { d: 5, y: 38, h: 170, t: '08–19', m: 3 },
];

const MISSED = [
  { d: 1, day: 'Tis', label: '+1,5 h', kr: 1526 },
  { d: 2, day: 'Ons', label: '+2 h', kr: 2034 },
  { d: 4, day: 'Fre', label: '+1 h', kr: 1017 },
  { d: 5, day: 'Lör', label: '+3,5 h', kr: 3560 },
];

const CARDX = 1230;
const CARDY = 330;

const captionItems = (CUES: Record<string, number>, AT: number): CaptionItem[] => [
  { at: CUES.Skanning + 0.35, text: 'Assistenten går igenom ditt fakturaunderlag' },
  { at: CUES.Hittat + 0.3, text: 'Ofakturerade timmar hittas åt dig' },
  { at: CUES.Summan + 0.5, until: AT - 1.15, text: 'Pengar du redan har jobbat in' },
];

export default function MissadeTimmarAnimation({
  variant = 'original',
  accent = ACCENT_DEFAULT,
  captions = true,
  loop = true,
  brand = true,
  theme = 'light',
  paused = false,

  posterTime = 12.9,
  radius = 0,
  className,
  style,
  ariaLabel = 'Animation: assistenten granskar fakturaunderlaget och hittar 8 137 kronor i ofakturerade timmar.',
}: SceneProps) {
  const p = theme === 'dark' ? SCENE_DARK[variant] : LIGHT[variant];

  return (
    <AnimationStage
      scenes={SCENES}
      bg={p.BG}
      loop={loop}
      paused={paused}
      posterTime={posterTime}
      radius={radius}
      className={className}
      style={style}
      ariaLabel={ariaLabel}
      overlay={({ T, CUES, AT }) =>
        captions ? (
          <Captions T={T} items={captionItems(CUES, AT)} color={p.CAPTION} bottom="3.5%" />
        ) : null
      }
    >
      {({ T, CUES, AT }) => {
        const skan = CUES.Skanning;
        const hittat = CUES.Hittat;
        const summan = CUES.Summan;
        const D = MOTION.draw;

        const worldO = brand ? D(T, 0.4, 0.5) * (1 - D(T, AT - 1.3, 0.75)) : D(T, 0, 0.5);
        const brandO = clamp((1 - D(T, 0.18, 0.55)) + D(T, AT - 1.0, 0.6), 0, 1);

        const wob = Math.sin((2 * Math.PI * T) / AT);
        const camE = Easing.easeInOutCubic;
        const camKeys = [0, skan, skan + 0.3, skan + 2.95, hittat + 0.4, summan + 0.2, summan + 1.0, AT - 1.0];
        const camS = interpolate(camKeys, [1, 1, 1.05, 1.05, 1.02, 1.02, 1.13, brand ? 1 : 1.13], camE)(T);
        const camX = interpolate(camKeys, [0, 0, 48, -48, 0, 0, -168, brand ? 0 : -168], camE)(T);

        const scanStart = skan + 0.25;
        const scanDur = 2.7;
        const scanX = CX + CW * P(T, scanStart, scanDur);
        const scanO = D(T, scanStart - 0.15, 0.25) * (1 - D(T, scanStart + scanDur - 0.05, 0.3));
        const flagT = (m: (typeof MISSED)[number]) =>
          scanStart + scanDur * ((colX(m.d) + COLW / 2 - CX) / CW);

        const calDim = 1 - 0.62 * D(T, summan, 0.6);
        const sum = MISSED.reduce(
          (acc, m, i) => acc + m.kr * D(T, hittat + 0.2 + i * 0.5 + 0.4, 0.5),
          0
        );
        const bigPulse = 1 + 0.06 * Math.sin(Math.PI * P(T, summan + 0.3, 0.5));


        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: p.BG,
              overflow: 'hidden',
              fontFamily: FONT_SANS,
              color: p.INK,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 120 + 90 * wob,
                top: -200 + 44 * wob,
                width: 800,
                height: 800,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${withAlpha(accent, 0.125)} 0%, transparent 68%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 60 - 90 * wob,
                bottom: -240 - 44 * wob,
                width: 880,
                height: 880,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${withAlpha(accent, 0.102)} 0%, transparent 68%)`,
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: worldO,
                transform: 'translateX(' + camX + 'px) scale(' + camS + ')',
                transformOrigin: '960px 560px',
              }}
            >
              {/* Rubrik */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 66, textAlign: 'center' }}>
                <div
                  style={{
                    ...MOTION.enter(T, 0.4),
                    fontFamily: FONT_MONO,
                    fontSize: 16,
                    letterSpacing: 5,
                    color: p.DIM,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 9,
                      height: 9,
                      borderRadius: '50%',
                      background: accent,
                      marginRight: 12,
                      verticalAlign: '1px',
                    }}
                  />
                  DIN ASSISTENT GRANSKAR UNDERLAGET
                </div>
                <div
                  style={{
                    ...MOTION.enter(T, 0.65),
                    fontSize: 78,
                    fontWeight: 800,
                    letterSpacing: -2,
                    marginTop: 12,
                  }}
                >
                  Timmar du missat att fakturera.
                </div>
              </div>

              {/* Veckokalendern */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  top: 0,
                  opacity: calDim,
                  transform: 'scale(' + (1 - 0.02 * D(T, summan, 0.6)) + ')',
                  transformOrigin: CX + CW / 2 + 'px 620px',
                }}
              >
                {DAYS.map((d, i) => (
                  <div
                    key={d}
                    style={{
                      ...MOTION.enter(T, 0.9 + i * 0.05, 0.5),
                      position: 'absolute',
                      left: colX(i),
                      top: CY,
                      width: COLW,
                      textAlign: 'center',
                      fontFamily: FONT_MONO,
                      fontSize: 16,
                      letterSpacing: 2,
                      color: p.DIM,
                    }}
                  >
                    {d.toUpperCase()}
                  </div>
                ))}
                {DAYS.map((d, i) => (
                  <div
                    key={'l' + d}
                    style={{
                      position: 'absolute',
                      left: colX(i),
                      top: CY + 40,
                      width: COLW,
                      height: 560,
                      borderRadius: 14,
                      background: p.PLATE,
                      opacity: D(T, 0.9 + i * 0.05, 0.5),
                    }}
                  />
                ))}
                <div
                  style={{
                    position: 'absolute',
                    left: colX(6) + 10,
                    top: CY + 60,
                    width: COLW - 20,
                    height: 90,
                    borderRadius: 10,
                    border: '2px dashed ' + p.LINE,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 15,
                    color: p.DIM,
                    opacity: D(T, 1.5, 0.5),
                  }}
                >
                  Ledig
                </div>

                {BLOCKS.map((b, i) => {
                  const inP = MOTION.enter(T, 1.1 + i * 0.08, 0.55);
                  const isM = b.m !== undefined;
                  const fp = isM ? D(T, flagT(MISSED[b.m as number]), 0.35) : 0;
                  return (
                    <div
                      key={i}
                      style={{
                        position: 'absolute',
                        left: colX(b.d) + 8,
                        top: CY + 46 + b.y,
                        width: COLW - 16,
                        height: b.h,
                        borderRadius: 10,
                        background: fp > 0 ? withAlpha(accent, 0.1 * fp) : p.BLOCK,
                        border:
                          fp > 0
                            ? '2px solid ' + withAlpha(accent, 0.35 + 0.65 * fp)
                            : '2px solid transparent',
                        boxSizing: 'border-box',
                        opacity: inP.opacity,
                        transform: inP.transform,
                        boxShadow: fp > 0.5 ? '0 10px 26px ' + withAlpha(accent, 0.2) : 'none',
                      }}
                    >
                      <div
                        style={{
                          fontFamily: FONT_MONO,
                          fontSize: 14,
                          color: fp > 0.5 ? p.INK : p.DIM,
                          padding: '8px 0 0 10px',
                        }}
                      >
                        {b.t}
                      </div>
                      {isM && fp > 0.15 && (
                        <div
                          style={{
                            position: 'absolute',
                            left: 10,
                            bottom: 8,
                            fontFamily: FONT_MONO,
                            fontSize: 13,
                            fontWeight: 600,
                            color: p.INK,
                            opacity: fp,
                          }}
                        >
                          {MISSED[b.m as number].label}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Skanningslinje */}
                <div
                  style={{
                    position: 'absolute',
                    left: scanX - 46,
                    top: CY + 34,
                    width: 46,
                    height: 578,
                    background: `linear-gradient(90deg, transparent, ${withAlpha(accent, 0.18)})`,
                    opacity: scanO,
                  }}
                />
                <div
                  style={{
                    position: 'absolute',
                    left: scanX - 2,
                    top: CY + 34,
                    width: 4,
                    height: 578,
                    borderRadius: 2,
                    background: accent,
                    boxShadow: '0 0 24px ' + accent,
                    opacity: scanO,
                  }}
                />
              </div>

              {/* Flygande pillar */}
              {MISSED.map((m, i) => {
                const t0 = flagT(m);
                const pillO = D(T, t0 + 0.1, 0.3);
                const fs = hittat + 0.2 + i * 0.5;
                const fp2 = Easing.easeInOutCubic(P(T, fs, 0.6));
                const b = BLOCKS.find((bb) => bb.m === i) as Block;
                const x0 = colX(m.d) + COLW / 2;
                const y0 = CY + 46 + b.y + 8;
                const x1 = CARDX + 70 + 200;
                const y1 = CARDY + 268 + i * 58 + 24;
                const px = lerp(x0, x1, fp2);
                const py = lerp(y0, y1, fp2) - 52 * Math.sin(Math.PI * fp2);
                const arrived = T >= fs + 0.58;
                return (
                  <div
                    key={i}
                    style={{
                      position: 'absolute',
                      left: px,
                      top: py,
                      transform: 'translate(-50%,-50%) scale(' + (0.8 + 0.2 * pillO) + ')',
                      opacity: pillO * (arrived ? 0 : 1),
                      background: accent,
                      color: p.ON_ACCENT,
                      fontFamily: FONT_MONO,
                      fontSize: 16,
                      fontWeight: 700,
                      padding: '8px 16px',
                      borderRadius: 999,
                      boxShadow: '0 10px 26px ' + withAlpha(accent, 0.333),
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {m.label}
                  </div>
                );
              })}

              {/* Summeringskortet */}
              <div
                style={{
                  ...MOTION.pop(T, hittat - 0.2, 0.6),
                  position: 'absolute',
                  left: CARDX,
                  top: CARDY,
                  width: 540,
                  height: 600,
                  borderRadius: 26,
                  background: p.SURFACE,
                  border: '2px solid ' + p.LINE,
                  boxShadow: `0 26px 64px rgba(${p.SHADOW_RGB},0.1)`,
                  padding: '38px 40px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontFamily: FONT_MONO, fontSize: 15.5, letterSpacing: 3, color: p.DIM }}>
                  OFAKTURERAT · DENNA MÅNAD
                </div>
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 14,
                    marginTop: 14,
                    transform: 'scale(' + bigPulse + ')',
                    transformOrigin: 'left center',
                  }}
                >
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 88,
                      fontWeight: 700,
                      letterSpacing: -2,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmt(sum)}
                  </div>
                  <div style={{ fontSize: 30, color: p.DIM }}>kr</div>
                </div>
                <div
                  style={{
                    ...MOTION.enter(T, hittat + 0.3, 0.5),
                    fontSize: 19,
                    color: p.DIM,
                    marginTop: 2,
                  }}
                >
                  hittat i ditt fakturaunderlag
                  {D(T, summan + 0.5, 0.4) > 0.1 && (
                    <span style={{ opacity: D(T, summan + 0.5, 0.4) }}> — på under en minut</span>
                  )}
                </div>
                <div style={{ marginTop: 26 }}>
                  {MISSED.map((m, i) => {
                    const rp = D(T, hittat + 0.2 + i * 0.5 + 0.5, 0.4);
                    return (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          height: 58,
                          borderBottom: '1.5px solid ' + p.LINE,
                          opacity: rp,
                          transform: 'translateY(' + (1 - rp) * 14 + 'px)',
                        }}
                      >
                        <div style={{ fontSize: 19.5, whiteSpace: 'nowrap' }}>
                          {m.day} · <span style={{ fontWeight: 700 }}>{m.label}</span>
                        </div>
                        <div
                          style={{
                            marginLeft: 'auto',
                            fontFamily: FONT_MONO,
                            fontSize: 21,
                            fontWeight: 600,
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmt(m.kr)} kr
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div
                  style={{
                    ...MOTION.pop(T, summan + 0.9, 0.55),
                    position: 'absolute',
                    left: 40,
                    right: 40,
                    bottom: 36,
                    height: 64,
                    borderRadius: 999,
                    background: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 22.5,
                    fontWeight: 700,
                    color: p.ON_ACCENT,
                    boxShadow: '0 16px 38px ' + withAlpha(accent, 0.333),
                  }}
                >
                  Sätt din assistent i arbete ›
                </div>
              </div>
            </div>


            {brand && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: brandO,
                  pointerEvents: 'none',
                  transform: 'scale(' + (1 + 0.014 * wob) + ')',
                }}
              >
                <div style={{ fontSize: 74, fontWeight: 800, letterSpacing: -2 }}>
                  vårdbemanning<span style={{ color: accent }}>.ai</span>
                </div>
                <div
                  style={{
                    fontFamily: FONT_MONO,
                    fontSize: 17,
                    letterSpacing: 5,
                    color: p.DIM,
                    marginTop: 20,
                  }}
                >
                  AI FÖR VÅRDENS KONSULTER
                </div>
              </div>
            )}

          </div>
        );
      }}
    </AnimationStage>
  );
}
