import * as THREE from 'three';
import { SurfaceType, VehicleDef, VehiclePhysicsConfig, VehicleUpgrades } from '../data/types';
import { BuiltTrack, TrackQueryState } from './track';
import { getGameData, getUpgradedPhysics } from '../data/gameData';

export interface VehicleControlInput {
  throttle: number; // 0..1
  brake: number; // 0..1
  steer: number; // -1..1 (positive = left, negative = right in our +X left / +Z forward system)
  handbrake: boolean;
  nitro: boolean;
  respawn?: boolean;
}

export interface VehiclePhysicsState {
  id: string;
  vehicleDef: VehicleDef;
  config: VehiclePhysicsConfig;
  isPlayer: boolean;

  // Spatial state (current & previous for 120Hz render interpolation)
  position: THREE.Vector3;
  prevPosition: THREE.Vector3;
  renderPosition: THREE.Vector3;
  velocity: THREE.Vector3;

  yaw: number;
  prevYaw: number;
  renderYaw: number;
  yawRate: number;

  surfaceNormal: THREE.Vector3;
  visualPitch: number;
  visualRoll: number;
  wheelSpinRad: number;

  // Local frame speeds
  forwardSpeed: number; // m/s
  lateralSpeed: number; // m/s
  speedKmh: number;
  verticalVel: number;

  // Steering & controls
  steerInputSmoothed: number;
  steerAngleRad: number;
  throttle: number;
  brake: number;

  // Drivetrain
  gear: number;
  rpm: number;
  rpmNorm: number;
  shiftCooldown: number;

  // Nitro
  nitro: number; // 0..100
  nitroActive: boolean;
  boostPadTimer: number;
  launchBoostTimer: number;

  // Drift
  isDrifting: boolean;
  driftAngleDeg: number;
  slipRatio: number;
  currentDriftScore: number;
  driftCombo: number;
  driftComboTimer: number;
  totalDriftScore: number;

  // Air & suspension
  grounded: boolean;
  airTime: number;
  landingBounce: number;
  landingVelY: number;

  // Bike-specific
  bikeLeanRad: number;
  wheelieAmount: number;
  wheelieDuration: number;
  stoppieAmount: number;
  tumbleTimer: number;

  // Track progress & race rules
  sampleIndex: number;
  lapProgress: number;
  prevLapProgress: number;
  distanceAlongTrack: number;
  lateralOffset: number;
  surface: SurfaceType;
  onRoad: boolean;
  waterProximity: number;
  waterPan: number;

  lap: number;
  passedHalfway: boolean;
  lastCheckpointDist: number;
  lapStartTimeMs: number;
  currentLapTimeMs: number;
  bestLapTimeMs: number;
  finished: boolean;
  finishTimeMs: number;
  eliminated: boolean;

  wrongWay: boolean;
  wrongWayTimer: number;
  stuckTimer: number;
  ghostTimer: number;
  isDrafting: boolean;
  rubberBandMul: number;

  // Preallocated track query object
  trackQuery: TrackQueryState;
}

// Preallocated module-level scratch vectors to keep stepVehiclePhysics 100% allocation-free
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _velHoriz = new THREE.Vector3();
const _diff = new THREE.Vector3();

export function createVehiclePhysicsState(
  id: string,
  vehicleDef: VehicleDef,
  upgrades: VehicleUpgrades,
  startPos: [number, number, number],
  startYaw: number,
  track: BuiltTrack,
  isPlayer: boolean
): VehiclePhysicsState {
  const config = getUpgradedPhysics(vehicleDef, upgrades);
  const pos = new THREE.Vector3(startPos[0], startPos[1], startPos[2]);
  const initialQuery = track.getTrackState(pos);
  pos.y = initialQuery.roadHeight;

  return {
    id,
    vehicleDef,
    config,
    isPlayer,
    position: pos.clone(),
    prevPosition: pos.clone(),
    renderPosition: pos.clone(),
    velocity: new THREE.Vector3(),
    yaw: startYaw,
    prevYaw: startYaw,
    renderYaw: startYaw,
    yawRate: 0,
    surfaceNormal: initialQuery.normal.clone(),
    visualPitch: 0,
    visualRoll: 0,
    wheelSpinRad: 0,
    forwardSpeed: 0,
    lateralSpeed: 0,
    speedKmh: 0,
    verticalVel: 0,
    steerInputSmoothed: 0,
    steerAngleRad: 0,
    throttle: 0,
    brake: 0,
    gear: 1,
    rpm: config.idleRpm,
    rpmNorm: 0,
    shiftCooldown: 0,
    nitro: 100,
    nitroActive: false,
    boostPadTimer: 0,
    launchBoostTimer: 0,
    isDrifting: false,
    driftAngleDeg: 0,
    slipRatio: 0,
    currentDriftScore: 0,
    driftCombo: 1,
    driftComboTimer: 0,
    totalDriftScore: 0,
    grounded: true,
    airTime: 0,
    landingBounce: 0,
    landingVelY: 0,
    bikeLeanRad: 0,
    wheelieAmount: 0,
    wheelieDuration: 0,
    stoppieAmount: 0,
    tumbleTimer: 0,
    sampleIndex: initialQuery.sampleIndex,
    lapProgress: initialQuery.lapProgress,
    prevLapProgress: initialQuery.lapProgress,
    distanceAlongTrack: initialQuery.distance,
    lateralOffset: initialQuery.lateralOffset,
    surface: initialQuery.surface,
    onRoad: initialQuery.onRoad,
    waterProximity: initialQuery.waterProximity,
    waterPan: initialQuery.waterPan,
    lap: 1,
    passedHalfway: false,
    lastCheckpointDist: initialQuery.distance,
    lapStartTimeMs: 0,
    currentLapTimeMs: 0,
    bestLapTimeMs: 0,
    finished: false,
    finishTimeMs: 0,
    eliminated: false,
    wrongWay: false,
    wrongWayTimer: 0,
    stuckTimer: 0,
    ghostTimer: 0,
    isDrafting: false,
    rubberBandMul: 1.0,
    trackQuery: initialQuery,
  };
}

function sampleTorqueCurve(curve: [number, number][], rpmNorm: number): number {
  const x = THREE.MathUtils.clamp(rpmNorm, 0, 1);
  for (let i = 0; i < curve.length - 1; i++) {
    const [x0, y0] = curve[i];
    const [x1, y1] = curve[i + 1];
    if (x >= x0 && x <= x1) {
      const t = (x - x0) / Math.max(0.0001, x1 - x0);
      return y0 + t * (y1 - y0);
    }
  }
  return 0.85;
}

export interface PhysicsStepCallbacks {
  onGearShift?: () => void;
  onWallBump?: (impactStrength: number, isBikeTumble: boolean) => void;
  onBoostPad?: () => void;
  onJumpLaunch?: () => void;
  onJumpLand?: (airSeconds: number) => void;
  onDriftBanked?: (points: number) => void;
  onDriftBroken?: () => void;
  onLapCompleted?: (lapNumber: number, lapTimeMs: number, cleanLap: boolean) => void;
  onNitroStart?: () => void;
}

export function respawnVehicleAtCheckpoint(
  state: VehiclePhysicsState,
  track: BuiltTrack
) {
  const sample = track.getSampleAtDistance(state.lastCheckpointDist);
  state.position.copy(sample.position);
  state.prevPosition.copy(sample.position);
  state.renderPosition.copy(sample.position);
  state.velocity.set(0, 0, 0);
  state.forwardSpeed = 0;
  state.lateralSpeed = 0;
  state.speedKmh = 0;
  state.verticalVel = 0;
  state.yaw = sample.yaw;
  state.prevYaw = sample.yaw;
  state.renderYaw = sample.yaw;
  state.yawRate = 0;
  state.grounded = true;
  state.airTime = 0;
  state.tumbleTimer = 0;
  state.stuckTimer = 0;
  state.wrongWay = false;
  state.wrongWayTimer = 0;
  state.ghostTimer = 2.0;
}

/**
 * Fixed 120 Hz physics step (dt = 1/120 s).
 * Completely allocation-free.
 */
export function stepVehiclePhysics(
  state: VehiclePhysicsState,
  input: VehicleControlInput,
  track: BuiltTrack,
  dt: number,
  options: {
    steeringAssist: boolean;
    gentleRain: boolean;
    rushTimeActive: boolean;
    raceTimeMs: number;
    canMove: boolean;
  },
  callbacks?: PhysicsStepCallbacks
) {
  state.prevPosition.copy(state.position);
  state.prevYaw = state.yaw;

  if (input.respawn) {
    respawnVehicleAtCheckpoint(state, track);
    return;
  }

  if (state.ghostTimer > 0) {
    state.ghostTimer = Math.max(0, state.ghostTimer - dt);
  }
  if (state.tumbleTimer > 0) {
    state.tumbleTimer = Math.max(0, state.tumbleTimer - dt);
    if (state.tumbleTimer <= 0) {
      state.ghostTimer = 2.0;
    }
  }
  if (state.boostPadTimer > 0) {
    state.boostPadTimer = Math.max(0, state.boostPadTimer - dt);
  }
  if (state.launchBoostTimer > 0) {
    state.launchBoostTimer = Math.max(0, state.launchBoostTimer - dt);
  }
  if (state.shiftCooldown > 0) {
    state.shiftCooldown = Math.max(0, state.shiftCooldown - dt);
  }

  if (!options.canMove) {
    // During countdown grid: allow revving RPM for launch mini-mechanic
    state.throttle = input.throttle;
    const targetRpm =
      state.config.idleRpm +
      input.throttle * (state.config.redlineRpm - state.config.idleRpm) * 0.88;
    state.rpm = THREE.MathUtils.lerp(state.rpm, targetRpm, dt * 8);
    state.rpmNorm =
      (state.rpm - state.config.idleRpm) /
      Math.max(1, state.config.redlineRpm - state.config.idleRpm);
    return;
  }

  const cfg = state.config;
  const isBike = state.vehicleDef.type === 'bike';

  // Query track state at current position
  const q = track.getTrackState(state.position, state.sampleIndex, state.trackQuery);
  state.sampleIndex = q.sampleIndex;
  state.prevLapProgress = state.lapProgress;
  state.lapProgress = q.lapProgress;
  state.distanceAlongTrack = q.distance;
  state.lateralOffset = q.lateralOffset;
  state.surface = q.surface;
  state.onRoad = q.onRoad;
  state.waterProximity = q.waterProximity;
  state.waterPan = q.waterPan;
  state.surfaceNormal.lerp(q.normal, dt * 12).normalize();

  // Checkpoint validation every ~150m
  if (q.onRoad && !state.wrongWay) {
    const distDiff = Math.abs(q.distance - state.lastCheckpointDist);
    if (distDiff > 80 && distDiff < track.totalLength - 80) {
      state.lastCheckpointDist = q.distance;
    }
  }

  // Track halfway & lap completion
  if (q.lapProgress > 0.42 && q.lapProgress < 0.62) {
    state.passedHalfway = true;
  }
  if (
    state.prevLapProgress > 0.85 &&
    q.lapProgress < 0.15 &&
    state.passedHalfway &&
    state.forwardSpeed > 0
  ) {
    const lapTimeMs = options.raceTimeMs - state.lapStartTimeMs;
    state.lapStartTimeMs = options.raceTimeMs;
    if (state.bestLapTimeMs === 0 || lapTimeMs < state.bestLapTimeMs) {
      state.bestLapTimeMs = lapTimeMs;
    }
    state.passedHalfway = false;
    const completedLap = state.lap;
    state.lap += 1;
    // Refill a little nitro on lap completion
    state.nitro = Math.min(100, state.nitro + 25);
    callbacks?.onLapCompleted?.(completedLap, lapTimeMs, true);
  }
  state.currentLapTimeMs = Math.max(0, options.raceTimeMs - state.lapStartTimeMs);

  // Check boost pads
  for (const bp of track.def.boostPads) {
    const dFrac = Math.abs(q.lapProgress - bp.at);
    if (dFrac < 0.008 && q.onRoad && state.boostPadTimer <= 0.1) {
      state.boostPadTimer = 1.35;
      state.nitro = Math.min(100, state.nitro + 30);
      callbacks?.onBoostPad?.();
      break;
    }
  }

  // Check jump ramps
  for (const jr of track.def.jumps) {
    const dFrac = Math.abs(q.lapProgress - jr.at);
    if (
      dFrac < 0.006 &&
      Math.abs(q.lateralOffset) < q.sample.width * 0.4 &&
      state.grounded &&
      state.forwardSpeed > 16
    ) {
      state.grounded = false;
      state.verticalVel = Math.min(13.5, 5.2 + state.forwardSpeed * 0.16);
      state.position.y += 0.25;
      callbacks?.onJumpLaunch?.();
      break;
    }
  }

  // Forward and right unit vectors in horizontal plane
  // Convention: yaw = 0 => forward = (0, 0, 1), right = (-1, 0, 0)
  const sinY = Math.sin(state.yaw);
  const cosY = Math.cos(state.yaw);
  _forward.set(sinY, 0, cosY);
  _right.set(-cosY, 0, sinY);

  // Check wrong-way
  const dotTrack = _forward.dot(q.tangent);
  if (dotTrack < -0.35 && state.speedKmh > 15) {
    state.wrongWayTimer += dt;
    if (state.wrongWayTimer > 1.2) state.wrongWay = true;
  } else {
    state.wrongWayTimer = 0;
    state.wrongWay = false;
  }

  // Decompose horizontal velocity into vehicle local frame
  _velHoriz.set(state.velocity.x, 0, state.velocity.z);
  state.forwardSpeed = _velHoriz.dot(_forward);
  state.lateralSpeed = _velHoriz.dot(_right);
  const totalSpeedMpS = Math.hypot(state.forwardSpeed, state.lateralSpeed);
  state.speedKmh = totalSpeedMpS * 3.6;

  // Surface grip & drag multipliers
  const surfacesTable = getGameData().vehiclesData.surfaces;
  const surfDef = surfacesTable[state.surface] || surfacesTable.asphalt;
  const rainGripFactor = options.gentleRain ? 0.88 : 1.0;
  const surfaceGrip = surfDef.grip * rainGripFactor;
  const surfaceExtraDrag = surfDef.drag;

  // Smooth steering input
  const steerSmoothRate = cfg.steerSmoothing || 6.5;
  state.steerInputSmoothed = THREE.MathUtils.lerp(
    state.steerInputSmoothed,
    input.steer,
    Math.min(1, dt * steerSmoothRate * 2.2)
  );

  // Speed-sensitive steering lock
  const maxSpeedMpS = (cfg.maxSpeedKmh / 3.6) * state.rubberBandMul;
  const speedNorm = THREE.MathUtils.clamp(Math.abs(state.forwardSpeed) / maxSpeedMpS, 0, 1.2);
  const highSpeedFactor = 1 - speedNorm * (1 - (cfg.highSpeedSteerFactor || 0.4));
  const maxSteerRad = THREE.MathUtils.degToRad(cfg.steerLockDeg) * highSpeedFactor;

  // Counter-steer assist keeps drifts smooth and relaxing
  let assistAngle = 0;
  if (options.steeringAssist && state.forwardSpeed > 6) {
    const slipAngle = Math.atan2(-state.lateralSpeed, Math.abs(state.forwardSpeed));
    assistAngle = THREE.MathUtils.clamp(slipAngle * 0.55, -0.32, 0.32);
  }
  state.steerAngleRad = THREE.MathUtils.clamp(
    state.steerInputSmoothed * maxSteerRad + assistAngle,
    -THREE.MathUtils.degToRad(cfg.steerLockDeg),
    THREE.MathUtils.degToRad(cfg.steerLockDeg)
  );

  // Nitro logic
  const canUseNitro =
    (input.nitro && state.nitro > 1) ||
    options.rushTimeActive ||
    state.boostPadTimer > 0 ||
    state.launchBoostTimer > 0;

  if (canUseNitro && state.throttle > 0.1) {
    if (!state.nitroActive && input.nitro) {
      callbacks?.onNitroStart?.();
    }
    state.nitroActive = true;
    if (!options.rushTimeActive && state.boostPadTimer <= 0 && state.launchBoostTimer <= 0) {
      const drainRate = 100 / Math.max(1.5, cfg.nitroSeconds);
      state.nitro = Math.max(0, state.nitro - drainRate * dt);
    }
  } else {
    state.nitroActive = false;
    // Gentle passive nitro trickle
    state.nitro = Math.min(100, state.nitro + 1.8 * dt);
  }

  // Automatic Gearbox & RPM
  const numGears = cfg.gears.length;
  const gearSpeedFraction = THREE.MathUtils.clamp(
    Math.abs(state.forwardSpeed) / Math.max(10, maxSpeedMpS),
    0,
    1.15
  );
  const idealGear = Math.max(1, Math.min(numGears, Math.floor(gearSpeedFraction * numGears) + 1));
  if (idealGear !== state.gear && state.shiftCooldown <= 0) {
    state.gear = idealGear;
    state.shiftCooldown = 0.25;
    if (state.isPlayer && state.speedKmh > 25) {
      callbacks?.onGearShift?.();
    }
  }

  const gearStart = (state.gear - 1) / numGears;
  const gearSpan = 1 / numGears;
  const inGearNorm = THREE.MathUtils.clamp(
    (gearSpeedFraction - gearStart) / gearSpan,
    0.15,
    1.0
  );
  const targetRpm =
    cfg.idleRpm +
    Math.max(inGearNorm, input.throttle * 0.45) * (cfg.redlineRpm - cfg.idleRpm);
  state.rpm = THREE.MathUtils.lerp(state.rpm, targetRpm, dt * 12);
  state.rpmNorm = THREE.MathUtils.clamp(
    (state.rpm - cfg.idleRpm) / Math.max(1, cfg.redlineRpm - cfg.idleRpm),
    0,
    1
  );

  // Longitudinal forces (arcade-tuned so every vehicle accelerates briskly and hits its top speed)
  state.throttle = input.throttle;
  state.brake = input.brake;

  const torqueMul = sampleTorqueCurve(cfg.torqueCurve, state.rpmNorm);
  const lowSpeedLaunchMul = 1 + Math.max(0, 1 - speedNorm * 1.4) * 0.45;
  const nitroBoostMul = state.nitroActive ? 1 + (cfg.nitroForceBoost || 0.35) : 1.0;
  const draftBoostMul = state.isDrafting ? (isBike ? 1.18 : 1.11) : 1.0;

  let longForceN = 0;

  if (state.tumbleTimer > 0) {
    // During soft bike tumble, coast gently to a slow roll
    longForceN = -state.forwardSpeed * cfg.massKg * 2.5;
  } else if (input.throttle > 0.01 && state.forwardSpeed >= -1.5) {
    // Forward acceleration
    longForceN +=
      input.throttle *
      cfg.engineForceN *
      torqueMul *
      lowSpeedLaunchMul *
      nitroBoostMul *
      draftBoostMul *
      state.rubberBandMul *
      1.35;
  }

  if (input.brake > 0.01) {
    if (state.forwardSpeed > 1.2) {
      // Braking
      longForceN -= input.brake * cfg.brakeForceN * surfaceGrip;
    } else {
      // Smooth reverse (capped at 42 km/h)
      if (state.forwardSpeed > -11.5) {
        longForceN -= input.brake * cfg.engineForceN * 0.75;
      }
    }
  }

  if (input.handbrake && state.grounded) {
    longForceN -= Math.sign(state.forwardSpeed) * cfg.brakeForceN * 0.42;
  }

  // Aerodynamic drag + rolling resistance + off-road drag + gentle slope effect
  const speedLimiterFactor =
    state.forwardSpeed > maxSpeedMpS * (state.nitroActive ? 1.16 : 1.0) ? 3.2 : 0.72;
  const aeroDrag =
    cfg.dragK *
    state.forwardSpeed *
    Math.abs(state.forwardSpeed) *
    speedLimiterFactor;
  const rollDrag =
    cfg.rollingResistance * cfg.massKg * 9.81 * Math.sign(state.forwardSpeed);
  const offRoadDrag = surfaceExtraDrag * cfg.massKg * state.forwardSpeed * 0.85;
  const slopeGravity = q.tangent.y * cfg.massKg * 9.81 * 0.32;

  const netLongForce = longForceN - aeroDrag - rollDrag - offRoadDrag - slopeGravity;
  const longAccel = netLongForce / cfg.massKg;

  if (state.grounded) {
    state.forwardSpeed += longAccel * dt;
    // Slight natural coasting stop at near-zero speed with no inputs
    if (input.throttle < 0.01 && input.brake < 0.01 && Math.abs(state.forwardSpeed) < 0.4) {
      state.forwardSpeed *= 0.9;
    }
  } else {
    // In air: keep momentum with tiny air drag
    state.forwardSpeed *= 1 - 0.08 * dt;
  }

  // Lateral grip & drift model (forgiving, joyful arcade cornering)
  const driftTrigger =
    input.handbrake ||
    (Math.abs(state.steerInputSmoothed) > 0.65 &&
      state.speedKmh > 52 &&
      (cfg.driftBias || 0.3) > 0.35 &&
      input.throttle < 0.85);

  if (state.grounded) {
    // Turn rate from steering angle
    const effectiveTurnSpeed = Math.min(Math.abs(state.forwardSpeed), 26);
    const turnDir = state.forwardSpeed >= -0.2 ? 1 : -1;
    const agilityMul = isBike ? 1.24 : 1.05;
    const targetYawRate =
      (effectiveTurnSpeed / Math.max(1.8, cfg.wheelbaseM)) *
      Math.tan(state.steerAngleRad) *
      turnDir *
      agilityMul;

    state.yawRate = THREE.MathUtils.lerp(state.yawRate, targetYawRate, dt * 14);
    state.yaw += state.yawRate * dt;

    // Induce lateral slip when turning at speed or pulling handbrake
    const centrifugalSlip = -state.yawRate * state.forwardSpeed * (driftTrigger ? 0.52 : 0.16);
    state.lateralSpeed += centrifugalSlip * dt;

    // Lateral tyre grip damping (higher grip = snaps back faster; lower during drift so slide holds cleanly)
    const rearGrip = cfg.gripRear * surfaceGrip * (driftTrigger ? 0.35 : 1.0);
    const latDamping = (driftTrigger ? 2.6 : 7.8) * rearGrip;
    state.lateralSpeed *= Math.max(0, 1 - latDamping * dt);
  } else {
    // Slight air yaw control
    state.yaw += state.steerInputSmoothed * 0.65 * dt;
  }

  // Compute slip angle and drift scoring
  const absFwd = Math.max(1.5, Math.abs(state.forwardSpeed));
  const slipAngleRad = Math.atan2(Math.abs(state.lateralSpeed), absFwd);
  state.driftAngleDeg = THREE.MathUtils.radToDeg(slipAngleRad);
  state.slipRatio = THREE.MathUtils.clamp(
    state.driftAngleDeg / 38 + (input.handbrake && state.speedKmh > 30 ? 0.45 : 0),
    0,
    1
  );

  if (state.grounded && (state.driftAngleDeg > 11 || (input.handbrake && Math.abs(state.steerInputSmoothed) > 0.25)) && state.speedKmh > 38) {
    state.isDrifting = true;
    state.driftComboTimer = 1.6;
    const pts = Math.max(12, state.driftAngleDeg) * (state.speedKmh / 35) * dt * 28 * state.driftCombo;
    state.currentDriftScore += pts;
    // Drift refills nitro gently
    state.nitro = Math.min(100, state.nitro + 9 * dt);
    if (state.currentDriftScore > 2500 * state.driftCombo && state.driftCombo < 5) {
      state.driftCombo += 1;
    }
  } else {
    state.isDrifting = false;
    if (state.currentDriftScore > 0) {
      state.driftComboTimer -= dt;
      if (state.driftComboTimer <= 0) {
        const banked = Math.round(state.currentDriftScore);
        state.totalDriftScore += banked;
        state.currentDriftScore = 0;
        state.driftCombo = 1;
        if (banked >= 150) {
          callbacks?.onDriftBanked?.(banked);
        }
      }
    }
  }

  // Reconstruct world horizontal velocity from updated forward/lateral speeds
  const newSinY = Math.sin(state.yaw);
  const newCosY = Math.cos(state.yaw);
  _forward.set(newSinY, 0, newCosY);
  _right.set(-newCosY, 0, newSinY);

  state.velocity.x = _forward.x * state.forwardSpeed + _right.x * state.lateralSpeed;
  state.velocity.z = _forward.z * state.forwardSpeed + _right.z * state.lateralSpeed;

  // Integrate horizontal position
  state.position.x += state.velocity.x * dt;
  state.position.z += state.velocity.z * dt;

  // Vertical / Ground following & Jump air physics
  const postMoveQuery = track.getTrackState(state.position, state.sampleIndex, state.trackQuery);
  const groundY = postMoveQuery.roadHeight;

  if (state.grounded) {
    // Check if cresting a steep drop-off at high speed
    const prevGroundY = q.roadHeight;
    const roadSlopeVelY = (groundY - prevGroundY) / dt;
    state.position.y = groundY;
    state.verticalVel = roadSlopeVelY;
    state.airTime = 0;
  } else {
    state.airTime += dt;
    state.verticalVel -= 22.0 * dt; // Gravity
    state.position.y += state.verticalVel * dt;

    if (state.position.y <= groundY) {
      state.position.y = groundY;
      state.grounded = true;
      state.landingBounce = Math.min(0.18, Math.abs(state.verticalVel) * 0.012);
      if (state.airTime > 0.35) {
        callbacks?.onJumpLand?.(state.airTime);
      }
      state.verticalVel = 0;
    }
  }

  // Soft invisible track edge walls (gentle bump & push back, NEVER a hard stop or stuck state)
  const maxAllowedLat = postMoveQuery.sample.width * 0.5 + 3.8;
  if (Math.abs(postMoveQuery.lateralOffset) > maxAllowedLat) {
    const sign = Math.sign(postMoveQuery.lateralOffset);
    const excess = Math.abs(postMoveQuery.lateralOffset) - maxAllowedLat;

    // Push position gently back inside boundary
    state.position.addScaledVector(postMoveQuery.right, -sign * (excess + 0.08));

    // Reflect normal component & preserve 78% of forward speed so player never stops dead
    const impactSpeed = Math.abs(state.lateralSpeed) + Math.abs(state.forwardSpeed) * 0.25;
    state.lateralSpeed = -sign * Math.max(2.5, Math.abs(state.lateralSpeed) * 0.45);
    state.forwardSpeed *= 0.88;

    // Gently steer yaw back toward track tangent
    let yawDiff = postMoveQuery.sample.yaw - state.yaw;
    while (yawDiff > Math.PI) yawDiff -= Math.PI * 2;
    while (yawDiff < -Math.PI) yawDiff += Math.PI * 2;
    state.yaw += yawDiff * 0.22;

    // Check bike soft tumble on steep high-speed wall hit
    let triggeredTumble = false;
    if (
      isBike &&
      impactSpeed > 14 &&
      Math.abs(yawDiff) > 0.55 &&
      state.tumbleTimer <= 0 &&
      state.ghostTimer <= 0
    ) {
      state.tumbleTimer = 0.85;
      state.forwardSpeed *= 0.65;
      triggeredTumble = true;
    }

    if (state.currentDriftScore > 200) {
      state.currentDriftScore = 0;
      state.driftCombo = 1;
      callbacks?.onDriftBroken?.();
    }

    if (impactSpeed > 3.5) {
      callbacks?.onWallBump?.(Math.min(1, impactSpeed / 25), triggeredTumble);
    }
  }

  // Visual suspension pitch/roll & Bike lean/wheelie/stoppie
  state.wheelSpinRad = (state.wheelSpinRad + (state.forwardSpeed / 0.32) * dt) % (Math.PI * 2);

  if (state.landingBounce > 0) {
    state.landingBounce = Math.max(0, state.landingBounce - dt * 0.65);
  }

  const accelPitch = THREE.MathUtils.clamp(-longAccel * 0.0045, -0.07, 0.08);
  const airPitch = !state.grounded
    ? THREE.MathUtils.clamp(state.verticalVel * 0.025 + input.throttle * 0.08 - input.brake * 0.08, -0.3, 0.35)
    : 0;

  if (isBike) {
    // Visual lean proportional to steering and speed
    const maxLeanRad = THREE.MathUtils.degToRad(cfg.maxLeanDeg || 45);
    const targetLean =
      state.steerInputSmoothed *
      Math.min(1, state.speedKmh / 65) *
      maxLeanRad;
    state.bikeLeanRad = THREE.MathUtils.lerp(state.bikeLeanRad, targetLean, dt * 10);
    state.visualRoll = state.bikeLeanRad;

    // Wheelie on strong acceleration at low-to-mid speed
    const canWheelie =
      state.grounded &&
      input.throttle > 0.75 &&
      state.speedKmh > 12 &&
      state.speedKmh < 115 &&
      Math.abs(state.steerInputSmoothed) < 0.45;
    if (canWheelie) {
      const targetW = Math.min(1, (cfg.wheelieTorque || 1.0) * 0.42);
      state.wheelieAmount = THREE.MathUtils.lerp(state.wheelieAmount, targetW, dt * 5);
      state.wheelieDuration += dt;
    } else {
      state.wheelieAmount = THREE.MathUtils.lerp(state.wheelieAmount, 0, dt * 8);
      state.wheelieDuration = 0;
    }

    // Stoppie on hard braking
    const canStoppie =
      state.grounded &&
      input.brake > 0.75 &&
      state.speedKmh > 35 &&
      Math.abs(state.steerInputSmoothed) < 0.35;
    state.stoppieAmount = THREE.MathUtils.lerp(
      state.stoppieAmount,
      canStoppie ? 0.32 : 0,
      dt * 7
    );

    state.visualPitch = THREE.MathUtils.lerp(
      state.visualPitch,
      -state.wheelieAmount * 0.42 + state.stoppieAmount * 0.3 + airPitch,
      dt * 12
    );
  } else {
    // Car suspension dive, squat & cornering roll
    const cornerRoll = THREE.MathUtils.clamp(
      -state.steerInputSmoothed * Math.min(1, state.speedKmh / 90) * 0.065,
      -0.08,
      0.08
    );
    state.visualPitch = THREE.MathUtils.lerp(state.visualPitch, accelPitch + airPitch, dt * 10);
    state.visualRoll = THREE.MathUtils.lerp(state.visualRoll, cornerRoll, dt * 10);
  }

  // Auto-respawn if stuck for 4 seconds
  if (
    state.speedKmh < 4 &&
    (input.throttle > 0.2 || input.brake > 0.2) &&
    !state.finished
  ) {
    state.stuckTimer += dt;
    if (state.stuckTimer > 4.0) {
      respawnVehicleAtCheckpoint(state, track);
    }
  } else {
    state.stuckTimer = Math.max(0, state.stuckTimer - dt * 2);
  }
}

/**
 * Resolves friendly capsule collisions, slipstream drafting, and near misses between vehicles.
 */
export function resolveVehicleInteractions(
  vehicles: VehiclePhysicsState[],
  onPlayerCollision?: (strength: number) => void,
  onPlayerOvertake?: () => void,
  onPlayerNearMiss?: () => void
) {
  const player = vehicles[0];
  if (player) player.isDrafting = false;

  for (let i = 0; i < vehicles.length; i++) {
    const a = vehicles[i];
    if (a.ghostTimer > 0 || a.eliminated) continue;

    for (let j = i + 1; j < vehicles.length; j++) {
      const b = vehicles[j];
      if (b.ghostTimer > 0 || b.eliminated) continue;

      _diff.subVectors(b.position, a.position);
      _diff.y = 0;
      const distSq = _diff.lengthSq();

      // Slipstream / drafting check for player behind any rival
      if (a.isPlayer && distSq > 9 && distSq < 480) {
        const dist = Math.sqrt(distSq);
        const dirToB = _diff.clone().multiplyScalar(1 / dist);
        const playerFwdX = Math.sin(a.yaw);
        const playerFwdZ = Math.cos(a.yaw);
        const dot = dirToB.x * playerFwdX + dirToB.z * playerFwdZ;
        if (dot > 0.92 && a.speedKmh > 65 && b.speedKmh > 50) {
          a.isDrafting = true;
        }
      }

      const minSep = (a.vehicleDef.type === 'bike' ? 0.75 : 1.15) + (b.vehicleDef.type === 'bike' ? 0.75 : 1.15);
      if (distSq < minSep * minSep && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const overlap = minSep - dist;
        _diff.multiplyScalar(1 / dist); // normal from A to B

        const totalMass = a.config.massKg + b.config.massKg;
        const ratioA = b.config.massKg / totalMass;
        const ratioB = a.config.massKg / totalMass;

        a.position.addScaledVector(_diff, -overlap * ratioA * 0.65);
        b.position.addScaledVector(_diff, overlap * ratioB * 0.65);

        // Friendly soft velocity exchange
        const relVx = b.velocity.x - a.velocity.x;
        const relVz = b.velocity.z - a.velocity.z;
        const sepVel = relVx * _diff.x + relVz * _diff.z;
        if (sepVel < 0) {
          const impulse = -sepVel * 0.55;
          a.velocity.x -= _diff.x * impulse * ratioA;
          a.velocity.z -= _diff.z * impulse * ratioA;
          b.velocity.x += _diff.x * impulse * ratioB;
          b.velocity.z += _diff.z * impulse * ratioB;
          if (a.isPlayer || b.isPlayer) {
            onPlayerCollision?.(Math.min(1, Math.abs(sepVel) / 18));
          }
        }
      } else if ((a.isPlayer || b.isPlayer) && distSq < (minSep + 1.8) * (minSep + 1.8)) {
        const relSpeed = Math.abs(a.speedKmh - b.speedKmh);
        if (relSpeed > 35) {
          onPlayerNearMiss?.();
        }
      }
    }
  }
  void onPlayerOvertake;
}

export function updateInterpolatedTransform(
  state: VehiclePhysicsState,
  alpha: number
) {
  state.renderPosition.lerpVectors(state.prevPosition, state.position, alpha);
  let dYaw = state.yaw - state.prevYaw;
  while (dYaw > Math.PI) dYaw -= Math.PI * 2;
  while (dYaw < -Math.PI) dYaw += Math.PI * 2;
  state.renderYaw = state.prevYaw + dYaw * alpha;
}
