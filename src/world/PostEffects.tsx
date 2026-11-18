import React, { useMemo } from 'react';
import * as THREE from 'three';
import { ToneMappingMode } from 'postprocessing';
import {
  Bloom,
  BrightnessContrast,
  ChromaticAberration,
  DepthOfField,
  EffectComposer,
  HueSaturation,
  ToneMapping,
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
  const brightness = useGameStore((s) => s.settings.brightness ?? 1.0);
  const photoMode = useGameStore((s) => s.photoMode);
  const screen = useGameStore((s) => s.screen);

  const session = getActiveSession();
  const flowSat = session?.flow.currentSaturation || 0;
  const flowChrom = reducedMotion ? 0 : session?.flow.currentChromatic || 0;
  const chromOffset = useMemo(() => new THREE.Vector2(flowChrom, flowChrom * 0.5), [flowChrom]);

  const data = getGameData();
  const preset = data.theme.qualityPresets[quality];
  if (!preset || !preset.postprocessing) return null;

  const lightCfg = data.theme.lighting[trackId] || data.theme.lighting['emerald-valley'];

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
      {/* Subtle highlight bloom only for true specular glints, tail lights, and sun reflections */}
      <Bloom
        intensity={Math.min(0.16, (lightCfg.bloom || 0.2) * 0.55)}
        luminanceThreshold={0.93}
        luminanceSmoothing={0.15}
        mipmapBlur
      />
      {/* Player-tunable brightness & enhanced clarity contrast */}
      <BrightnessContrast
        brightness={(brightness - 1.0) * 0.3}
        contrast={0.06}
      />
      <HueSaturation
        hue={filterHueOffset}
        saturation={Math.min(0.32, (lightCfg.saturation - 1) * 0.5 + flowSat + filterSatOffset)}
      />
      <ChromaticAberration
        offset={chromOffset}
        radialModulation={false}
        modulationOffset={0.15}
      />
      <Vignette
        eskil={false}
        offset={0.24}
        darkness={lightCfg.vignette + 0.12}
      />
      {/* ACES Filmic Tone Mapping preserves rich dark forest shadows and prevents clipped whiteout */}
      <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
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
