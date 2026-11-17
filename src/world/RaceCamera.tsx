import React, { useRef } from 'react';
import * as THREE from 'three';
import { useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import { useGameStore } from '../store/useGameStore';
import { getActiveSession, stepRaceSessionFrame } from '../game/loop';
import { getBuiltTrack } from '../game/track';

const _desiredPos = new THREE.Vector3();
const _desiredLook = new THREE.Vector3();
const _currentPos = new THREE.Vector3(320, 12, -15);
const _currentLook = new THREE.Vector3(320, 8, 10);

export const RaceCamera: React.FC<{
  photoFov?: number;
}> = ({ photoFov }) => {
  const { camera } = useThree();
  const screen = useGameStore((s) => s.screen);
  const cameraMode = useGameStore((s) => s.cameraMode);
  const photoMode = useGameStore((s) => s.photoMode);
  const settings = useGameStore((s) => s.settings);
  const orbitAngleRef = useRef(0);

  useFrame(({ clock }, delta) => {
    const persp = camera as THREE.PerspectiveCamera;

    // 1. Menu / Track Select / Journey / Achievements background flyover of Emerald Valley
    if (
      screen === 'menu' ||
      screen === 'track-select' ||
      screen === 'journey' ||
      screen === 'achievements'
    ) {
      const track = getBuiltTrack('emerald-valley');
      const t = clock.getElapsedTime() * 14;
      const sample = track.getSampleAtDistance(t);
      const lookSample = track.getSampleAtDistance(t + 28);

      _desiredPos.copy(sample.position).add(new THREE.Vector3(0, 6.5, 0));
      _desiredLook.copy(lookSample.position).add(new THREE.Vector3(0, 2.5, 0));

      camera.position.lerp(_desiredPos, delta * 3);
      _currentLook.lerp(_currentLook.copy(_desiredLook), delta * 3);
      camera.lookAt(_currentLook);
      persp.fov = THREE.MathUtils.lerp(persp.fov, 60, delta * 4);
      persp.updateProjectionMatrix();
      return;
    }

    // 2. Garage Turntable View
    if (screen === 'garage') {
      _desiredPos.set(0, 1.95, 5.1);
      _desiredLook.set(0, 0.72, 0);
      camera.position.lerp(_desiredPos, delta * 6);
      camera.lookAt(_desiredLook);
      camera.rotation.z = 0;
      persp.fov = THREE.MathUtils.lerp(persp.fov, 48, delta * 6);
      persp.updateProjectionMatrix();
      return;
    }

    // 3. Active Race / Relax Drive / Results
    if (screen === 'race' || screen === 'results') {
      stepRaceSessionFrame(delta);
    }

    const session = getActiveSession();
    if (!session) return;

    if (photoMode) {
      if (photoFov) {
        persp.fov = photoFov;
        persp.updateProjectionMatrix();
      }
      return;
    }

    // Track Fly-over Intro Camera
    if (session.phase === 'flyover') {
      const prog = 1 - session.flyoverTimer / 4.2;
      const d = prog * 180;
      const s = session.track.getSampleAtDistance(d);
      const sLook = session.track.getSampleAtDistance(d + 35);
      _desiredPos
        .copy(s.position)
        .addScaledVector(s.right, Math.sin(prog * Math.PI * 2) * 8)
        .add(new THREE.Vector3(0, 11 - prog * 5, 0));
      camera.position.lerp(_desiredPos, delta * 5);
      camera.lookAt(sLook.position.x, sLook.position.y + 1.5, sLook.position.z);
      persp.fov = 66;
      persp.updateProjectionMatrix();
      return;
    }

    const p = session.player;
    const isBike = p.vehicleDef.type === 'bike';

    // Spring-arm camera angle lags softly in drifts
    const velYaw =
      p.speedKmh > 18
        ? Math.atan2(p.velocity.x, p.velocity.z)
        : p.renderYaw;
    // Blend between body yaw and velocity vector for joyful drift framing
    let yawDiff = velYaw - p.renderYaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    const camYaw = p.renderYaw + yawDiff * (p.isDrifting ? 0.42 : 0.18);

    const fwdX = Math.sin(camYaw);
    const fwdZ = Math.cos(camYaw);

    if (cameraMode === 'chase') {
      const distBack = isBike ? 4.8 : 5.8;
      const heightUp = isBike ? 2.15 : 2.35;
      _desiredPos.set(
        p.renderPosition.x - fwdX * distBack,
        p.renderPosition.y + heightUp,
        p.renderPosition.z - fwdZ * distBack
      );
      _desiredLook.set(
        p.renderPosition.x + Math.sin(p.renderYaw) * 6.5,
        p.renderPosition.y + 1.05,
        p.renderPosition.z + Math.cos(p.renderYaw) * 6.5
      );
      _currentPos.lerp(_desiredPos, Math.min(1, delta * 14));
      _currentLook.lerp(_desiredLook, Math.min(1, delta * 18));
      camera.position.copy(_currentPos);
      camera.lookAt(_currentLook);
      // Subtle roll on bike lean
      if (isBike && !settings.reducedMotion) {
        camera.rotation.z = THREE.MathUtils.lerp(
          camera.rotation.z,
          -p.bikeLeanRad * 0.22,
          delta * 8
        );
      }
    } else if (cameraMode === 'far-chase') {
      const distBack = isBike ? 7.4 : 8.6;
      const heightUp = isBike ? 3.2 : 3.6;
      _desiredPos.set(
        p.renderPosition.x - fwdX * distBack,
        p.renderPosition.y + heightUp,
        p.renderPosition.z - fwdZ * distBack
      );
      _desiredLook.set(
        p.renderPosition.x + Math.sin(p.renderYaw) * 8,
        p.renderPosition.y + 1.2,
        p.renderPosition.z + Math.cos(p.renderYaw) * 8
      );
      _currentPos.lerp(_desiredPos, Math.min(1, delta * 12));
      _currentLook.lerp(_desiredLook, Math.min(1, delta * 16));
      camera.position.copy(_currentPos);
      camera.lookAt(_currentLook);
    } else if (cameraMode === 'hood') {
      const hoodY = isBike ? 1.38 : 1.28;
      const hoodFwd = isBike ? 0.35 : 0.45;
      camera.position.set(
        p.renderPosition.x + Math.sin(p.renderYaw) * hoodFwd,
        p.renderPosition.y + hoodY,
        p.renderPosition.z + Math.cos(p.renderYaw) * hoodFwd
      );
      camera.lookAt(
        p.renderPosition.x + Math.sin(p.renderYaw) * 20,
        p.renderPosition.y + hoodY - 0.25 - p.visualPitch * 6,
        p.renderPosition.z + Math.cos(p.renderYaw) * 20
      );
      if (!settings.reducedMotion) {
        camera.rotation.z = -p.visualRoll * (isBike ? 0.65 : 0.35);
      }
    } else {
      // Cinematic orbit camera
      orbitAngleRef.current += delta * 0.45;
      const r = 7.2;
      camera.position.set(
        p.renderPosition.x + Math.cos(orbitAngleRef.current) * r,
        p.renderPosition.y + 2.6,
        p.renderPosition.z + Math.sin(orbitAngleRef.current) * r
      );
      camera.lookAt(
        p.renderPosition.x,
        p.renderPosition.y + 0.9,
        p.renderPosition.z
      );
    }

    // Soft camera shake from landings, bumps & high speed Rush
    if (!settings.reducedMotion && settings.cameraShake > 0.01) {
      const rushShake = Math.max(0, (session.flow.rush - 55) / 45) * 0.025;
      const totalShake =
        (session.cameraTrauma * session.cameraTrauma * 0.14 + rushShake) *
        settings.cameraShake;
      if (totalShake > 0.001) {
        const t = clock.getElapsedTime() * 38;
        camera.position.x += Math.sin(t * 1.1) * totalShake;
        camera.position.y += Math.cos(t * 1.7) * totalShake * 0.8;
      }
    }

    // Smooth dynamic FOV from Flow system
    persp.fov = session.flow.currentFov;
    persp.updateProjectionMatrix();
  });

  const session = getActiveSession();
  const targetVec = session
    ? ([
        session.player.renderPosition.x,
        session.player.renderPosition.y + 0.9,
        session.player.renderPosition.z,
      ] as [number, number, number])
    : ([0, 0.8, 0] as [number, number, number]);

  if (photoMode || screen === 'garage') {
    return (
      <OrbitControls
        target={screen === 'garage' ? [0, 0.72, 0] : targetVec}
        enablePan={photoMode}
        enableZoom={true}
        minDistance={2.4}
        maxDistance={18}
        maxPolarAngle={Math.PI * 0.48}
      />
    );
  }

  return null;
};
