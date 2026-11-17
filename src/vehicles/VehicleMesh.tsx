import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';
import { VehicleCustomisation, VehicleDef } from '../data/types';
import { getCachedTexture, loadGltfCached } from '../data/assetLoader';
import { VehiclePhysicsState } from '../game/physics';

interface VehicleMeshProps {
  vehicleDef: VehicleDef;
  customisation: VehicleCustomisation;
  physicsState?: VehiclePhysicsState;
  isPlayer?: boolean;
  rivalName?: string;
  rivalEmote?: string | null;
  showRivalName?: boolean;
  turntableMode?: boolean;
  ghostOpacity?: number;
}

interface RigRefs {
  body: THREE.Object3D | null;
  pivotsFL: THREE.Object3D | null;
  pivotsFR: THREE.Object3D | null;
  wheelFL: THREE.Object3D | null;
  wheelFR: THREE.Object3D | null;
  wheelRL: THREE.Object3D | null;
  wheelRR: THREE.Object3D | null;
  fork: THREE.Object3D | null;
  wheelF: THREE.Object3D | null;
  wheelR: THREE.Object3D | null;
  rider: THREE.Object3D | null;
  riderBaseY: number;
  taillightMat: THREE.MeshStandardMaterial | null;
}

export const VehicleMesh: React.FC<VehicleMeshProps> = ({
  vehicleDef,
  customisation,
  physicsState,
  isPlayer = false,
  rivalName,
  rivalEmote,
  showRivalName = true,
  turntableMode = false,
  ghostOpacity,
}) => {
  const rootRef = useRef<THREE.Group>(null);
  const tiltRef = useRef<THREE.Group>(null);
  const nitroSpriteLRef = useRef<THREE.Sprite>(null);
  const nitroSpriteRRef = useRef<THREE.Sprite>(null);
  const [clonedScene, setClonedScene] = useState<THREE.Group | null>(null);

  const rigRefs = useRef<RigRefs>({
    body: null,
    pivotsFL: null,
    pivotsFR: null,
    wheelFL: null,
    wheelFR: null,
    wheelRL: null,
    wheelRR: null,
    fork: null,
    wheelF: null,
    wheelR: null,
    rider: null,
    riderBaseY: 0,
    taillightMat: null,
  });

  // Load and clone GLB model
  useEffect(() => {
    let mounted = true;
    loadGltfCached(vehicleDef.model)
      .then((gltf) => {
        if (!mounted) return;
        const clone = gltf.scene.clone(true);

        const refs: RigRefs = {
          body: null,
          pivotsFL: null,
          pivotsFR: null,
          wheelFL: null,
          wheelFR: null,
          wheelRL: null,
          wheelRR: null,
          fork: null,
          wheelF: null,
          wheelR: null,
          rider: null,
          riderBaseY: 0,
          taillightMat: null,
        };

        clone.traverse((obj) => {
          if (obj.name === 'body' || obj.name === 'frame') refs.body = obj;
          if (obj.name === 'wheelpivot_FL') refs.pivotsFL = obj;
          if (obj.name === 'wheelpivot_FR') refs.pivotsFR = obj;
          if (obj.name === 'wheel_FL') refs.wheelFL = obj;
          if (obj.name === 'wheel_FR') refs.wheelFR = obj;
          if (obj.name === 'wheel_RL') refs.wheelRL = obj;
          if (obj.name === 'wheel_RR') refs.wheelRR = obj;
          if (obj.name === 'fork') refs.fork = obj;
          if (obj.name === 'wheel_F') refs.wheelF = obj;
          if (obj.name === 'wheel_R') refs.wheelR = obj;
          if (obj.name === 'rider') {
            refs.rider = obj;
            refs.riderBaseY = obj.position.y;
          }

          if ((obj as THREE.Mesh).isMesh) {
            const mesh = obj as THREE.Mesh;
            mesh.castShadow = true;
            mesh.receiveShadow = true;
            if (mesh.material) {
              const mat = (mesh.material as THREE.MeshStandardMaterial).clone();
              if (ghostOpacity !== undefined) {
                mat.transparent = true;
                mat.opacity = ghostOpacity;
              }
              if (mat.name === 'TailLight') {
                mat.emissive = new THREE.Color('#ff3b2f');
                mat.emissiveIntensity = 0.6;
                refs.taillightMat = mat;
              } else if (mat.name === 'Headlight') {
                mat.emissive = new THREE.Color('#fff5cc');
                mat.emissiveIntensity = 1.6;
              }
              mesh.material = mat;
            }
          }
        });

        rigRefs.current = refs;
        setClonedScene(clone);
      })
      .catch(() => {
        if (mounted) setClonedScene(null);
      });

    return () => {
      mounted = false;
    };
  }, [vehicleDef.model, ghostOpacity]);

  // Apply customisation colors & wheel style tinting whenever customisation changes
  useEffect(() => {
    if (!clonedScene) return;
    const wheelRimColors: Record<string, string> = {
      sport: '#e4e8ec',
      mesh: '#f2b544',
      turbine: '#8ccbea',
      offroad: '#5c6460',
      classic: '#f5efd9',
    };
    const rimHex = wheelRimColors[customisation.wheelStyle] || '#e4e8ec';

    clonedScene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const mesh = obj as THREE.Mesh;
        const mat = mesh.material as THREE.MeshStandardMaterial;
        if (!mat) return;
        if (mat.name === 'Body_Paint') {
          mat.color.set(customisation.color);
        } else if (
          mat.name === 'Accent' ||
          mat.name === 'Rider_Suit' ||
          mat.name === 'Helmet'
        ) {
          mat.color.set(customisation.accent);
        } else if (mat.name === 'Rim') {
          mat.color.set(rimHex);
        }
      }
    });
  }, [clonedScene, customisation.color, customisation.accent, customisation.wheelStyle]);

  // Number plate canvas texture
  const plateTexture = useMemo(() => {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#F5EFD9';
      ctx.fillRect(0, 0, 256, 64);
      ctx.strokeStyle = '#1F3D2B';
      ctx.lineWidth = 6;
      ctx.strokeRect(4, 4, 248, 56);
      ctx.fillStyle = '#1F3D2B';
      ctx.font = 'bold 34px Nunito, sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText((customisation.plateText || 'VERDANT').slice(0, 8).toUpperCase(), 128, 34);
    }
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }, [customisation.plateText]);

  const shadowTex = getCachedTexture('particles/shadow-blob.png');
  const nitroTex = getCachedTexture('particles/nitro-flame-glow.png');

  // Animate rig in useFrame (allocation-free)
  useFrame((_, delta) => {
    if (!rootRef.current || !tiltRef.current) return;

    if (turntableMode) {
      rootRef.current.rotation.y += delta * 0.55;
      const refs = rigRefs.current;
      const spin = rootRef.current.rotation.y * 2.2;
      if (refs.wheelFL) refs.wheelFL.rotation.x = spin;
      if (refs.wheelFR) refs.wheelFR.rotation.x = spin;
      if (refs.wheelRL) refs.wheelRL.rotation.x = spin;
      if (refs.wheelRR) refs.wheelRR.rotation.x = spin;
      if (refs.wheelF) refs.wheelF.rotation.x = spin;
      if (refs.wheelR) refs.wheelR.rotation.x = spin;
      return;
    }

    if (!physicsState) return;

    // Position and Yaw from interpolated 120Hz state
    rootRef.current.position.copy(physicsState.renderPosition);
    rootRef.current.position.y -= physicsState.landingBounce;
    rootRef.current.rotation.y = physicsState.renderYaw;

    // Ghost pulse opacity
    if (physicsState.ghostTimer > 0) {
      rootRef.current.visible = Math.sin(performance.now() * 0.025) > -0.3;
    } else {
      rootRef.current.visible = !physicsState.eliminated;
    }

    // Suspension pitch & roll (or bike lean / wheelie / stoppie)
    tiltRef.current.rotation.x = physicsState.visualPitch;
    tiltRef.current.rotation.z = -physicsState.visualRoll;

    const refs = rigRefs.current;
    // Wheel spin
    const spin = physicsState.wheelSpinRad;
    if (refs.wheelFL) refs.wheelFL.rotation.x = spin;
    if (refs.wheelFR) refs.wheelFR.rotation.x = spin;
    if (refs.wheelRL) refs.wheelRL.rotation.x = spin;
    if (refs.wheelRR) refs.wheelRR.rotation.x = spin;
    if (refs.wheelF) refs.wheelF.rotation.x = spin;
    if (refs.wheelR) refs.wheelR.rotation.x = spin;

    // Front wheel / handlebar steering
    const steer = physicsState.steerAngleRad;
    if (refs.pivotsFL) refs.pivotsFL.rotation.y = steer;
    if (refs.pivotsFR) refs.pivotsFR.rotation.y = steer;
    if (refs.fork) refs.fork.rotation.y = steer;

    // Soft comic bike tumble animation
    if (refs.rider) {
      if (physicsState.tumbleTimer > 0) {
        const t = physicsState.tumbleTimer / 0.85;
        refs.rider.position.y = refs.riderBaseY + Math.sin(t * Math.PI) * 1.15;
        refs.rider.rotation.x = Math.sin(t * Math.PI * 2) * 0.45;
      } else {
        refs.rider.position.y = refs.riderBaseY;
        refs.rider.rotation.x = 0;
      }
    }

    // Brake light glow
    if (refs.taillightMat) {
      refs.taillightMat.emissiveIntensity = physicsState.brake > 0.1 ? 3.2 : 0.65;
    }

    // Nitro flame glow
    const showNitro = physicsState.nitroActive;
    const pulse = 0.55 + Math.sin(performance.now() * 0.04) * 0.2;
    if (nitroSpriteLRef.current) {
      nitroSpriteLRef.current.visible = showNitro;
      nitroSpriteLRef.current.scale.set(pulse, pulse, 1);
    }
    if (nitroSpriteRRef.current) {
      nitroSpriteRRef.current.visible = showNitro && vehicleDef.type === 'car';
      nitroSpriteRRef.current.scale.set(pulse, pulse, 1);
    }
  });

  const dims = vehicleDef.visual.dimensions;
  const isBike = vehicleDef.type === 'bike';

  return (
    <group ref={rootRef}>
      {/* Soft Ground Shadow Blob */}
      {shadowTex && ghostOpacity === undefined && (
        <mesh position={[0, 0.03, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[dims.width * 1.35, dims.length * 1.25]} />
          <meshBasicMaterial
            map={shadowTex}
            transparent
            opacity={0.55}
            depthWrite={false}
          />
        </mesh>
      )}

      <group ref={tiltRef}>
        {clonedScene ? (
          <primitive object={clonedScene} />
        ) : (
          /* Procedural primitive fallback built from vehicle dimensions */
          <group>
            <mesh position={[0, dims.height * 0.45, 0]} castShadow>
              <boxGeometry args={[dims.width, dims.height * 0.55, dims.length]} />
              <meshStandardMaterial color={customisation.color} roughness={0.35} />
            </mesh>
            <mesh position={[0, dims.height * 0.8, -dims.length * 0.08]} castShadow>
              <boxGeometry args={[dims.width * 0.82, dims.height * 0.4, dims.length * 0.52]} />
              <meshStandardMaterial color={customisation.accent} roughness={0.25} />
            </mesh>
          </group>
        )}

        {/* Custom Number Plate at Rear */}
        {ghostOpacity === undefined && (
          <mesh
            position={[0, isBike ? 0.46 : 0.47, -dims.length * 0.5 - 0.02]}
            rotation={[0, Math.PI, 0]}
          >
            <planeGeometry args={[isBike ? 0.34 : 0.52, isBike ? 0.11 : 0.14]} />
            <meshBasicMaterial map={plateTexture} />
          </mesh>
        )}

        {/* Nitro Exhaust Glow Sprites */}
        {nitroTex && (
          <>
            <sprite
              ref={nitroSpriteLRef}
              position={[isBike ? 0.18 : 0.48, 0.28, -dims.length * 0.52]}
              visible={false}
            >
              <spriteMaterial
                map={nitroTex}
                color="#F2B544"
                transparent
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
            <sprite
              ref={nitroSpriteRRef}
              position={[-0.48, 0.28, -dims.length * 0.52]}
              visible={false}
            >
              <spriteMaterial
                map={nitroTex}
                color="#F2B544"
                transparent
                blending={THREE.AdditiveBlending}
                depthWrite={false}
              />
            </sprite>
          </>
        )}

        {/* Player SpotLight Headlights */}
        {isPlayer && !turntableMode && (
          <spotLight
            position={[0, 0.75, dims.length * 0.48]}
            angle={0.55}
            penumbra={0.6}
            intensity={1.5}
            distance={36}
            color="#FFF4D2"
          />
        )}
      </group>

      {/* AI Rival Friendly Name & Emote Tag */}
      {!isPlayer && rivalName && showRivalName && !turntableMode && (
        <Html
          position={[0, dims.height + 0.65, 0]}
          center
          distanceFactor={24}
          zIndexRange={[10, 0]}
        >
          <div className="pointer-events-none flex flex-col items-center gap-0.5 select-none">
            {rivalEmote && (
              <div className="bg-[#F5EFD9] text-[#1F3D2B] text-base px-2 py-0.5 rounded-full shadow-md animate-bounce">
                {rivalEmote}
              </div>
            )}
            <div className="px-2.5 py-0.5 rounded-full bg-[#1F3D2B]/75 backdrop-blur-sm border border-[#F5EFD9]/25 text-[#F5EFD9] text-xs font-bold tracking-wide whitespace-nowrap shadow">
              {rivalName}
            </div>
          </div>
        </Html>
      )}
    </group>
  );
};
