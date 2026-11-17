import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { QualityLevel, TrackId } from '../data/types';
import { getCachedTexture, getEnvironmentModelPath, loadGltfCached } from '../data/assetLoader';
import { getActiveSession } from '../game/loop';
import { ChaosEventType } from '../game/chaos';

const CHAOS_TYPE_TO_MODEL: Record<ChaosEventType, string> = {
  'deer-crossing': 'deer',
  'fallen-log': 'fallen-log',
  'falling-branch': 'falling-branch',
  'pumpkin-cart': 'pumpkin-cart',
  'rock-slide-pebbles': 'pebbles',
  'wind-gust': 'leaf-patch',
  'puddle': 'puddle',
  'slippery-leaves': 'leaf-patch',
  'seagull-flock': 'seagull',
};

const ChaosPropRender: React.FC<{
  modelId: string;
  index: number;
}> = ({ modelId, index }) => {
  const groupRef = useRef<THREE.Group>(null);
  const sparkleRef = useRef<THREE.Sprite>(null);
  const [sceneClone, setSceneClone] = useState<THREE.Group | null>(null);
  const sparkleTex = getCachedTexture('particles/sparkle.png');

  useEffect(() => {
    let mounted = true;
    loadGltfCached(getEnvironmentModelPath(modelId))
      .then((gltf) => {
        if (!mounted) return;
        const clone = gltf.scene.clone(true);
        clone.traverse((o) => {
          if ((o as THREE.Mesh).isMesh) {
            o.castShadow = true;
          }
        });
        setSceneClone(clone);
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, [modelId]);

  useFrame(({ clock }) => {
    const session = getActiveSession();
    if (!session || !groupRef.current) return;
    const inst = session.chaos.instances[index];
    if (!inst) return;

    groupRef.current.position.copy(inst.position);
    groupRef.current.rotation.y = inst.yaw;

    // Telegraph sparkle when player is within telegraphMeters
    if (sparkleRef.current) {
      const distSq = session.player.position.distanceToSquared(inst.position);
      const showTelegraph =
        distSq < inst.telegraphMeters * inst.telegraphMeters &&
        distSq > 25 &&
        !inst.triggeredByPlayer;
      sparkleRef.current.visible = showTelegraph;
      if (showTelegraph) {
        const s = 1.4 + Math.sin(clock.getElapsedTime() * 6 + index) * 0.4;
        sparkleRef.current.scale.set(s, s, 1);
      }
    }
  });

  return (
    <group ref={groupRef}>
      {sceneClone && <primitive object={sceneClone} />}
      {sparkleTex && (
        <sprite ref={sparkleRef} position={[0, 2.2, 0]} visible={false}>
          <spriteMaterial
            map={sparkleTex}
            color="#F2B544"
            transparent
            opacity={0.85}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
          />
        </sprite>
      )}
    </group>
  );
};

interface TrailParticle {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  age: number;
  maxAge: number;
  size: number;
}

const _dummyMat = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyScale = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();

export const LivingWorld: React.FC<{
  trackId: TrackId;
  quality: QualityLevel;
  reducedMotion: boolean;
  gentleRain: boolean;
}> = ({ trackId, quality, reducedMotion, gentleRain }) => {
  const session = getActiveSession();
  const chaosInstances = session?.chaos.instances || [];

  // Ambient floating leaves / pollen around player
  const ambientCount = reducedMotion
    ? 0
    : quality === 'low'
    ? 25
    : quality === 'medium'
    ? 55
    : 85;
  const ambientMeshRef = useRef<THREE.InstancedMesh>(null);
  const ambientOffsets = useMemo(() => {
    const arr = [];
    for (let i = 0; i < 90; i++) {
      arr.push({
        ox: (Math.random() - 0.5) * 44,
        oy: Math.random() * 14 + 0.5,
        oz: (Math.random() - 0.5) * 44,
        speedY: 0.7 + Math.random() * 1.1,
        phase: Math.random() * Math.PI * 2,
        scale: 0.22 + Math.random() * 0.25,
      });
    }
    return arr;
  }, []);

  // Rain streaks when Gentle Rain is enabled
  const rainCount = gentleRain && !reducedMotion ? 110 : 0;
  const rainMeshRef = useRef<THREE.InstancedMesh>(null);

  // Vehicle trail particles (smoke / dust / leaves)
  const MAX_TRAIL = 64;
  const smokeMeshRef = useRef<THREE.InstancedMesh>(null);
  const leafTrailMeshRef = useRef<THREE.InstancedMesh>(null);
  const smokePool = useRef<TrailParticle[]>(
    Array.from({ length: MAX_TRAIL }, () => ({
      active: false,
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      maxAge: 1,
      size: 1,
    }))
  );
  const leafPool = useRef<TrailParticle[]>(
    Array.from({ length: MAX_TRAIL }, () => ({
      active: false,
      x: 0,
      y: -100,
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: 0,
      maxAge: 1,
      size: 1,
    }))
  );
  const smokeIdx = useRef(0);
  const leafIdx = useRef(0);
  const emitAccum = useRef(0);

  // Tyre marks ring buffer
  const MAX_MARKS = 120;
  const tyreMarksRef = useRef<THREE.InstancedMesh>(null);
  const tyreMarkIdx = useRef(0);
  const tyreMarkTimer = useRef(0);

  // Sky birds flock circling overhead
  const birdsGroupRef = useRef<THREE.Group>(null);

  const leafTex = getCachedTexture(
    trackId === 'amber-woods'
      ? 'particles/leaf-amber.png'
      : 'particles/petal-pollen.png'
  );
  const smokeTex = getCachedTexture('particles/smoke.png');
  const dustTex = getCachedTexture('particles/dust.png');
  const rainTex = getCachedTexture('particles/raindrop.png');
  const tyreTex = getCachedTexture('particles/tire-mark.png');
  const trailLeafTex = getCachedTexture('particles/leaf-gold.png');

  useEffect(() => {
    // Initialize tyre marks off-screen
    if (tyreMarksRef.current) {
      _dummyPos.set(0, -500, 0);
      _dummyScale.set(0.01, 0.01, 0.01);
      _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
      for (let i = 0; i < MAX_MARKS; i++) {
        tyreMarksRef.current.setMatrixAt(i, _dummyMat);
      }
      tyreMarksRef.current.instanceMatrix.needsUpdate = true;
    }
  }, [trackId]);

  useFrame(({ clock }, delta) => {
    const active = getActiveSession();
    const playerPos = active?.player.renderPosition;
    const t = clock.getElapsedTime();

    // 1. Update ambient drifting pollen / falling leaves around player
    if (ambientMeshRef.current && ambientCount > 0 && playerPos) {
      for (let i = 0; i < ambientCount; i++) {
        const o = ambientOffsets[i];
        const y = ((o.oy - t * o.speedY) % 14 + 14) % 14;
        const swayX = Math.sin(t * 1.4 + o.phase) * 2.2;
        const swayZ = Math.cos(t * 1.1 + o.phase) * 2.2;
        _dummyPos.set(playerPos.x + o.ox + swayX, playerPos.y + y, playerPos.z + o.oz + swayZ);
        _dummyScale.set(o.scale, o.scale, o.scale);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        ambientMeshRef.current.setMatrixAt(i, _dummyMat);
      }
      ambientMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 2. Update Gentle Rain streaks
    if (rainMeshRef.current && rainCount > 0 && playerPos) {
      for (let i = 0; i < rainCount; i++) {
        const o = ambientOffsets[i % ambientOffsets.length];
        const y = ((o.oy * 2 - t * 22) % 16 + 16) % 16;
        _dummyPos.set(
          playerPos.x + o.ox * 0.8,
          playerPos.y + y,
          playerPos.z + o.oz * 0.8
        );
        _dummyScale.set(0.06, 0.85, 0.06);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        rainMeshRef.current.setMatrixAt(i, _dummyMat);
      }
      rainMeshRef.current.instanceMatrix.needsUpdate = true;
    }

    // 3. Emit & update vehicle drift smoke / off-road dust / leaf swirl
    if (active && playerPos) {
      const p = active.player;
      emitAccum.current += delta;

      if (emitAccum.current > 0.035) {
        emitAccum.current = 0;
        const backX = -Math.sin(p.renderYaw) * 1.8;
        const backZ = -Math.cos(p.renderYaw) * 1.8;

        // Smoke or offroad dust
        if ((p.isDrifting || !p.onRoad) && p.speedKmh > 25) {
          const sp = smokePool.current[smokeIdx.current % MAX_TRAIL];
          smokeIdx.current++;
          sp.active = true;
          sp.x = playerPos.x + backX + (Math.random() - 0.5) * 1.1;
          sp.y = playerPos.y + 0.25;
          sp.z = playerPos.z + backZ + (Math.random() - 0.5) * 1.1;
          sp.vx = (Math.random() - 0.5) * 1.8;
          sp.vy = 0.9 + Math.random() * 0.8;
          sp.vz = (Math.random() - 0.5) * 1.8;
          sp.age = 0;
          sp.maxAge = 0.65;
          sp.size = !p.onRoad ? 0.85 : 0.7;
        }

        // Swirling leaves behind vehicle at high Rush or on leaf patches
        if (
          (active.flow.rush > 35 || p.surface === 'leaves' || active.flow.rushTimeRemaining > 0) &&
          p.speedKmh > 40
        ) {
          const lp = leafPool.current[leafIdx.current % MAX_TRAIL];
          leafIdx.current++;
          lp.active = true;
          lp.x = playerPos.x + backX + (Math.random() - 0.5) * 1.6;
          lp.y = playerPos.y + 0.35;
          lp.z = playerPos.z + backZ + (Math.random() - 0.5) * 1.6;
          lp.vx = (Math.random() - 0.5) * 3.5;
          lp.vy = 1.6 + Math.random() * 1.8;
          lp.vz = (Math.random() - 0.5) * 3.5;
          lp.age = 0;
          lp.maxAge = 0.9;
          lp.size = 0.32;
        }
      }

      // Step smoke pool
      if (smokeMeshRef.current) {
        for (let i = 0; i < MAX_TRAIL; i++) {
          const sp = smokePool.current[i];
          if (!sp.active) {
            _dummyPos.set(0, -500, 0);
            _dummyScale.set(0.001, 0.001, 0.001);
          } else {
            sp.age += delta;
            if (sp.age >= sp.maxAge) {
              sp.active = false;
              _dummyPos.set(0, -500, 0);
              _dummyScale.set(0.001, 0.001, 0.001);
            } else {
              sp.x += sp.vx * delta;
              sp.y += sp.vy * delta;
              sp.z += sp.vz * delta;
              const grow = sp.size * (1 + (sp.age / sp.maxAge) * 1.4);
              _dummyPos.set(sp.x, sp.y, sp.z);
              _dummyScale.set(grow, grow, grow);
            }
          }
          _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
          smokeMeshRef.current.setMatrixAt(i, _dummyMat);
        }
        smokeMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      // Step leaf swirl pool
      if (leafTrailMeshRef.current) {
        for (let i = 0; i < MAX_TRAIL; i++) {
          const lp = leafPool.current[i];
          if (!lp.active) {
            _dummyPos.set(0, -500, 0);
            _dummyScale.set(0.001, 0.001, 0.001);
          } else {
            lp.age += delta;
            if (lp.age >= lp.maxAge) {
              lp.active = false;
              _dummyPos.set(0, -500, 0);
              _dummyScale.set(0.001, 0.001, 0.001);
            } else {
              lp.x += lp.vx * delta + Math.sin(t * 8 + i) * 0.04;
              lp.y += lp.vy * delta;
              lp.z += lp.vz * delta;
              const s = lp.size * (1 - lp.age / lp.maxAge);
              _dummyPos.set(lp.x, lp.y, lp.z);
              _dummyScale.set(s, s, s);
            }
          }
          _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
          leafTrailMeshRef.current.setMatrixAt(i, _dummyMat);
        }
        leafTrailMeshRef.current.instanceMatrix.needsUpdate = true;
      }

      // Step tyre mark ring buffer
      tyreMarkTimer.current += delta;
      if (
        tyreMarksRef.current &&
        tyreMarkTimer.current > 0.04 &&
        p.grounded &&
        (p.isDrifting || (p.brake > 0.6 && p.speedKmh > 40))
      ) {
        tyreMarkTimer.current = 0;
        const idx = tyreMarkIdx.current % MAX_MARKS;
        tyreMarkIdx.current++;
        _dummyPos.set(
          playerPos.x - Math.sin(p.renderYaw) * 1.1,
          playerPos.y + 0.04,
          playerPos.z - Math.cos(p.renderYaw) * 1.1
        );
        const euler = new THREE.Euler(-Math.PI / 2, p.renderYaw, 0, 'YXZ');
        _dummyQuat.setFromEuler(euler);
        _dummyScale.set(p.vehicleDef.type === 'bike' ? 0.25 : 1.35, 1.4, 1);
        _dummyMat.compose(_dummyPos, _dummyQuat, _dummyScale);
        tyreMarksRef.current.setMatrixAt(idx, _dummyMat);
        tyreMarksRef.current.instanceMatrix.needsUpdate = true;
        _dummyQuat.identity();
      }
    }

    // 4. Animate sky birds circling gently
    if (birdsGroupRef.current && playerPos) {
      birdsGroupRef.current.position.set(
        playerPos.x + Math.cos(t * 0.18) * 55,
        playerPos.y + 28 + Math.sin(t * 0.4) * 3,
        playerPos.z + Math.sin(t * 0.18) * 55
      );
      birdsGroupRef.current.rotation.y = -t * 0.18;
    }
  });

  return (
    <group>
      {/* Active Chaos Props & Telegraph Sparkles */}
      {chaosInstances.map((inst, idx) => (
        <ChaosPropRender
          key={inst.id}
          modelId={CHAOS_TYPE_TO_MODEL[inst.type]}
          index={idx}
        />
      ))}

      {/* Ambient Floating Leaves / Pollen */}
      {ambientCount > 0 && leafTex && (
        <instancedMesh ref={ambientMeshRef} args={[undefined, undefined, ambientCount]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={leafTex}
            transparent
            opacity={0.75}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* Gentle Rain Streaks */}
      {rainCount > 0 && rainTex && (
        <instancedMesh ref={rainMeshRef} args={[undefined, undefined, rainCount]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={rainTex}
            color="#CFE8F0"
            transparent
            opacity={0.48}
            side={THREE.DoubleSide}
            depthWrite={false}
          />
        </instancedMesh>
      )}

      {/* Drift Smoke / Offroad Dust Pool */}
      {(smokeTex || dustTex) && (
        <instancedMesh ref={smokeMeshRef} args={[undefined, undefined, MAX_TRAIL]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={smokeTex || dustTex}
            color="#F5EFD9"
            transparent
            opacity={0.42}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}

      {/* Swirling Leaf Trail Pool */}
      {trailLeafTex && (
        <instancedMesh ref={leafTrailMeshRef} args={[undefined, undefined, MAX_TRAIL]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={trailLeafTex}
            transparent
            opacity={0.85}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}

      {/* Tyre Marks Ring Buffer */}
      {tyreTex && (
        <instancedMesh ref={tyreMarksRef} args={[undefined, undefined, MAX_MARKS]} frustumCulled={false}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial
            map={tyreTex}
            color="#1a1c1a"
            transparent
            opacity={0.28}
            depthWrite={false}
            side={THREE.DoubleSide}
          />
        </instancedMesh>
      )}

      {/* Distant Circling Birds Flock */}
      <group ref={birdsGroupRef}>
        {[0, 1, 2, 3, 4].map((b) => (
          <mesh key={b} position={[b * 2.4 - 4.8, Math.abs(b - 2) * 0.5, Math.abs(b - 2) * -1.8]}>
            <coneGeometry args={[0.35, 0.9, 4]} />
            <meshBasicMaterial color="#1F3D2B" />
          </mesh>
        ))}
      </group>
    </group>
  );
};
