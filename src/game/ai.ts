import * as THREE from 'three';
import { DifficultyLevel, VehicleCustomisation } from '../data/types';
import { CORE_VEHICLE_IDS, getGameData, getVehicleById } from '../data/gameData';
import { SeededRNG } from '../data/seededRandom';
import { BuiltTrack } from './track';
import {
  createVehiclePhysicsState,
  VehicleControlInput,
  VehiclePhysicsState,
} from './physics';

export type AIPersonality = 'chill' | 'cheeky' | 'steady' | 'daredevil';

export interface AIRivalDriver {
  id: string;
  name: string;
  personality: AIPersonality;
  skill: number; // 0..1
  physics: VehiclePhysicsState;
  customisation: VehicleCustomisation;
  preferredLaneOffset: number;
  currentLaneTarget: number;
  mistakeTimer: number;
  mistakeOffset: number;
  emote: string | null;
  emoteTimer: number;
  emoteCooldown: number;
}

const FRIENDLY_RIVAL_PROFILES: {
  name: string;
  personality: AIPersonality;
  plate: string;
  emotes: string[];
}[] = [
  { name: 'Rowan', personality: 'chill', plate: 'BREEZE', emotes: ['🌿', '👋', '☀️'] },
  { name: 'Maple', personality: 'steady', plate: 'AUTUMN', emotes: ['🍁', '👍', '✨'] },
  { name: 'Finn', personality: 'cheeky', plate: 'ZOOM', emotes: ['😄', '💨', '👍'] },
  { name: 'Juniper', personality: 'daredevil', plate: 'SPARK', emotes: ['🔥', '✨', '🙌'] },
  { name: 'Clover', personality: 'chill', plate: 'MEADOW', emotes: ['🍀', '👋', '🌸'] },
  { name: 'Soren', personality: 'steady', plate: 'PINES', emotes: ['🌲', '👍', '☀️'] },
  { name: 'Pip', personality: 'cheeky', plate: 'ACORN', emotes: ['🐿️', '👋', '✨'] },
];

export function spawnAIRivals(
  count: number,
  difficulty: DifficultyLevel,
  track: BuiltTrack,
  seed: number = 777
): AIRivalDriver[] {
  const rng = new SeededRNG(seed);
  const data = getGameData();
  const liveries = data.theme.liveries;
  const grid = track.propsData.furniture.startGrid || [];
  const rivals: AIRivalDriver[] = [];

  const diffSkillRange: Record<DifficultyLevel, [number, number]> = {
    chill: [0.35, 0.62],
    normal: [0.55, 0.78],
    hard: [0.72, 0.92],
    insane: [0.88, 1.0],
  };
  const [minSkill, maxSkill] = diffSkillRange[difficulty] || diffSkillRange.chill;

  for (let i = 0; i < count; i++) {
    const profile = FRIENDLY_RIVAL_PROFILES[i % FRIENDLY_RIVAL_PROFILES.length];
    // Mix core cars and bikes across the grid
    const vehicleId = CORE_VEHICLE_IDS[(i + 1) % CORE_VEHICLE_IDS.length];
    const vehicleDef = getVehicleById(vehicleId);
    const livery = liveries[(i + 1) % liveries.length];

    // Grid slots: player gets slot 8 (or last slot), AI get slots 1..count
    const gridSlot = grid[i] || {
      pos: [
        track.samples[0].position.x + (i % 2 === 0 ? -2.2 : 2.2),
        track.samples[0].position.y,
        track.samples[0].position.z - (i + 1) * 6,
      ] as [number, number, number],
      yaw: track.samples[0].yaw,
    };

    const skill = rng.range(minSkill, maxSkill);
    const upgradeLv =
      difficulty === 'chill'
        ? 0
        : difficulty === 'normal'
        ? 1
        : difficulty === 'hard'
        ? 2
        : 4;

    const phys = createVehiclePhysicsState(
      `ai-${i + 1}`,
      vehicleDef,
      { engine: upgradeLv, tyres: upgradeLv, nitro: upgradeLv, chassis: upgradeLv },
      gridSlot.pos,
      gridSlot.yaw,
      track,
      false
    );

    const preferredLaneOffset = rng.range(-2.2, 2.2);

    rivals.push({
      id: `ai-${i + 1}`,
      name: profile.name,
      personality: profile.personality,
      skill,
      physics: phys,
      customisation: {
        liveryId: livery.id,
        color: livery.color,
        accent: livery.accent,
        wheelStyle: vehicleDef.defaultWheel || 'sport',
        plateText: profile.plate,
      },
      preferredLaneOffset,
      currentLaneTarget: preferredLaneOffset,
      mistakeTimer: rng.range(6, 16),
      mistakeOffset: 0,
      emote: null,
      emoteTimer: 0,
      emoteCooldown: rng.range(3, 9),
    });
  }

  return rivals;
}

const _targetPoint = new THREE.Vector3();
const _toTarget = new THREE.Vector3();

/**
 * Computes pure-pursuit control input for an AI rival, including overtaking shifts,
 * human-like mistakes, and mild rubber-banding (+/- 8%).
 */
export function computeAIControlInput(
  ai: AIRivalDriver,
  allVehicles: VehiclePhysicsState[],
  player: VehiclePhysicsState | null,
  track: BuiltTrack,
  difficulty: DifficultyLevel,
  dt: number,
  outInput: VehicleControlInput
): VehicleControlInput {
  const state = ai.physics;

  // 1. Update friendly emotes when near player
  if (ai.emoteTimer > 0) {
    ai.emoteTimer -= dt;
    if (ai.emoteTimer <= 0) ai.emote = null;
  }
  if (ai.emoteCooldown > 0) {
    ai.emoteCooldown -= dt;
  } else if (player) {
    const distToPlayerSq = state.position.distanceToSquared(player.position);
    if (distToPlayerSq < 320) {
      const profile =
        FRIENDLY_RIVAL_PROFILES.find((p) => p.name === ai.name) ||
        FRIENDLY_RIVAL_PROFILES[0];
      ai.emote = profile.emotes[Math.floor(Math.random() * profile.emotes.length)];
      ai.emoteTimer = 2.6;
      ai.emoteCooldown = 9 + Math.random() * 8;
    }
  }

  // 2. Mild rubber-banding (max +/- 8% power, chill is extra forgiving)
  if (player) {
    const playerTotalDist = (player.lap - 1) * track.totalLength + player.distanceAlongTrack;
    const aiTotalDist = (state.lap - 1) * track.totalLength + state.distanceAlongTrack;
    const gapMeters = aiTotalDist - playerTotalDist; // > 0 means AI is ahead of player

    const diffBasePower =
      difficulty === 'chill'
        ? 0.84
        : difficulty === 'normal'
        ? 0.94
        : difficulty === 'hard'
        ? 1.01
        : 1.06;

    // Clamp rubberband strictly to +/- 8% around base power
    const bandOffset = THREE.MathUtils.clamp(-gapMeters * 0.0006, -0.08, 0.08);
    state.rubberBandMul = diffBasePower + bandOffset;
  } else {
    state.rubberBandMul = 0.95;
  }

  // 3. Skill-based small human mistakes (slightly wide line every 10-18s)
  ai.mistakeTimer -= dt;
  if (ai.mistakeTimer <= 0) {
    ai.mistakeTimer = 9 + Math.random() * 10;
    const mistakeMagnitude = (1 - ai.skill) * 2.4;
    ai.mistakeOffset = (Math.random() - 0.5) * 2 * mistakeMagnitude;
  } else {
    ai.mistakeOffset = THREE.MathUtils.lerp(ai.mistakeOffset, 0, dt * 0.8);
  }

  // 4. Overtaking lateral shift if another vehicle is directly ahead within 24m
  let overtakeShift = 0;
  for (const other of allVehicles) {
    if (other.id === state.id || other.eliminated) continue;
    let dTrack = other.distanceAlongTrack - state.distanceAlongTrack;
    if (dTrack < 0) dTrack += track.totalLength;
    if (dTrack > 2 && dTrack < 24) {
      const latDiff = other.lateralOffset - state.lateralOffset;
      if (Math.abs(latDiff) < 2.4) {
        // Shift to the side with more room
        overtakeShift = latDiff >= 0 ? -2.8 : 2.8;
        break;
      }
    }
  }

  // 5. Pure-pursuit target point 16..30m ahead along the spline
  const lookAheadDist = THREE.MathUtils.clamp(14 + state.forwardSpeed * 0.52, 14, 32);
  const targetSample = track.getSampleAtDistance(state.distanceAlongTrack + lookAheadDist);

  const personalityApexWeight =
    ai.personality === 'daredevil' || ai.personality === 'cheeky' ? 0.95 : 0.65;
  const desiredLat = THREE.MathUtils.clamp(
    targetSample.aiOffset * personalityApexWeight +
      ai.preferredLaneOffset * 0.4 +
      overtakeShift +
      ai.mistakeOffset,
    -targetSample.width * 0.38,
    targetSample.width * 0.38
  );
  ai.currentLaneTarget = THREE.MathUtils.lerp(ai.currentLaneTarget, desiredLat, dt * 3.5);

  _targetPoint
    .copy(targetSample.position)
    .addScaledVector(targetSample.right, ai.currentLaneTarget);

  _toTarget.subVectors(_targetPoint, state.position);
  _toTarget.y = 0;
  _toTarget.normalize();

  const targetYaw = Math.atan2(_toTarget.x, _toTarget.z);
  let yawError = targetYaw - state.yaw;
  while (yawError > Math.PI) yawError -= Math.PI * 2;
  while (yawError < -Math.PI) yawError += Math.PI * 2;

  const steerCmd = THREE.MathUtils.clamp(yawError * 2.1, -1, 1);

  // 6. Speed control from corner speed profile ahead
  const skillSpeedMul = 0.85 + ai.skill * 0.2;
  const riskMul = ai.personality === 'daredevil' ? 1.08 : ai.personality === 'chill' ? 0.91 : 1.0;
  const desiredSpeedMpS = targetSample.aiTargetSpeedMpS * skillSpeedMul * riskMul;

  let throttle = 0.85;
  let brake = 0;
  let handbrake = false;

  if (state.forwardSpeed > desiredSpeedMpS + 3.5) {
    throttle = 0.1;
    brake = THREE.MathUtils.clamp((state.forwardSpeed - desiredSpeedMpS) / 14, 0.15, 0.75);
    if (ai.personality === 'daredevil' && Math.abs(steerCmd) > 0.65 && state.speedKmh > 75) {
      handbrake = true;
    }
  } else {
    throttle = THREE.MathUtils.clamp(1.0 - Math.abs(steerCmd) * 0.25, 0.55, 1.0);
  }

  // Use nitro on straights when cheeky/daredevil or catching up
  const useNitro =
    state.nitro > 45 &&
    Math.abs(steerCmd) < 0.2 &&
    Math.abs(targetSample.curvature) < 0.004 &&
    (ai.personality === 'daredevil' || ai.personality === 'cheeky' || state.rubberBandMul > 1.0);

  outInput.throttle = throttle;
  outInput.brake = brake;
  outInput.steer = steerCmd;
  outInput.handbrake = handbrake;
  outInput.nitro = useNitro;
  outInput.respawn = false;

  return outInput;
}
