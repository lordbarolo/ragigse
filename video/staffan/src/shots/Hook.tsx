import React from 'react';
import { AbsoluteFill, useCurrentFrame } from 'remotion';
import { C } from '../theme';
import { K, SHOTS } from '../timeline';
import { BlurWords, MarkerStroke } from '../lib/ui';
import { E, seg } from '../lib/motion';

// S1 Krok — blur-slide (demos/typography/blur-slide) + markerstreck under "dig".
export const Hook: React.FC = () => {
  const f = useCurrentFrame();
  const end = SHOTS.hook.dur;
  const out = seg(f, end - 6, end + 8, E.inOutCubic);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div
        style={{
          transform: `translateY(${-30 - out * 120}px) scale(${1 - out * 0.08})`,
          opacity: 1 - out,
          filter: out > 0 ? `blur(${out * 18}px)` : undefined,
        }}
      >
        <BlurWords
          start={1}
          fontSize={156}
          lines={[
            [{ t: 'Tänk' }, { t: 'om' }],
            [{ t: 'konsultchefen' }],
            [{ t: 'jobbade' }, { t: 'för' }, { t: 'dig?', accent: true, italic: true }],
          ]}
          renderWord={(w) =>
            w.accent ? (
              <>
                {w.t}
                <MarkerStroke start={K.hookMarker} len={240} seed={41} style={{ left: -10, bottom: -46 }} color={C.mint} />
              </>
            ) : (
              w.t
            )
          }
        />
      </div>
    </AbsoluteFill>
  );
};
