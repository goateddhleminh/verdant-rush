import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { QualityLevel, TrackId } from '../data/types';
import { getGameData } from '../data/gameData';
import { getEnvironmentModelPath, loadGltfCached } from '../data/assetLoader';

interface PrimitivePart {
  geometry: THREE.BufferGeometry;
  material: THREE.Material;
}

interface TransformEntry {
  x: number;
  y: number;
  z: number;
  yaw: number;
  scale: number;
}

const _dummyMatrix = new THREE.Matrix4();
const _dummyPos = new THREE.Vector3();
const _dummyQuat = new THREE.Quaternion();
const _dummyEuler = new THREE.Euler();
const _dummyScale = new THREE.Vector3();

/**
 * Renders any environment GLB model as one InstancedMesh per primitive part.
 */
const InstancedModelBatch: React.FC<{
  modelId: string;
  transforms: TransformEntry[];
  castShadow?: boolean;
  receiveShadow?: boolean;
  swayWind?: boolean;
}> = React.memo(({ modelId, transforms, castShadow = true, receiveShadow = true, swayWind = false }) => {
  const [parts, setParts] = useState<PrimitivePart[]>([]);
  const meshRefs = useRef<(THREE.InstancedMesh | null)[]>([]);
  const groupRef = useRef<THREE.Group>(null);

  useEffect(() => {
    if (transforms.length === 0) return;
    let mounted = true;
    const path = getEnvironmentModelPath(modelId);

    loadGltfCached(path)
      .then((gltf) => {
        if (!mounted) return;
        const extracted: PrimitivePart[] = [];
        gltf.scene.traverse((obj) => {
          if ((obj as THREE.Mesh).isMesh) {
            const m = obj as THREE.Mesh;
            extracted.push({
              geometry: m.geometry,
              material: m.material as THREE.Material,
            });
          }
        });
        setParts(extracted);
      })
      .catch(() => {});

    return () => {
      mounted = false;
    };
  }, [modelId, transforms.length]);

  useEffect(() => {
    if (parts.length === 0 || transforms.length === 0) return;
    for (let p = 0; p < parts.length; p++) {
      const instMesh = meshRefs.current[p];
      if (!instMesh) continue;
      for (let i = 0; i < transforms.length; i++) {
        const t = transforms[i];
        _dummyPos.set(t.x, t.y, t.z);
        _dummyEuler.set(0, t.yaw, 0);
        _dummyQuat.setFromEuler(_dummyEuler);
        _dummyScale.set(t.scale, t.scale, t.scale);
        _dummyMatrix.compose(_dummyPos, _dummyQuat, _dummyScale);
        instMesh.setMatrixAt(i, _dummyMatrix);
      }
      instMesh.instanceMatrix.needsUpdate = true;
      instMesh.computeBoundingSphere();
    }
  }, [parts, transforms]);

  // Subtle gentle wind sway for grass/ferns/flowers
  useFrame(({ clock }) => {
    if (!swayWind || !groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.rotation.z = Math.sin(t * 1.8) * 0.012;
  });

  if (parts.length === 0 || transforms.length === 0) return null;

  return (
    <group ref={groupRef}>
      {parts.map((part, idx) => (
        <instancedMesh
          key={`${modelId}-part-${idx}`}
          ref={(el) => {
            meshRefs.current[idx] = el;
          }}
          args={[part.geometry, part.material, transforms.length]}
          castShadow={castShadow}
          receiveShadow={receiveShadow}
          frustumCulled={false}
        />
      ))}
    </group>
  );
});

export const InstancedProps: React.FC<{
  trackId: TrackId;
  quality: QualityLevel;
  shadowsEnabled: boolean;
}> = React.memo(({ trackId, quality, shadowsEnabled }) => {
  const data = getGameData();
  const propsData = data.trackProps[trackId];
  const preset = data.theme.qualityPresets[quality];

  const batches = useMemo(() => {
    const map = new Map<
      string,
      {
        transforms: TransformEntry[];
        castShadow: boolean;
        receiveShadow: boolean;
        swayWind: boolean;
      }
    >();

    const addEntry = (
      modelId: string,
      entry: TransformEntry,
      opts?: { castShadow?: boolean; receiveShadow?: boolean; swayWind?: boolean }
    ) => {
      let group = map.get(modelId);
      if (!group) {
        const isSmallFlora =
          modelId.startsWith('grass-') ||
          modelId.startsWith('flowers-') ||
          modelId === 'fern' ||
          modelId.startsWith('mushroom-');
        const isBackdrop =
          modelId.startsWith('mountain-') ||
          modelId.startsWith('hill-') ||
          modelId.startsWith('cloud-');
        group = {
          transforms: [],
          castShadow:
            opts?.castShadow ??
            (shadowsEnabled && !isSmallFlora && !isBackdrop && modelId !== 'leaf-patch'),
          receiveShadow: opts?.receiveShadow ?? !isBackdrop,
          swayWind: opts?.swayWind ?? isSmallFlora,
        };
        map.set(modelId, group);
      }
      group.transforms.push(entry);
    };

    // 1. Nature instances (trees, bushes, rocks, wildflowers, grass)
    for (const [modelId, list] of Object.entries(propsData.instances)) {
      const isGrassOrFlower =
        modelId.startsWith('grass-') ||
        modelId.startsWith('flowers-') ||
        modelId === 'fern';
      const step = isGrassOrFlower
        ? quality === 'low'
          ? 3
          : quality === 'medium'
          ? 2
          : 1
        : 1;

      for (let i = 0; i < list.length; i += step) {
        const [x, y, z, yaw, scale] = list[i];
        // Filter very distant trees on low quality
        if (quality === 'low' && Math.hypot(x, z) > preset.drawDistance * 1.35) {
          continue;
        }
        addEntry(modelId, { x, y, z, yaw, scale });
      }
    }

    // 2. Furniture: Start/Finish Arch
    const sf = propsData.furniture.startFinish;
    if (sf) {
      addEntry(sf.model, {
        x: sf.pos[0],
        y: sf.pos[1],
        z: sf.pos[2],
        yaw: sf.yaw,
        scale: 1,
      });
    }

    // 3. Checkpoints (every 2nd checkpoint gate to keep road clean & airy)
    for (const cp of propsData.furniture.checkpoints || []) {
      if (cp.index % 2 !== 0) continue;
      const posArr =
        typeof cp.pos === 'string'
          ? cp.pos.split(' ').map(Number)
          : cp.pos;
      addEntry('checkpoint-gate', {
        x: posArr[0],
        y: posArr[1],
        z: posArr[2],
        yaw: cp.yaw,
        scale: 1,
      });
    }

    // 4. Jumps & Boost Pads
    for (const j of propsData.furniture.jumps || []) {
      addEntry(j.model || 'jump-ramp', {
        x: j.pos[0],
        y: j.pos[1],
        z: j.pos[2],
        yaw: j.yaw,
        scale: 1,
      });
    }
    for (const bp of propsData.furniture.boostPads || []) {
      addEntry(bp.model || 'boost-pad', {
        x: bp.pos[0],
        y: bp.pos[1],
        z: bp.pos[2],
        yaw: bp.yaw,
        scale: 1,
      });
    }

    // 5. Fences, Chevrons, Leaf Patches, Extra Buildings
    for (const f of propsData.furniture.fences || []) {
      addEntry(f.model || 'fence-wood', {
        x: f.pos[0],
        y: f.pos[1],
        z: f.pos[2],
        yaw: f.yaw,
        scale: 1,
      });
    }
    for (const ch of propsData.furniture.chevrons || []) {
      addEntry('chevron-sign', {
        x: ch.pos[0],
        y: ch.pos[1],
        z: ch.pos[2],
        yaw: ch.yaw,
        scale: 1,
      });
    }
    for (const lp of propsData.furniture.leafPatches || []) {
      addEntry(
        lp.model || 'leaf-patch',
        {
          x: lp.pos[0],
          y: lp.pos[1] + 0.02,
          z: lp.pos[2],
          yaw: lp.yaw,
          scale: 1,
        },
        { castShadow: false }
      );
    }
    for (const ex of propsData.furniture.extra || []) {
      addEntry(ex.model, {
        x: ex.pos[0],
        y: ex.pos[1],
        z: ex.pos[2],
        yaw: ex.yaw,
        scale: 1,
      });
    }

    // 6. Distant Mountains & Hills Backdrop
    for (const b of propsData.backdrop || []) {
      addEntry(
        b.model,
        {
          x: b.pos[0],
          y: b.pos[1],
          z: b.pos[2],
          yaw: b.yaw,
          scale: b.scale,
        },
        { castShadow: false, receiveShadow: false }
      );
    }

    // 7. Clouds
    for (const c of propsData.clouds || []) {
      addEntry(
        c.model,
        {
          x: c.pos[0],
          y: c.pos[1],
          z: c.pos[2],
          yaw: 0,
          scale: c.scale,
        },
        { castShadow: false, receiveShadow: false }
      );
    }

    return Array.from(map.entries());
  }, [propsData, quality, shadowsEnabled, preset.drawDistance]);

  return (
    <group>
      {batches.map(([modelId, info]) => (
        <InstancedModelBatch
          key={`${trackId}-${modelId}`}
          modelId={modelId}
          transforms={info.transforms}
          castShadow={info.castShadow}
          receiveShadow={info.receiveShadow}
          swayWind={info.swayWind}
        />
      ))}
    </group>
  );
});
