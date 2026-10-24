import React from 'react';
import { Composition } from 'remotion';
import { StaffanPromo, PromoProps } from './Main';
import { DURATION, FPS } from './timeline';
import { H, W } from './theme';

export const Root: React.FC = () => (
  <Composition
    id="StaffanPromo"
    component={StaffanPromo as React.FC<PromoProps>}
    durationInFrames={DURATION}
    fps={FPS}
    width={W}
    height={H}
    defaultProps={{ bgm: true, vo: true } as PromoProps}
  />
);
