import React from 'react';
import { AbsoluteFill, Audio, Sequence, interpolate, staticFile } from 'remotion';
import { AUDIO_OUT_OFFSET, BGM_OFFSET_S, DURATION, FPS, OVERLAP, SFX, SHOTS, VO } from './timeline';
import { Background } from './lib/ui';
import { Hook } from './shots/Hook';
import { Meet } from './shots/Meet';
import { Scan } from './shots/Scan';
import { Deal } from './shots/Deal';
import { Ops } from './shots/Ops';
import { Approve } from './shots/Approve';
import { Outro } from './shots/Outro';

export type PromoProps = { bgm: boolean; vo: boolean };

const ORDER: [keyof typeof SHOTS, React.FC][] = [
  ['hook', Hook],
  ['meet', Meet],
  ['scan', Scan],
  ['deal', Deal],
  ['ops', Ops],
  ['approve', Approve],
  ['outro', Outro],
];

export const StaffanPromo: React.FC<PromoProps> = ({ bgm = true, vo = true }) => {
  return (
    <AbsoluteFill style={{ background: '#06070B' }}>
      <Background />
      {ORDER.map(([key, Comp]) => {
        const s = SHOTS[key];
        return (
          <Sequence key={key} name={key} from={s.from} durationInFrames={Math.min(s.dur + OVERLAP, DURATION - s.from)}>
            <Comp />
          </Sequence>
        );
      })}

      {bgm && (
        <Audio
          src={staticFile('audio/bgm/cat-walk.mp3')}
          trimBefore={Math.round(BGM_OFFSET_S * FPS)}
          volume={(f) =>
            interpolate(f, [0, 6, DURATION - 20, DURATION], [0, 0.34, 0.34, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }) *
            (vo ? 0.82 : 1)
          }
        />
      )}
      {vo &&
        VO.map((v, i) => (
          <Sequence key={`vo${i}`} name={`vo${i + 1}`} from={Math.max(0, v.from - AUDIO_OUT_OFFSET)} durationInFrames={140}>
            <Audio src={staticFile(v.src)} volume={1} />
          </Sequence>
        ))}
      {SFX.map((s, i) => (
        <Sequence key={`sfx${i}`} name={`sfx:${s.note}`} from={Math.max(0, s.from - AUDIO_OUT_OFFSET)} durationInFrames={s.dur ?? 90}>
          <Audio src={staticFile(`audio/sfx/${s.src}.mp3`)} volume={s.volume * (vo ? 0.8 : 1)} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
