/**
 * Lönekollen — "Vad är din tid värd?"
 *
 * Fem beats: rubriken landar → rollchips → zonkort → beloppet räknas upp →
 * prisnotis, och bilden tonar tillbaka till varumärket.
 *
 * Portad rakt av från handoff-designen (lonekollen-scene.jsx). Rörelsen är
 * bit-för-bit identisk; det som ändrats är att designverktygets runtime bytts
 * mot AnimationStage och att färgerna kommer från paletten.
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
import { ACCENT_DEFAULT, LIGHT, type SceneProps } from './palett';

const SCENES: Scene[] = [
  { name: 'Öppning', dur: 2.5 },
  { name: 'Roll', dur: 3 },
  { name: 'Zon', dur: 3 },
  { name: 'Belopp', dur: 4 },
  { name: 'Notis', dur: 3.5 },
];

const CHIPS = ['Barnmorska', 'Geriatriker', 'Anestesiläkare', 'IVA-sjuksköterska', 'Leg. sjuksköterska'];
const SEL = 2;
const CHIP_W = 300;
const CHIP_H = 66;
const CHIP_GAP = 24;
const CHIP_Y = 548;
const chipX = (i: number) => (1920 - (5 * CHIP_W + 4 * CHIP_GAP)) / 2 + i * (CHIP_W + CHIP_GAP);

const ZONES = [
  { t: 'Zon 1', s: 'Storstad', v: 1083 },
  { t: 'Zon 2', s: 'Mellannorrland', v: 1324 },
  { t: 'Zon 3', s: 'Glesbygd', v: 1564 },
];
const ZONE_W = 420;
const ZONE_H = 230;
const ZONE_GAP = 32;
const ZONE_Y = 470;
const zoneX = (i: number) => (1920 - (3 * ZONE_W + 2 * ZONE_GAP)) / 2 + i * (ZONE_W + ZONE_GAP);

const captionItems = (CUES: Record<string, number>, AT: number): CaptionItem[] => [
  { at: CUES.Roll + 0.25, text: '1 · Välj din roll' },
  { at: CUES.Zon + 0.25, text: '2 · Välj din zon' },
  { at: CUES.Belopp + 0.4, text: '3 · Se vad du kan fakturera' },
  { at: CUES.Notis + 0.35, until: AT - 1.2, text: 'Få notis vid varje prisjustering' },
];

export default function LonekollenAnimation({
  variant = 'original',
  accent = ACCENT_DEFAULT,
  captions = true,
  loop = true,
  paused = false,
  posterTime = 13.5,
  radius = 0,
  className,
  style,
  ariaLabel = 'Animation: välj roll och zon och se vad du kan fakturera som företagare, enligt regionernas ramavtal.',
}: SceneProps) {
  const p = LIGHT[variant];

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
          <Captions T={T} items={captionItems(CUES, AT)} color={p.CAPTION} bottom="4.5%" />
        ) : null
      }
    >
      {({ T, CUES, AT }) => {
        const roll = CUES.Roll;
        const zon = CUES.Zon;
        const belopp = CUES.Belopp;
        const notis = CUES.Notis;
        const D = MOTION.draw;

        const worldO = D(T, 0.45, 0.5) * (1 - D(T, AT - 1.35, 0.8));
        const brandO = clamp((1 - D(T, 0.2, 0.6)) + D(T, AT - 1.05, 0.6), 0, 1);
        const cam = interpolate(
          [0, roll, zon, belopp, belopp + 1.6, notis + 1.2, AT - 1.2],
          [1, 1.02, 1.035, 1.05, 1.09, 1.1, 1.0],
          Easing.easeInOutCubic
        )(T);
        const hUp = animate({ from: 0, to: -196, start: roll - 0.35, end: roll + 0.55 })(T);
        const hSc = animate({ from: 1, to: 0.6, start: roll - 0.35, end: roll + 0.55 })(T);
        const clickChip = roll + 1.75;
        const clickZone = zon + 2.05;
        const selChip = T >= clickChip + 0.08;
        const selZone = T >= clickZone + 0.08;
        const curEase = Easing.easeInOutCubic;
        const curX = interpolate(
          [roll + 0.9, roll + 1.6, zon + 1.1, zon + 1.95],
          [980, chipX(SEL) + CHIP_W / 2 + 8, chipX(SEL) + CHIP_W / 2 + 8, zoneX(2) + ZONE_W / 2 + 10],
          curEase
        )(T);
        const curY = interpolate(
          [roll + 0.9, roll + 1.6, zon + 1.1, zon + 1.95],
          [890, CHIP_Y + CHIP_H / 2 + 8, CHIP_Y + CHIP_H / 2 + 8, ZONE_Y + ZONE_H / 2 + 16],
          curEase
        )(T);
        const dip = (t0: number) => 1 - 0.16 * Math.sin(Math.PI * P(T, t0, 0.28));
        const curO =
          animate({ from: 0, to: 1, start: roll + 0.9, end: roll + 1.25 })(T) *
          (1 - D(T, belopp - 0.3, 0.4));
        const curS = dip(clickChip) * dip(clickZone);
        const mp = D(T, zon - 0.05, 0.75);
        const bigV = animate({
          from: 0,
          to: 1564,
          start: belopp + 0.55,
          end: belopp + 2.3,
          ease: Easing.easeOutQuart,
        })(T);
        const lonV = animate({
          from: 0,
          to: 1133,
          start: belopp + 0.8,
          end: belopp + 2.4,
          ease: Easing.easeOutQuart,
        })(T);
        const bar1 = D(T, belopp + 0.9, 1.1);
        const bar2 = D(T, belopp + 1.15, 1.1);
        const wob = Math.sin((2 * Math.PI * T) / AT);

        const ring = (t0: number, cx: number, cy: number) => {
          const pr = P(T, t0, 0.55);
          if (pr <= 0 || pr >= 1) return null;
          const s = 20 + 76 * Easing.easeOutCubic(pr);
          return (
            <div
              style={{
                position: 'absolute',
                left: cx - s / 2,
                top: cy - s / 2,
                width: s,
                height: s,
                borderRadius: '50%',
                border: '2.5px solid ' + accent,
                opacity: 1 - pr,
              }}
            />
          );
        };

        const chipRect = (i: number) =>
          i === SEL
            ? {
                left: lerp(chipX(SEL), 742, mp),
                top: lerp(CHIP_Y, 250, mp),
                width: lerp(CHIP_W, 236, mp),
                height: lerp(CHIP_H, 48, mp),
                fs: lerp(25, 19, mp),
              }
            : { left: chipX(i), top: CHIP_Y, width: CHIP_W, height: CHIP_H, fs: 25 };


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
            {/* Mjuka bakgrundsljus */}
            <div
              style={{
                position: 'absolute',
                left: 140 + 90 * wob,
                top: -180 + 40 * wob,
                width: 760,
                height: 760,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${withAlpha(accent, 0.133)} 0%, transparent 68%)`,
              }}
            />
            <div
              style={{
                position: 'absolute',
                right: 80 - 90 * wob,
                bottom: -220 - 40 * wob,
                width: 860,
                height: 860,
                borderRadius: '50%',
                background: `radial-gradient(circle, ${withAlpha(accent, 0.11)} 0%, transparent 68%)`,
              }}
            />

            <div
              style={{
                position: 'absolute',
                inset: 0,
                opacity: worldO,
                transform: 'scale(' + cam + ')',
                transformOrigin: '960px 560px',
              }}
            >
              {/* Rubrikblock */}
              <div
                style={{
                  position: 'absolute',
                  left: 0,
                  right: 0,
                  top: 330,
                  textAlign: 'center',
                  transform: 'translateY(' + hUp + 'px) scale(' + hSc + ')',
                  transformOrigin: '50% 0%',
                }}
              >
                <div
                  style={{
                    ...MOTION.enter(T, 0.55),
                    fontFamily: FONT_MONO,
                    fontSize: 17,
                    letterSpacing: 5,
                    color: p.DIM,
                    marginBottom: 22,
                  }}
                >
                  <span
                    style={{
                      display: 'inline-block',
                      width: 10,
                      height: 10,
                      borderRadius: '50%',
                      background: accent,
                      marginRight: 14,
                      verticalAlign: '2px',
                    }}
                  />
                  OPTIMERA TID, VILLKOR OCH AVTAL
                </div>
                <div
                  style={{
                    ...MOTION.enter(T, 0.8),
                    fontSize: 94,
                    fontWeight: 800,
                    letterSpacing: -2.5,
                    lineHeight: 1.02,
                  }}
                >
                  Vad är din tid värd?
                </div>
                <div
                  style={{
                    ...MOTION.enter(T, 1.15),
                    opacity: Easing.easeOutCubic(P(T, 1.15, 0.6)) * (1 - D(T, roll - 0.4, 0.4)),
                    fontSize: 27,
                    color: p.DIM,
                    marginTop: 24,
                    fontWeight: 500,
                  }}
                >
                  Transparent lönedata från regionernas ramavtal.
                </div>
              </div>

              {/* Rollchips */}
              {CHIPS.map((c, i) => {
                const r = chipRect(i);
                const inP = MOTION.pop(T, roll + 0.25 + i * 0.12);
                const outO = i === SEL ? 1 : 1 - D(T, zon - 0.15, 0.45);
                const sel = i === SEL && selChip;
                return (
                  <div
                    key={c}
                    style={{
                      position: 'absolute',
                      left: r.left,
                      top: r.top - (i === SEL ? 0 : 22 * D(T, zon - 0.15, 0.45)),
                      width: r.width,
                      height: r.height,
                      borderRadius: 999,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: r.fs,
                      fontWeight: 600,
                      background: sel ? accent : p.SURFACE,
                      color: p.INK,
                      border: '2px solid ' + (sel ? accent : p.LINE),
                      boxShadow: sel
                        ? '0 12px 30px ' + withAlpha(accent, 0.333)
                        : `0 8px 24px rgba(${p.SHADOW_RGB},0.06)`,
                      opacity: inP.opacity * outO,
                      transform: inP.transform,
                    }}
                  >
                    {c}
                  </div>
                );
              })}

              {/* Vald zon som chip bredvid rollen */}
              <div
                style={{
                  ...MOTION.pop(T, belopp + 0.15),
                  position: 'absolute',
                  left: 998,
                  top: 250,
                  width: 246,
                  height: 48,
                  borderRadius: 999,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 19,
                  fontWeight: 600,
                  background: p.SURFACE,
                  border: '2px solid ' + p.LINE,
                  boxShadow: `0 8px 24px rgba(${p.SHADOW_RGB},0.06)`,
                }}
              >
                Zon 3 · Glesbygd
              </div>

              {/* Zonkort */}
              {ZONES.map((z, i) => {
                const inP = MOTION.pop(T, zon + 0.3 + i * 0.15);
                const outP = D(T, belopp - 0.05, 0.5);
                const sel = i === 2 && selZone;
                return (
                  <div
                    key={z.t}
                    style={{
                      position: 'absolute',
                      left: zoneX(i),
                      top: ZONE_Y - 24 * outP - (sel ? 8 : 0),
                      width: ZONE_W,
                      height: ZONE_H,
                      borderRadius: 22,
                      background: p.SURFACE,
                      border: sel ? '3px solid ' + accent : '2px solid ' + p.LINE,
                      boxShadow: sel
                        ? '0 20px 46px ' + withAlpha(accent, 0.267)
                        : `0 12px 30px rgba(${p.SHADOW_RGB},0.07)`,
                      padding: '30px 34px',
                      boxSizing: 'border-box',
                      opacity: inP.opacity * (1 - outP),
                      transform: inP.transform,
                    }}
                  >
                    {sel && (
                      <div
                        style={{
                          ...MOTION.pop(T, clickZone + 0.12, 0.4),
                          position: 'absolute',
                          top: -16,
                          right: 26,
                          background: accent,
                          color: p.INK,
                          fontFamily: FONT_MONO,
                          fontSize: 12.5,
                          fontWeight: 600,
                          letterSpacing: 1.5,
                          padding: '7px 14px',
                          borderRadius: 999,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        HÖGST ERSÄTTNING
                      </div>
                    )}
                    <div style={{ fontSize: 31, fontWeight: 700 }}>{z.t}</div>
                    <div style={{ fontSize: 20, color: p.DIM, marginTop: 6 }}>{z.s}</div>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 35,
                        fontWeight: 600,
                        marginTop: 40,
                      }}
                    >
                      {fmt(z.v)} <span style={{ fontSize: 19, color: p.DIM }}>kr/h</span>
                    </div>
                    <div style={{ fontSize: 15, color: p.DIM, marginTop: 4 }}>som företagare</div>
                  </div>
                );
              })}

              {/* Beloppskortet */}
              <div
                style={{
                  ...MOTION.pop(T, belopp + 0.3, 0.6),
                  position: 'absolute',
                  left: 580,
                  top: 348,
                  width: 760,
                  height: 452,
                  borderRadius: 26,
                  background: p.SURFACE,
                  border: '2px solid ' + p.LINE,
                  boxShadow: `0 26px 64px rgba(${p.SHADOW_RGB},0.09)`,
                  padding: '42px 48px',
                  boxSizing: 'border-box',
                }}
              >
                <div style={{ fontFamily: FONT_MONO, fontSize: 16, letterSpacing: 3, color: p.DIM }}>
                  ERSÄTTNING · ANESTESILÄKARE · ZON 3
                </div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: 18, marginTop: 18 }}>
                  <div
                    style={{
                      fontFamily: FONT_MONO,
                      fontSize: 118,
                      fontWeight: 700,
                      letterSpacing: -3,
                      fontVariantNumeric: 'tabular-nums',
                    }}
                  >
                    {fmt(bigV)}
                  </div>
                  <div style={{ fontSize: 34, color: p.DIM, fontWeight: 500 }}>kr/h</div>
                  <div style={{ fontSize: 22, color: p.DIM, marginLeft: 'auto' }}>som företagare</div>
                </div>
                <div style={{ marginTop: 30, display: 'flex', flexDirection: 'column', gap: 20 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 132, fontSize: 19, color: p.DIM }}>Företagare</div>
                    <div style={{ width: 360, height: 14, borderRadius: 7, background: p.TRACK }}>
                      <div
                        style={{
                          width: 360 * bar1,
                          height: 14,
                          borderRadius: 7,
                          background: accent,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 21,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmt(1564 * bar1)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
                    <div style={{ width: 132, fontSize: 19, color: p.DIM }}>Löntagare</div>
                    <div style={{ width: 360, height: 14, borderRadius: 7, background: p.TRACK }}>
                      <div
                        style={{
                          width: 360 * (1133 / 1564) * bar2,
                          height: 14,
                          borderRadius: 7,
                          background: p.TRACK_FILL,
                        }}
                      />
                    </div>
                    <div
                      style={{
                        fontFamily: FONT_MONO,
                        fontSize: 21,
                        fontWeight: 600,
                        fontVariantNumeric: 'tabular-nums',
                      }}
                    >
                      {fmt(lonV)}
                    </div>
                  </div>
                </div>
                <div
                  style={{
                    ...MOTION.enter(T, belopp + 2.4, 0.5),
                    fontSize: 16,
                    color: p.DIM,
                    marginTop: 30,
                  }}
                >
                  Kundpris 1 953 kr/h · Källa: SKR:s ramavtal 2026
                </div>
              </div>

              {/* Prisnotis */}
              <div
                style={{
                  ...MOTION.pop(T, notis + 0.35, 0.55),
                  position: 'absolute',
                  left: 1206,
                  top: 300,
                  width: 392,
                  height: 108,
                  borderRadius: 20,
                  background: p.SURFACE,
                  border: '2px solid ' + p.LINE,
                  boxShadow: `0 22px 52px rgba(${p.SHADOW_RGB},0.14)`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 20,
                  padding: '0 26px',
                  boxSizing: 'border-box',
                }}
              >
                <div
                  style={{
                    width: 48,
                    height: 48,
                    borderRadius: '50%',
                    background: accent,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 24,
                    fontWeight: 800,
                    color: p.INK,
                    flexShrink: 0,
                  }}
                >
                  ↑
                </div>
                <div>
                  <div style={{ fontSize: 23, fontWeight: 700 }}>+4,2 % prisjustering</div>
                  <div style={{ fontSize: 17, color: p.DIM, marginTop: 3 }}>Notis skickad till dig</div>
                </div>
              </div>

              {ring(clickChip, chipX(SEL) + CHIP_W / 2 + 8, CHIP_Y + CHIP_H / 2 + 8)}
              {ring(clickZone, zoneX(2) + ZONE_W / 2 + 10, ZONE_Y + ZONE_H / 2 + 16)}

              {/* Markör */}
              <div
                style={{
                  position: 'absolute',
                  left: curX,
                  top: curY,
                  opacity: curO,
                  transform: 'translate(-50%,-50%) scale(' + curS + ')',
                  width: 26,
                  height: 26,
                  borderRadius: '50%',
                  background: p.SURFACE,
                  border: `2.5px solid rgba(${p.SHADOW_RGB},0.4)`,
                  boxShadow: `0 8px 20px rgba(${p.SHADOW_RGB},0.3)`,
                }}
              />
            </div>


            {/* Varumärke in/ut */}
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
