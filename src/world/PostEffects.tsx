import React, { useMemo } from 'react';
import * as THREE from 'three';
import {
  Bloom,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  HueSaturation,
  Vignette,
} from '@react-three/postprocessing';
import { TrackId } from '../data/types';
import { getGameData } from '../data/gameData';
import { useGameStore } from '../store/useGameStore';
import { getActiveSession } from '../game/loop';

export const PostEffects: React.FC<{
  trackId: TrackId;
  photoDof?: number;
  photoWarmth?: number;
  photoFilter?: 'none' | 'warm' | 'fresh' | 'faded';
}> = ({ trackId, photoDof = 0, photoWarmth = 0, photoFilter = 'none' }) => {
  const quality = useGameStore((s) => s.settings.quality);
  const reducedMotion = useGameStore((s) => s.settings.reducedMotion);
  const photoMode = useGameStore((s) => s.photoMode);
  const screen = useGameStore((s) => s.screen);

  const data = getGameData();
  const preset = data.theme.qualityPresets[quality];
  if (!preset.postprocessing) return null;

  const lightCfg = data.theme.lighting[trackId] || data.theme.lighting['emerald-valley'];
  const session = getActiveSession();
  const flowSat = session?.flow.currentSaturation || 0;
  const flowChrom = reducedMotion ? 0 : session?.flow.currentChromatic || 0;
  const chromOffset = useMemo(() => new THREE.Vector2(flowChrom, flowChrom * 0.5), [flowChrom]);

  let filterSatOffset = 0;
  let filterHueOffset = photoWarmth * 0.05;
  if (photoFilter === 'warm') {
    filterSatOffset = 0.12;
    filterHueOffset += 0.04;
  } else if (photoFilter === 'fresh') {
    filterSatOffset = 0.18;
    filterHueOffset -= 0.03;
  } else if (photoFilter === 'faded') {
    filterSatOffset = -0.22;
  }

  const showDof = (photoMode && photoDof > 0.05) || screen === 'menu';

  return (
    <EffectComposer multisampling={0}>
      <Bloom
        intensity={lightCfg.bloom * 1.1}
        luminanceThreshold={0.78}
        luminanceSmoothing={0.4}
        mipmapBlur
      />
      <HueSaturation
        hue={filterHueOffset}
        saturation={Math.min(0.4, (lightCfg.saturation - 1) + flowSat + filterSatOffset)}
      />
      <ChromaticAberration
        offset={chromOffset}
        radialModulation={false}
        modulationOffset={0.15}
      />
      <Vignette
        eskil={false}
        offset={0.22}
        darkness={lightCfg.vignette + 0.12}
      />
      {showDof ? (
        <DepthOfField
          focusDistance={0.015}
          focalLength={0.035}
          bokehScale={screen === 'menu' ? 1.8 : photoDof * 4.5}
        />
      ) : (
        <></>
      )}
    </EffectComposer>
  );
};
