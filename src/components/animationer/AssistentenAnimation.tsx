/**
 * Assistenten — "Fråga assistenten."
 *
 * Fem beats: chattfönstret kommer in → frågan skrivs och skickas → assistenten
 * läser ramavtal → svaret expanderar med pris och zonjämförelse → fyra verktyg
 * och varumärket.
 *
 * Portad rakt av från handoff-designen (assistent-scene.jsx).
 */
import { AnimationStage, Captions, FONT_MONO, FONT_SANS, type CaptionItem } from './AnimationStage';
import {
  animate,
  clamp,
  Easing,
  fmt,
  interpolate,
  lerp,
  MOTION,
  P,
  withAlpha,
  type Scene,
} from './motion';
import { ACCENT_DEFAULT, DARK, type SceneProps } from './palett';

const SCENES: Scene[] = [
  { name: 'Öppning', dur: 2 },
  { name: 'Frågan', dur: 3.5 },
  { name: 'Analys', dur: 2.5 },
  { name: 'Svaret', dur: 4 },
  { name: 'Verktyg', dur: 3.5 },
];

const WX = 510;
const WY = 210;
const WW = 900;
const WH = 620;
const Q = 'Vad betalar Stockholm för en leg. sjuksköterska?';
const TOOLS = ['Löneanalys', 'Pensionssimulator', 'Avtalsassistent', 'CV-assistenten'];
const ZDATA = [
  { z: 'Zon 1', v: 508 },
  { z: 'Zon 2', v: 545 },
  { z: 'Zon 3', v: 590 },
];

const captionItems = (CUES: Record<string, number>, AT: number): CaptionItem[] => [
  { at: CUES['Frågan'] + 0.3, text: 'Ställ frågan som du tänker den' },
  { at: CUES.Analys + 0.2, text: 'Assistenten läser regionernas ramavtal' },
  { at: CUES.Svaret + 0.7, text: 'Svar med källa — på sekunder' },
  { at: CUES.Verktyg + 0.45, until: AT - 1.15, text: 'Fyra verktyg. En assistent.' },
];

export default function AssistentenAnimation({
  variant = 'original',
  accent = ACCENT_DEFAULT,
  captions = true,
  loop = true,
  paused = false,
  posterTime = 13.2,
  radius = 0,
  className,
  style,
  ariaLabel = 'Animation: en fråga om lön ställs till assistenten, som svarar med timpris och källa ur SKR:s ramavtal.',
}: SceneProps) {
  const p = DARK[variant];

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
          <Captions T={T} items={captionItems(CUES, AT)} color={p.CAPTION} bottom="3%" />
        ) : null
      }
    >
      {({ T, CUES, AT }) => {
        const fraga = CUES['Frågan'];
        const analys = CUES.Analys;
        const svar = CUES.Svaret;
        const verktyg = CUES.Verktyg;
        const D = MOTION.draw;

        const worldO = D(T, 0.35, 0.5) * (1 - D(T, AT - 1.3, 0.75));
        const brandO = clamp((1 - D(T, 0.18, 0.55)) + D(T, AT - 1.0, 0.6), 0, 1);
        const cam = interpolate(
          [0, fraga, analys, analys + 0.7, svar + 0.5, verktyg - 0.5, verktyg + 0.7],
          [1, 1.02, 1.02, 1.13, 1.19, 1.19, 1],
          Easing.easeInOutCubic
        )(T);
        const wob = Math.sin((2 * Math.PI * T) / AT);

        const typeStart = fraga + 0.2;
        const typeDur = 2.0;
        const typed = Q.slice(0, Math.round(P(T, typeStart, typeDur) * Q.length));
        const send = fraga + 2.5;
        const sent = T >= send;
        const caretOn = T > typeStart - 0.3 && T < send && Math.floor(T * 3) % 2 === 0;
        const sendPulse = 1 + 0.22 * Math.sin(Math.PI * P(T, send - 0.18, 0.32));
        const fp = D(T, send, 0.55);
        const bub = {
          left: lerp(24, 332, fp),
          top: lerp(538, 76, fp),
          width: lerp(852, 540, fp),
        };
        const dotsO = MOTION.pop(T, analys + 0.1, 0.45).opacity * (1 - D(T, svar + 0.05, 0.25));
        const ansH = animate({ from: 0, to: 336, start: svar + 0.05, end: svar + 0.85 })(T);
        const ansV = animate({
          from: 0,
          to: 508,
          start: svar + 0.4,
          end: svar + 1.5,
          ease: Easing.easeOutQuart,
        })(T);
        const winLift = animate({ from: 0, to: -30, start: verktyg - 0.3, end: verktyg + 0.5 })(T);
        const chips = ['Läser ramavtal SKR 2026', 'Zon 1 · Storstad', 'Beräknar marginal'];


        return (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: p.BG,
              overflow: 'hidden',
              fontFamily: FONT_SANS,
              color: p.TXT,
            }}
          >
            <div
              style={{
                position: 'absolute',
                left: 180 + 100 * wob,
                top: -260 + 50 * wob,
                width: 900,
                height: 900,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${withAlpha(accent, 0.09)} 0%, transparent 66%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 40 - 100 * wob,
                bottom: -300 - 50 * wob,
                width: 940,
                height: 940,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${withAlpha(accent, 0.07)} 0%, transparent 66%)`,
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: worldO,
                transform: 'scale(' + cam + ')',
                transformOrigin: '840px 560px',
              }}
            >
              {/* Rubrik */}
              <div style={{ position: 'absolute', left: 0, right: 0, top: 62, textAlign: 'center' }}>
                <div
                  style={{
                    ...MOTION.enter(T, 0.4),
                    fontFamily: FONT_MONO,
                    fontSize: 16,
                    letterSpacing: 5,
                    color: accent,
                  }}
                >
                  AI FÖR VÅRDENS KONSULTER
                </div>
                <div
                  style={{
                    ...MOTION.enter(T, 0.65),
                    fontSize: 72,
                    fontWeight: 800,
                    letterSpacing: -2,
                    marginTop: 14,
                  }}
                >
                  Fråga assistenten.
                </div>
              </div>

              {/* Chattfönstret */}
              <div
                style={{
                  ...MOTION.enter(T, 0.95, 0.7),
                  position: 'absolute',
                  left: WX,
                  top: WY + winLift,
                  width: WW,
                  height: WH,
                  borderRadius: 24,
                  background: p.PANEL,
                  border: '1px solid ' + p.LINE,
                  boxShadow: '0 40px 90px rgba(0,0,0,0.45)',
                  overflow: 'hidden',
                }}
              >
                {/* Titelrad */}
                <div
                  style={{
                    height: 54,
                    borderBottom: '1px solid ' + p.LINE,
                    display: 'flex',
                    alignItems: 'center',
                    padding: '0 24px',
                    gap: 12,
                  }}
                >
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: accent }} />
                  <div style={{ fontSize: 17, fontWeight: 600 }}>assistenten</div>
                  <div
                    style={{
                      marginLeft: 'auto',
                      fontFamily: FONT_MONO,
                      fontSize: 13.5,
                      letterSpacing: 2,
                      color: p.DIM,
                      whiteSpace: 'nowrap',
                    }}
                  >
                    RAMAVTAL SKR 2026
                  </div>
                </div>

                {/* Inmatningsfält */}
                <div
                  style={{
                    position: 'absolute',
                    left: 24,
                    top: 538,
                    width: 852,
                    height: 56,
                    borderRadius: 14,
                    background: p.PANEL2,
                    border: '1px solid ' + p.LINE,
                    opacity: sent ? 0.55 : 1,
                  }}
                />
                {!sent && !typed && (
                  <div style={{ position: 'absolute', left: 44, top: 552, fontSize: 21, color: p.DIM }}>
                    Ställ en fråga om lön, avtal eller pension …
                  </div>
                )}

                {/* Frågan: skrivs i fältet och flyger upp som bubbla */}
                <div
                  style={{
                    position: 'absolute',
                    left: bub.left,
                    top: bub.top,
                    width: bub.width,
                    minHeight: 56,
                    borderRadius: fp < 0.05 ? 14 : '18px 18px 4px 18px',
                    background: withAlpha(accent, 0.13 * fp),
                    border: '1.5px solid ' + withAlpha(accent, 0.55 * fp),
                    display: sent || typed ? 'flex' : 'none',
                    alignItems: 'center',
                    padding: '12px 20px',
                    boxSizing: 'border-box',
                    fontSize: 21,
                    lineHeight: 1.4,
                    color: p.TXT,
                    justifyContent: fp > 0.5 ? 'flex-end' : 'flex-start',
                    textAlign: fp > 0.5 ? 'right' : 'left',
                  }}
                >
                  <span>
                    {typed}
                    {caretOn && <span style={{ color: accent }}>|</span>}
                  </span>
                </div>

                {/* Skicka-knapp */}
                <div
                  style={{
                    position: 'absolute',
                    right: 32,
                    top: 546,
                    width: 40,
                    height: 40,
                    borderRadius: '50%',
                    background: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: p.ON_ACCENT,
                    fontSize: 22,
                    fontWeight: 800,
                    transform: 'scale(' + sendPulse + ')',
                  }}
                >
                  ›
                </div>

                {/* Skrivindikator */}
                <div
                  style={{
                    position: 'absolute',
                    left: 40,
                    top: 180,
                    width: 100,
                    height: 52,
                    borderRadius: '18px 18px 18px 4px',
                    background: p.PANEL2,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 10,
                    opacity: dotsO,
                  }}
                >
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: p.DIM,
                        opacity: 0.35 + 0.65 * Math.abs(Math.sin(3.2 * T - i * 0.75)),
                      }}
                    />
                  ))}
                </div>

                {/* Analyssteg */}
                {chips.map((c, i) => {
                  const pp = MOTION.pop(T, analys + 0.45 + i * 0.5, 0.45);
                  return (
                    <div
                      key={c}
                      style={{
                        position: 'absolute',
                        left: 40,
                        top: 262 + i * 56,
                        height: 44,
                        borderRadius: 999,
                        background: withAlpha(p.TXT, 0.06),
                        border: '1px solid ' + p.LINE,
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '0 20px 0 10px',
                        opacity: pp.opacity * (1 - D(T, svar + 0.05, 0.3)),
                        transform: pp.transform,
                      }}
                    >
                      <div
                        style={{
                          width: 24,
                          height: 24,
                          borderRadius: '50%',
                          background: accent,
                          color: p.ON_ACCENT,
                          fontSize: 14,
                          fontWeight: 800,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        ✓
                      </div>
                      <div style={{ fontSize: 17.5, color: p.TXT, whiteSpace: 'nowrap' }}>{c}</div>
                    </div>
                  );
                })}

                {/* Svarsbubblan */}
                <div
                  style={{
                    position: 'absolute',
                    left: 40,
                    top: 180,
                    width: 600,
                    height: ansH,
                    borderRadius: '18px 18px 18px 4px',
                    background: p.PANEL2,
                    border: '1px solid ' + p.LINE,
                    overflow: 'hidden',
                    opacity: ansH > 4 ? 1 : 0,
                    padding: '0 28px',
                    boxSizing: 'border-box',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, marginTop: 24 }}>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 74,
                        fontWeight: 700,
                        color: accent,
                        letterSpacing: -2,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmt(ansV)}
                    </div>
                    <div style={{ fontSize: 26, color: p.DIM }}>kr/h</div>
                    <div
                      style={{
                        marginLeft: 'auto',
                        fontFamily: FONT_MONO,
                        fontSize: 14,
                        letterSpacing: 1.5,
                        color: p.DIM,
                        border: '1px solid ' + p.LINE,
                        borderRadius: 999,
                        padding: '6px 14px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      ZON 1 · STORSTAD
                    </div>
                  </div>
                  <div
                    style={{
                      ...MOTION.enter(T, svar + 0.9, 0.5),
                      fontSize: 19,
                      color: p.DIM,
                      marginTop: 2,
                    }}
                  >
                    som företagare, enligt SKR:s ramavtal 2026
                  </div>
                  <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {ZDATA.map((z, i) => {
                      const bp = D(T, svar + 1.6 + i * 0.18, 0.8);
                      return (
                        <div key={z.z} style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                          <div
                            style={{
                              width: 64,
                              fontSize: 16.5,
                              color: i === 0 ? p.TXT : p.DIM,
                              fontWeight: i === 0 ? 700 : 400,
                            }}
                          >
                            {z.z}
                          </div>
                          <div
                            style={{
                              width: 330,
                              height: 12,
                              borderRadius: 6,
                              background: withAlpha(p.TXT, 0.07),
                            }}
                          >
                            <div
                              style={{
                                width: 330 * (z.v / 590) * bp,
                                height: 12,
                                borderRadius: 6,
                                background: i === 0 ? accent : withAlpha(accent, 0.32),
                              }}
                            />
                          </div>
                          <div
                            style={{
                              fontFamily: FONT_MONO,
                              fontSize: 17,
                              fontWeight: 600,
                              color: i === 0 ? p.TXT : p.DIM,
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {fmt(z.v * bp)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Verktygsraden */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 886,
                  display: 'flex',
                  justifyContent: 'center',
                  gap: 18,
                }}
              >
                {TOOLS.map((t, i) => {
                  const pp = MOTION.pop(T, verktyg + 0.2 + i * 0.15, 0.5);
                  return (
                    <div
                      key={t}
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '15px 28px',
                        borderRadius: 999,
                        background: p.PANEL,
                        border: '1px solid ' + p.LINE,
                        fontSize: 21,
                        fontWeight: 600,
                        opacity: pp.opacity,
                        transform: pp.transform,
                      }}
                    >
                      <div
                        style={{ width: 10, height: 10, borderRadius: '50%', background: accent }}
                      />
                      {t}
                    </div>
                  );
                })}
              </div>
            </div>


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
          </div>
        );
      }}
    </AnimationStage>
  );
}
