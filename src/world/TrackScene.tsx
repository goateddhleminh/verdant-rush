import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { TrackId } from '../data/types';
import { getGameData, getVehicleById } from '../data/gameData';
import { getCachedTexture, loadGltfCached } from '../data/assetLoader';
import { getDefaultCustomisation, useGameStore } from '../store/useGameStore';
import { getActiveSession } from '../game/loop';
import { InstancedProps } from './InstancedProps';
import { LivingWorld } from './LivingWorld';
import { VehicleMesh } from '../vehicles/VehicleMesh';
import { RaceCamera } from './RaceCamera';
import { PostEffects } from './PostEffects';

export const TrackScene: React.FC<{
  photoSettings?: {
    fov: number;
    dof: number;
    warmth: number;
    filter: 'none' | 'warm' | 'fresh' | 'faded';
  };
}> = ({ photoSettings }) => {
  const screen = useGameStore((s) => s.screen);
  const raceTrackId = useGameStore((s) => s.raceConfig.trackId);
  const gentleRain = useGameStore((s) => s.raceConfig.gentleRain);
  const selectedVehicleId = useGameStore((s) => s.selectedVehicleId);
  const settings = useGameStore((s) => s.settings);
  const customisations = useGameStore((s) => s.customisations);

  const activeTrackId: TrackId =
    screen === 'race' || screen === 'results'
      ? raceTrackId
      : 'emerald-valley';

  const data = getGameData();
  const trackDef = data.tracks.find((t) => t.id === activeTrackId) || data.tracks[0];
  const lightCfg = data.theme.lighting[activeTrackId];
  const qualityPreset = data.theme.qualityPresets[settings.quality];

  const [mapScene, setMapScene] = useState<THREE.Group | null>(null);
  const waterMatRef = useRef<THREE.MeshStandardMaterial | null>(null);
  const sunLightRef = useRef<THREE.DirectionalLight>(null);

  const skyTex = getCachedTexture('images/sky-day.jpg');
  const floorTex = getCachedTexture('textures/tex-forest-floor.jpg');
  const waterNormalTex = getCachedTexture('textures/tex-water-normal.png');
  const godrayTex = getCachedTexture('particles/godray.png');

  // Load track map GLB
  useEffect(() => {
    let mounted = true;
    loadGltfCached(trackDef.models.map)
      .then((gltf) => {
        if (!mounted) return;
        const clone = gltf.scene.clone(true);
        clone.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            m.receiveShadow = true;
            if (m.name === 'water' || (m.material as THREE.Material)?.name?.includes('Water')) {
              const wMat = new THREE.MeshStandardMaterial({
                color: '#2FB3B0',
                roughness: 0.18,
                metalness: 0.1,
                transparent: true,
                opacity: 0.82,
                normalMap: waterNormalTex || null,
                normalScale: new THREE.Vector2(0.35, 0.35),
              });
              m.material = wMat;
              waterMatRef.current = wMat;
            }
          }
        });
        setMapScene(clone);
      })
      .catch(() => {
        if (mounted) setMapScene(null);
      });
    return () => {
      mounted = false;
    };
  }, [trackDef.models.map, waterNormalTex]);

  // Animate water ripples and keep directional shadow frustum centered near player
  useFrame(({ clock }) => {
    if (waterNormalTex) {
      const t = clock.getElapsedTime();
      waterNormalTex.offset.set(t * 0.03, t * 0.02);
    }
    const session = getActiveSession();
    if (sunLightRef.current && session && screen === 'race') {
      const p = session.player.renderPosition;
      sunLightRef.current.position.set(
        p.x + lightCfg.sun.position[0] * 0.5,
        p.y + lightCfg.sun.position[1] * 0.6,
        p.z + lightCfg.sun.position[2] * 0.5
      );
      sunLightRef.current.target.position.copy(p);
      sunLightRef.current.target.updateMatrixWorld();
    }
  });

  // God-rays positions along Emerald Valley & Amber Woods
  const godRayPositions = useMemo(() => {
    if (activeTrackId === 'lakeside-haven') return [];
    return [
      [180, 18, 95],
      [-40, 16, 130],
      [-260, 14, 70],
      [-140, 17, -105],
      [120, 15, -145],
      [290, 18, -40],
    ] as [number, number, number][];
  }, [activeTrackId]);

  const playerVehicleDef = getVehicleById(selectedVehicleId);
  const playerCustomisation = customisations[selectedVehicleId] || getDefaultCustomisation(selectedVehicleId);
  const session = getActiveSession();

  // Garage Turntable Scene
  if (screen === 'garage') {
    return (
      <>
        <color attach="background" args={['#1F3D2B']} />
        <fogExp2 attach="fog" args={['#1F3D2B', 0.025]} />
        <ambientLight intensity={0.8} color="#F5EFD9" />
        <hemisphereLight args={['#FFF1CF', '#2b4c38', 1.2]} />
        <directionalLight
          position={[6, 10, 6]}
          intensity={2.8}
          color="#FFF1CF"
          castShadow={qualityPreset.shadows}
        />
        <spotLight
          position={[-5, 7, -4]}
          intensity={1.6}
          color="#F2B544"
          angle={0.7}
        />

        {/* Wooden / Moss Turntable Pedestal */}
        <group position={[0, -0.02, 0]}>
          <mesh receiveShadow position={[0, -0.12, 0]}>
            <cylinderGeometry args={[2.85, 3.1, 0.24, 48]} />
            <meshStandardMaterial color="#2b4c38" roughness={0.6} />
          </mesh>
          <mesh receiveShadow position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
            <ringGeometry args={[2.65, 2.78, 48]} />
            <meshBasicMaterial color="#F2B544" side={THREE.DoubleSide} />
          </mesh>
        </group>

        <VehicleMesh
          vehicleDef={playerVehicleDef}
          customisation={playerCustomisation}
          isPlayer
          turntableMode
        />
        <RaceCamera />
      </>
    );
  }

  return (
    <>
      {/* Sky Dome */}
      <mesh scale={[-1, 1, 1]}>
        <sphereGeometry args={[1400, 32, 20]} />
        <meshBasicMaterial
          map={skyTex || null}
          color={lightCfg.skyTint}
          side={THREE.BackSide}
          depthWrite={false}
          fog={false}
        />
      </mesh>

      {/* Fog & Warm Sunlit Lighting */}
      <fogExp2 attach="fog" args={[lightCfg.fog.color, lightCfg.fog.density * 0.75]} />
      <hemisphereLight
        args={[lightCfg.hemi.sky, lightCfg.hemi.ground, lightCfg.hemi.intensity]}
      />
      <directionalLight
        ref={sunLightRef}
        position={lightCfg.sun.position}
        color={lightCfg.sun.color}
        intensity={lightCfg.sun.intensity}
        castShadow={qualityPreset.shadows}
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={5}
        shadow-camera-far={260}
        shadow-camera-left={-65}
        shadow-camera-right={65}
        shadow-camera-top={65}
        shadow-camera-bottom={-65}
        shadow-bias={-0.0005}
      />

      {/* Track Map GLB (Road, Lane Lines, Kerbs, Gravel Shoulder, Displaced Terrain, Water) */}
      {mapScene && <primitive object={mapScene} />}

      {/* Large Extended Forest Floor Ground Plane */}
      <mesh position={[0, -5.5, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[2600, 2600]} />
        <meshStandardMaterial
          map={floorTex || null}
          color={activeTrackId === 'amber-woods' ? '#9e7044' : '#5BA55B'}
          roughness={0.95}
        />
      </mesh>

      {/* Lakeside Haven Crystal Turquoise Lake Plane */}
      {activeTrackId === 'lakeside-haven' && (
        <mesh position={[0, -0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[2200, 2200]} />
          <meshStandardMaterial
            color="#2FB3B0"
            roughness={0.15}
            metalness={0.15}
            normalMap={waterNormalTex || null}
            normalScale={new THREE.Vector2(0.4, 0.4)}
            transparent
            opacity={0.86}
          />
        </mesh>
      )}

      {/* Soft God-Ray Light Shafts through the trees */}
      {godrayTex &&
        godRayPositions.map((pos, i) => (
          <sprite key={i} position={pos} scale={[22, 38, 1]}>
            <spriteMaterial
              map={godrayTex}
              color={activeTrackId === 'amber-woods' ? '#FFC46B' : '#FFF1CF'}
              transparent
              opacity={0.16}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </sprite>
        ))}

      {/* Gentle Rain Rainbow Arc near Start/Finish */}
      {gentleRain && (
        <mesh position={[260, 22, 0]} rotation={[0, 0.4, 0]}>
          <torusGeometry args={[95, 3.2, 12, 48, Math.PI]} />
          <meshBasicMaterial
            color="#F2B544"
            transparent
            opacity={0.26}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </mesh>
      )}

      {/* Instanced Forest Trees, Wildflowers, Rocks, Fences, Bridges, Backdrop */}
      <InstancedProps
        trackId={activeTrackId}
        quality={settings.quality}
        shadowsEnabled={qualityPreset.shadows}
      />

      {/* Living World & Active Race Vehicles */}
      {(screen === 'race' || screen === 'results') && session && (
        <>
          <LivingWorld
            trackId={activeTrackId}
            quality={settings.quality}
            reducedMotion={settings.reducedMotion}
            gentleRain={gentleRain}
          />

          {/* Player Vehicle */}
          <VehicleMesh
            vehicleDef={session.player.vehicleDef}
            customisation={playerCustomisation}
            physicsState={session.player}
            isPlayer
          />

          {/* AI Rivals */}
          {session.rivals.map((rival) => (
            <VehicleMesh
              key={rival.id}
              vehicleDef={rival.physics.vehicleDef}
              customisation={rival.customisation}
              physicsState={rival.physics}
              rivalName={rival.name}
              rivalEmote={rival.emote}
              showRivalName={settings.showRivalNames}
            />
          ))}

          {/* Time Trial Best-Lap Ghost */}
          {session.playbackGhostSamples && session.playbackGhostSamples.length > 1 && (
            <GhostVehicleWrapper
              vehicleDef={session.player.vehicleDef}
              customisation={playerCustomisation}
            />
          )}
        </>
      )}

      <RaceCamera photoFov={photoSettings?.fov} />
      <PostEffects
        trackId={activeTrackId}
        photoDof={photoSettings?.dof}
        photoWarmth={photoSettings?.warmth}
        photoFilter={photoSettings?.filter}
      />
    </>
  );
};

const GhostVehicleWrapper: React.FC<{
  vehicleDef: any;
  customisation: any;
}> = ({ vehicleDef, customisation }) => {
  const groupRef = useRef<THREE.Group>(null);
  useFrame(() => {
    const session = getActiveSession();
    if (!session || !groupRef.current) return;
    groupRef.current.position.copy(session.ghostInterpolatedPos);
    groupRef.current.rotation.y = session.ghostInterpolatedYaw;
  });
  return (
    <group ref={groupRef}>
      <VehicleMesh
        vehicleDef={vehicleDef}
        customisation={{ ...customisation, color: '#8CCBEA', accent: '#F5EFD9' }}
        ghostOpacity={0.38}
      />
    </group>
  );
};
