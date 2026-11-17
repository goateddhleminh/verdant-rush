import * as THREE from 'three';
import {
  RaceConfig,
  RivalFinishEntry,
  useGameStore,
} from '../store/useGameStore';
import { GhostSample } from '../data/types';
import { BuiltTrack, getBuiltTrack } from './track';
import {
  createVehiclePhysicsState,
  resolveVehicleInteractions,
  stepVehiclePhysics,
  updateInterpolatedTransform,
  VehicleControlInput,
  VehiclePhysicsState,
} from './physics';
import { AIRivalDriver, computeAIControlInput, spawnAIRivals } from './ai';
import {
  addCalmPoints,
  addRushPoints,
  createInitialFlowState,
  FlowState,
  stepFlowSystem,
} from './flow';
import { ChaosManager } from './chaos';
import { getGameData, getVehicleById } from '../data/gameData';
import { audioManager } from '../audio/audioManager';

export type RacePhase = 'flyover' | 'countdown' | 'racing' | 'cooldown';

export interface ActiveRaceSession {
  config: RaceConfig;
  track: BuiltTrack;
  phase: RacePhase;
  flyoverTimer: number;
  countdownTimer: number;
  lastCountdownInt: number;
  cooldownTimer: number;
  raceTimeMs: number;

  player: VehiclePhysicsState;
  rivals: AIRivalDriver[];
  allVehicles: VehiclePhysicsState[];
  flow: FlowState;
  chaos: ChaosManager;

  // Positions & standings
  playerPosition: number;
  previousPlayerPosition: number;
  eliminationTimer: number;
  eliminationDuration: number;

  // Ghost recording & playback (20 Hz)
  currentLapGhostSamples: GhostSample[];
  bestLapGhostSamples: GhostSample[];
  ghostSampleTimer: number;
  playbackGhostSamples: GhostSample[] | null;
  ghostInterpolatedPos: THREE.Vector3;
  ghostInterpolatedYaw: number;
  liveGhostDeltaSec: number | null;

  // Camera shake trauma (0..1)
  cameraTrauma: number;

  // Relax Drive minute tracker
  relaxSecondsAccum: number;
}

class InputController {
  private keys = new Set<string>();
  public touchSteer = 0; // -1..1
  public touchThrottle = false;
  public touchBrake = false;
  public touchDrift = false;
  public touchNitro = false;
  public isTouchDevice = false;

  private respawnRequested = false;

  constructor() {
    if (typeof window !== 'undefined') {
      this.isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      window.addEventListener('keydown', this.onKeyDown);
      window.addEventListener('keyup', this.onKeyUp);
      window.addEventListener('blur', this.onWindowBlur);
    }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    const code = e.code;
    this.keys.add(code);

    const store = useGameStore.getState();
    if (store.screen !== 'race') return;

    if (code === 'KeyC') {
      store.cycleCameraMode();
    } else if (code === 'KeyR') {
      this.respawnRequested = true;
    } else if (code === 'KeyP' || code === 'Escape') {
      if (store.photoMode) {
        store.setPhotoMode(false);
      } else {
        store.setPaused(!store.isPaused);
      }
    } else if (code === 'KeyM') {
      store.toggleMute();
    } else if (code === 'KeyF') {
      store.setPhotoMode(!store.photoMode);
      if (!store.photoMode) {
        // Switched into photo mode
        if (activeSession) {
          addCalmPoints(activeSession.flow, 8);
        }
      }
    } else if (code === 'F3') {
      e.preventDefault();
      store.toggleDebugOverlay();
    } else if (code === 'Space' || code === 'Enter') {
      if (activeSession && activeSession.phase === 'flyover') {
        skipFlyoverIntro();
      }
    }
  };

  private onKeyUp = (e: KeyboardEvent) => {
    this.keys.delete(e.code);
  };

  private onWindowBlur = () => {
    this.keys.clear();
    const store = useGameStore.getState();
    if (store.screen === 'race' && !store.isPaused && !store.photoMode) {
      store.setPaused(true);
    }
  };

  public pollControlInput(out: VehicleControlInput): VehicleControlInput {
    let throttle = 0;
    let brake = 0;
    let steer = 0;
    let handbrake = false;
    let nitro = false;

    // Keyboard
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp') || this.touchThrottle) {
      throttle = 1;
    }
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown') || this.touchBrake) {
      brake = 1;
    }
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) {
      steer += 1; // +X is left
    }
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) {
      steer -= 1; // -X is right
    }
    if (Math.abs(this.touchSteer) > 0.01) {
      steer = -this.touchSteer;
    }
    if (this.keys.has('Space') || this.touchDrift) {
      handbrake = true;
    }
    if (this.keys.has('ShiftLeft') || this.keys.has('ShiftRight') || this.touchNitro) {
      nitro = true;
    }

    // Gamepad API
    if (typeof navigator !== 'undefined' && navigator.getGamepads) {
      const pads = navigator.getGamepads();
      const pad = pads?.[0];
      if (pad) {
        const stickX = pad.axes[0] || 0;
        if (Math.abs(stickX) > 0.12) {
          steer = -stickX;
        }
        const r2 = pad.buttons[7]?.value || 0;
        const l2 = pad.buttons[6]?.value || 0;
        if (r2 > 0.05) throttle = Math.max(throttle, r2);
        if (l2 > 0.05) brake = Math.max(brake, l2);
        if (pad.buttons[0]?.pressed) nitro = true; // A
        if (pad.buttons[2]?.pressed) handbrake = true; // X
      }
    }

    out.throttle = throttle;
    out.brake = brake;
    out.steer = THREE.MathUtils.clamp(steer, -1, 1);
    out.handbrake = handbrake;
    out.nitro = nitro;
    out.respawn = this.respawnRequested;
    this.respawnRequested = false;

    // Mark tutorial steps
    const store = useGameStore.getState();
    if (!store.tutorial.completed) {
      if (throttle > 0.5) store.markTutorialStep('throttle');
      if (Math.abs(steer) > 0.3) store.markTutorialStep('steer');
      if (brake > 0.5) store.markTutorialStep('brake');
      if (handbrake) store.markTutorialStep('drift');
      if (nitro) store.markTutorialStep('nitro');
    }

    return out;
  }

  public triggerGamepadRumble(strength: number, durationMs: number = 120) {
    try {
      const pad = navigator.getGamepads?.()?.[0] as any;
      if (pad?.vibrationActuator?.playEffect) {
        pad.vibrationActuator.playEffect('dual-rumble', {
          startDelay: 0,
          duration: durationMs,
          weakMagnitude: Math.min(1, strength * 0.6),
          strongMagnitude: Math.min(1, strength * 0.4),
        });
      }
    } catch {}
  }
}

export const inputController = new InputController();

let activeSession: ActiveRaceSession | null = null;
let physicsAccumulator = 0;
const FIXED_DT = 1 / 120;
const _playerInput: VehicleControlInput = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  nitro: false,
  respawn: false,
};
const _aiInput: VehicleControlInput = {
  throttle: 0,
  brake: 0,
  steer: 0,
  handbrake: false,
  nitro: false,
  respawn: false,
};

export function getActiveSession(): ActiveRaceSession | null {
  return activeSession;
}

export function skipFlyoverIntro() {
  if (!activeSession || activeSession.phase !== 'flyover') return;
  if (activeSession.config.mode === 'relax-drive') {
    activeSession.phase = 'racing';
  } else {
    activeSession.phase = 'countdown';
    activeSession.countdownTimer = 3.2;
    activeSession.lastCountdownInt = 4;
  }
}

export function createRaceSession(config: RaceConfig): ActiveRaceSession {
  const store = useGameStore.getState();
  const track = getBuiltTrack(config.trackId);
  const playerVehicleDef = getVehicleById(store.selectedVehicleId);
  const playerUpgrades = store.getVehicleUpgrades(store.selectedVehicleId);

  const isSoloMode =
    config.mode === 'relax-drive' ||
    config.mode === 'time-trial' ||
    config.mode === 'drift-attack';
  const rivalsCount = isSoloMode ? 0 : config.rivalsCount;

  const rivals = spawnAIRivals(rivalsCount, config.difficulty, track, track.propsData.seed + 17);

  // Player starts at grid slot (rivalsCount + 1) or slot 1 if solo
  const grid = track.propsData.furniture.startGrid || [];
  const playerGridSlot =
    grid[Math.min(grid.length - 1, rivalsCount)] ||
    grid[0] || {
      pos: [
        track.samples[0].position.x,
        track.samples[0].position.y,
        track.samples[0].position.z,
      ] as [number, number, number],
      yaw: track.samples[0].yaw,
    };

  const player = createVehiclePhysicsState(
    'player',
    playerVehicleDef,
    playerUpgrades,
    playerGridSlot.pos,
    playerGridSlot.yaw,
    track,
    true
  );

  const allVehicles = [player, ...rivals.map((r) => r.physics)];
  const savedGhost = store.ghosts[config.trackId];

  // Configure music & ambience for this track
  audioManager.playMusic(track.def.music);
  audioManager.startAmbience(config.trackId);
  audioManager.startDrivingLoops(playerVehicleDef.type);

  const session: ActiveRaceSession = {
    config,
    track,
    phase: config.mode === 'relax-drive' ? 'racing' : 'flyover',
    flyoverTimer: config.mode === 'relax-drive' ? 0 : 4.2,
    countdownTimer: 3.2,
    lastCountdownInt: 4,
    cooldownTimer: 2.4,
    raceTimeMs: 0,
    player,
    rivals,
    allVehicles,
    flow: createInitialFlowState(store.settings.baseFov),
    chaos: new ChaosManager(track, track.propsData.seed + 33),
    playerPosition: allVehicles.length,
    previousPlayerPosition: allVehicles.length,
    eliminationTimer: 20,
    eliminationDuration: 20,
    currentLapGhostSamples: [],
    bestLapGhostSamples: [],
    ghostSampleTimer: 0,
    playbackGhostSamples:
      config.mode === 'time-trial' && savedGhost ? savedGhost.samples : null,
    ghostInterpolatedPos: player.position.clone(),
    ghostInterpolatedYaw: player.yaw,
    liveGhostDeltaSec: null,
    cameraTrauma: 0,
    relaxSecondsAccum: 0,
  };

  activeSession = session;
  physicsAccumulator = 0;
  return session;
}

export function stepRaceSessionFrame(rawDeltaSec: number) {
  const session = activeSession;
  if (!session) return;

  const store = useGameStore.getState();
  if (store.isPaused || store.photoMode) return;

  // Clamp delta to max 1/20 s so frame spikes never destabilize physics
  const clampedDt = Math.min(rawDeltaSec, 0.05) * session.flow.timeScale;

  // Phase 1: Skippable Fly-over Intro
  if (session.phase === 'flyover') {
    session.flyoverTimer -= rawDeltaSec;
    if (session.flyoverTimer <= 0) {
      skipFlyoverIntro();
    }
    return;
  }

  // Phase 2: 3-2-1-GO Countdown
  if (session.phase === 'countdown') {
    session.countdownTimer -= rawDeltaSec;
    const ceilSec = Math.ceil(session.countdownTimer);
    if (ceilSec < session.lastCountdownInt && ceilSec >= 1 && ceilSec <= 3) {
      session.lastCountdownInt = ceilSec;
      audioManager.playOneShot('countdown-beep', 0.85, 1.0, 'sfx');
    }
    if (session.countdownTimer <= 0) {
      session.phase = 'racing';
      audioManager.playOneShot('countdown-go', 0.95, 1.0, 'sfx');

      // Check standing start launch mini-mechanic (sweet spot RPM 0.55..0.88)
      if (session.player.rpmNorm >= 0.52 && session.player.rpmNorm <= 0.9) {
        session.player.launchBoostTimer = 1.6;
        store.addJuiceText('PERFECT LAUNCH!', '#5BA55B', '+BOOST');
        audioManager.playOneShot('boost-pad', 0.8, 1.05, 'sfx');
      }
    }
  }

  // Fixed 120 Hz Physics Accumulator Loop
  physicsAccumulator += clampedDt;
  const canMove = session.phase === 'racing' || session.phase === 'cooldown';

  while (physicsAccumulator >= FIXED_DT) {
    physicsAccumulator -= FIXED_DT;

    if (session.phase === 'racing') {
      session.raceTimeMs += FIXED_DT * 1000;
    }

    // Poll player controls (or auto-drive in cooldown)
    if (session.phase === 'cooldown') {
      computeAIControlInput(
        {
          id: 'player-cooldown',
          name: 'You',
          personality: 'steady',
          skill: 0.75,
          physics: session.player,
          customisation: store.getVehicleCustomisation(store.selectedVehicleId),
          preferredLaneOffset: 0,
          currentLaneTarget: 0,
          mistakeTimer: 99,
          mistakeOffset: 0,
          emote: null,
          emoteTimer: 0,
          emoteCooldown: 99,
        },
        session.allVehicles,
        null,
        session.track,
        'chill',
        FIXED_DT,
        _playerInput
      );
    } else {
      inputController.pollControlInput(_playerInput);
    }

    // Step player vehicle physics
    stepVehiclePhysics(
      session.player,
      _playerInput,
      session.track,
      FIXED_DT,
      {
        steeringAssist: store.settings.steeringAssist,
        gentleRain: session.config.gentleRain,
        rushTimeActive: session.flow.rushTimeRemaining > 0,
        raceTimeMs: session.raceTimeMs,
        canMove,
      },
      {
        onGearShift: () => {
          audioManager.playOneShot('gear-shift', 0.45, 1.0, 'sfx');
        },
        onWallBump: (strength, isBikeTumble) => {
          audioManager.playOneShot('bump-soft', 0.4 + strength * 0.5, isBikeTumble ? 0.85 : 1.0, 'sfx');
          session.cameraTrauma = Math.min(1, session.cameraTrauma + strength * 0.45);
          inputController.triggerGamepadRumble(strength * 0.5, 110);
          if (isBikeTumble) {
            store.addJuiceText('OOPS! HOP BACK ON', '#F5EFD9');
          }
        },
        onBoostPad: () => {
          audioManager.playOneShot('boost-pad', 0.85, 1.0, 'sfx');
          addRushPoints(session.flow, 14, () => triggerRushTime(session));
          store.addJuiceText('BOOST PAD!', '#F2B544', '+RUSH');
        },
        onJumpLaunch: () => {
          session.cameraTrauma = Math.min(1, session.cameraTrauma + 0.25);
        },
        onJumpLand: (airSec) => {
          audioManager.playOneShot('bump-soft', 0.55, 0.9, 'sfx');
          session.cameraTrauma = Math.min(1, session.cameraTrauma + Math.min(0.6, airSec * 0.35));
          store.incrementStat('longestAirSec', +airSec.toFixed(2), true);
          if (airSec >= 0.75) {
            store.addJuiceText(`AIR TIME ${airSec.toFixed(1)}s`, '#8CCBEA', '+RUSH');
          }
          if (airSec >= 1.35) {
            session.flow.slowMoRemaining = 0.55;
          }
        },
        onDriftBanked: (points) => {
          store.incrementStat('bestDrift', points, true);
          if (points >= 400) {
            store.addJuiceText(`NICE DRIFT +${points}`, '#F2B544');
          }
        },
        onLapCompleted: (lapNum, lapTimeMs, cleanLap) => {
          audioManager.playOneShot('lap-chime', 0.9, 1.0, 'sfx');
          if (cleanLap) {
            addCalmPoints(session.flow, 20, () => triggerZenLap(session));
          }

          // Save ghost if fastest lap
          if (
            session.bestLapGhostSamples.length === 0 ||
            lapTimeMs <= session.player.bestLapTimeMs
          ) {
            session.bestLapGhostSamples = [...session.currentLapGhostSamples];
            store.saveGhost({
              trackId: session.config.trackId,
              vehicleId: store.selectedVehicleId,
              lapTimeMs: Math.round(lapTimeMs),
              samples: session.bestLapGhostSamples,
            });
          }
          session.currentLapGhostSamples = [];

          // Check race finish (except in relax-drive and elimination)
          const isElimination =
            session.config.careerEventId?.endsWith('-4') &&
            session.config.mode === 'journey';
          if (
            session.config.mode !== 'relax-drive' &&
            !isElimination &&
            lapNum >= session.config.laps &&
            session.phase === 'racing'
          ) {
            session.player.finished = true;
            session.player.finishTimeMs = session.raceTimeMs;
            session.phase = 'cooldown';
            session.cooldownTimer = 2.2;
            if (session.rivals.length > 0) {
              // Photo finish slow-mo if close to a rival
              session.flow.slowMoRemaining = 0.6;
            }
          }
        },
        onNitroStart: () => {
          audioManager.playOneShot('nitro', 0.85, 1.0, 'sfx');
          store.incrementStat('nitroUses', 1);
        },
      }
    );

    // Track longest bike wheelie achievement
    if (session.player.wheelieDuration > 0.5) {
      store.incrementStat(
        'longestWheelieSec',
        +session.player.wheelieDuration.toFixed(2),
        true
      );
    }

    // Step AI rivals
    for (const rival of session.rivals) {
      if (rival.physics.eliminated) continue;
      computeAIControlInput(
        rival,
        session.allVehicles,
        session.player,
        session.track,
        session.config.difficulty,
        FIXED_DT,
        _aiInput
      );
      stepVehiclePhysics(rival.physics, _aiInput, session.track, FIXED_DT, {
        steeringAssist: true,
        gentleRain: session.config.gentleRain,
        rushTimeActive: false,
        raceTimeMs: session.raceTimeMs,
        canMove,
      });
    }

    // Vehicle-vs-vehicle interactions
    if (canMove && session.allVehicles.length > 1) {
      resolveVehicleInteractions(
        session.allVehicles,
        (strength) => {
          audioManager.playOneShot('bump-soft', 0.35 + strength * 0.4, 1.05, 'sfx');
          session.cameraTrauma = Math.min(1, session.cameraTrauma + strength * 0.25);
        },
        undefined,
        () => {
          addRushPoints(session.flow, 10, () => triggerRushTime(session));
          store.incrementStat('nearMisses', 1);
          store.addJuiceText('NEAR MISS!', '#F2B544', '+RUSH');
        }
      );
    }
  }

  // Render interpolation alpha
  const alpha = physicsAccumulator / FIXED_DT;
  for (const v of session.allVehicles) {
    updateInterpolatedTransform(v, alpha);
  }

  // Step Flow meter & Chaos events at frame rate
  if (session.phase === 'racing') {
    stepFlowSystem(
      session.flow,
      rawDeltaSec,
      {
        speedKmh: session.player.speedKmh,
        maxSpeedKmh: session.player.config.maxSpeedKmh,
        onRoad: session.player.onRoad,
        isDrifting: session.player.isDrifting,
        isNitro: session.player.nitroActive,
        isDrafting: session.player.isDrafting,
        isAirborne: !session.player.grounded,
        steerAbs: Math.abs(session.player.steerInputSmoothed),
        nearScenic: session.player.waterProximity > 0.25,
        baseFov: store.settings.baseFov,
        reducedMotion: store.settings.reducedMotion,
      },
      {
        onZenLap: () => triggerZenLap(session),
        onRushTime: () => triggerRushTime(session),
      }
    );

    audioManager.updateFlowMix(session.flow.calm, session.flow.rush);

    // Step friendly chaos events
    session.chaos.step(
      rawDeltaSec,
      session.player.position,
      session.player.distanceAlongTrack,
      ({ type, kind }) => {
        if (kind === 'near-miss') {
          addRushPoints(session.flow, 10, () => triggerRushTime(session));
          store.incrementStat('nearMisses', 1);
          store.addJuiceText(
            type === 'deer-crossing' ? 'DEER NEAR MISS!' : 'CLOSE CALL!',
            '#F2B544',
            '+RUSH'
          );
          audioManager.playOneShot('boost-pad', 0.45, 1.35, 'sfx');
        } else if (kind === 'gust') {
          // Gentle sideways wind push
          session.player.lateralSpeed += (Math.random() > 0.5 ? 1 : -1) * 4.5;
          store.addJuiceText('LEAF BREEZE', '#5BA55B');
        } else if (kind === 'surface') {
          if (type === 'puddle') {
            audioManager.playOneShot('splash', 0.75, 1.0, 'sfx');
            session.player.forwardSpeed *= 0.94;
          } else {
            // Slippery leaves give a fun drift kick
            session.player.lateralSpeed += session.player.steerInputSmoothed * -3.5;
          }
        } else if (kind === 'flock') {
          addCalmPoints(session.flow, 6, () => triggerZenLap(session));
          store.addJuiceText('BIRDS IN FLIGHT', '#8CCBEA', '+CALM');
        } else if (kind === 'hit') {
          // Soft non-punishing slowdown + soft bump sound
          session.player.forwardSpeed *= 0.84;
          session.cameraTrauma = Math.min(1, session.cameraTrauma + 0.3);
          audioManager.playOneShot('bump-soft', 0.65, 0.95, 'sfx');
        }
      }
    );

    // Update live positions & check overtakes
    updateLivePositions(session);

    // Elimination mode timer (in career elimination events)
    const isElimination =
      session.config.careerEventId?.endsWith('-4') && session.config.mode === 'journey';
    if (isElimination) {
      session.eliminationTimer -= rawDeltaSec;
      if (session.eliminationTimer <= 0) {
        session.eliminationTimer = session.eliminationDuration;
        eliminateLastPlaceRacer(session);
      }
    }

    // Ghost sampling at 20 Hz
    session.ghostSampleTimer += rawDeltaSec;
    if (session.ghostSampleTimer >= 0.05) {
      session.ghostSampleTimer -= 0.05;
      if (session.currentLapGhostSamples.length < 3600) {
        session.currentLapGhostSamples.push({
          t: Math.round(session.player.currentLapTimeMs),
          x: +session.player.position.x.toFixed(2),
          y: +session.player.position.y.toFixed(2),
          z: +session.player.position.z.toFixed(2),
          yaw: +session.player.yaw.toFixed(3),
          pitch: +session.player.visualPitch.toFixed(3),
          roll: +session.player.visualRoll.toFixed(3),
          d: Math.round(session.player.distanceAlongTrack),
        });
      }
    }

    // Update Time Trial playback ghost & delta
    updateGhostPlayback(session);

    // Relax Drive cosy-hour tracker
    if (session.config.mode === 'relax-drive') {
      session.relaxSecondsAccum += rawDeltaSec;
      if (session.relaxSecondsAccum >= 60) {
        session.relaxSecondsAccum -= 60;
        store.incrementStat('relaxMinutes', 1);
      }
    }
  }

  // Decay camera shake trauma
  session.cameraTrauma = Math.max(0, session.cameraTrauma - rawDeltaSec * 1.6);

  // Update spatial & engine audio
  const nearestAIs = session.rivals
    .filter((r) => !r.physics.eliminated)
    .map((r) => {
      const dx = r.physics.position.x - session.player.position.x;
      const dz = r.physics.position.z - session.player.position.z;
      const dist = Math.hypot(dx, dz);
      const rightX = -Math.cos(session.player.yaw);
      const rightZ = Math.sin(session.player.yaw);
      const pan = dist > 0.1 ? (dx * rightX + dz * rightZ) / Math.min(dist, 25) : 0;
      return {
        dist,
        pan,
        relVelMpS: r.physics.forwardSpeed - session.player.forwardSpeed,
        rpmNorm: r.physics.rpmNorm,
      };
    })
    .sort((a, b) => a.dist - b.dist)
    .slice(0, 4);

  audioManager.updateVehicleAudio({
    rpmNorm: session.player.rpmNorm,
    throttle: session.player.throttle,
    speedKmh: session.player.speedKmh,
    slipRatio: session.player.slipRatio,
    isOffRoad: !session.player.onRoad,
    waterProximity: session.player.waterProximity,
    waterPan: session.player.waterPan,
    nearestAIs,
  });

  // Phase 4: Finish Cooldown -> Results Screen
  if (session.phase === 'cooldown') {
    session.cooldownTimer -= rawDeltaSec;
    if (session.cooldownTimer <= 0) {
      completeRaceAndShowResults(session);
    }
  }
}

function triggerZenLap(_session: ActiveRaceSession) {
  const store = useGameStore.getState();
  store.incrementStat('zenLaps', 1);
  store.addJuiceText('ZEN LAP +$500', '#5BA55B', 'PURE SERENITY');
  audioManager.playOneShot('lap-chime', 0.9, 1.15, 'sfx');
}

function triggerRushTime(_session: ActiveRaceSession) {
  const store = useGameStore.getState();
  store.incrementStat('rushTimes', 1);
  store.addJuiceText('RUSH TIME!', '#F2B544', '6s FREE NITRO');
  audioManager.playOneShot('nitro', 0.95, 1.1, 'sfx');
}

function updateLivePositions(session: ActiveRaceSession) {
  const len = session.track.totalLength;
  const active = session.allVehicles.filter((v) => !v.eliminated);
  active.sort((a, b) => {
    const scoreA = a.lap * len + a.distanceAlongTrack;
    const scoreB = b.lap * len + b.distanceAlongTrack;
    return scoreB - scoreA;
  });

  const newPos = active.findIndex((v) => v.isPlayer) + 1;
  if (newPos > 0) {
    if (
      newPos < session.previousPlayerPosition &&
      session.raceTimeMs > 4000 &&
      session.rivals.length > 0
    ) {
      addRushPoints(session.flow, 10, () => triggerRushTime(session));
      useGameStore.getState().addJuiceText(`OVERTAKE! P${newPos}`, '#F2B544', '+RUSH');
    }
    session.previousPlayerPosition = newPos;
    session.playerPosition = newPos;
  }
}

function eliminateLastPlaceRacer(session: ActiveRaceSession) {
  const len = session.track.totalLength;
  const remaining = session.allVehicles.filter((v) => !v.eliminated);
  if (remaining.length <= 1) return;

  remaining.sort((a, b) => {
    const scoreA = a.lap * len + a.distanceAlongTrack;
    const scoreB = b.lap * len + b.distanceAlongTrack;
    return scoreB - scoreA;
  });

  const last = remaining[remaining.length - 1];
  last.eliminated = true;

  const store = useGameStore.getState();
  if (last.isPlayer) {
    store.addJuiceText('KNOCKED OUT SOFTLY', '#E8913A');
    session.phase = 'cooldown';
    session.cooldownTimer = 1.8;
  } else {
    const rival = session.rivals.find((r) => r.physics.id === last.id);
    store.addJuiceText(`${rival?.name || 'Rival'} Eliminated`, '#F5EFD9', `${remaining.length - 1} Left`);
  }

  // If only player remains, player wins!
  const stillRemaining = session.allVehicles.filter((v) => !v.eliminated);
  if (stillRemaining.length === 1 && stillRemaining[0].isPlayer) {
    session.player.finished = true;
    session.player.finishTimeMs = session.raceTimeMs;
    session.phase = 'cooldown';
    session.cooldownTimer = 2.0;
  }
}

function updateGhostPlayback(session: ActiveRaceSession) {
  const samples = session.playbackGhostSamples;
  if (!samples || samples.length < 2) {
    session.liveGhostDeltaSec = null;
    return;
  }

  const tMs = session.player.currentLapTimeMs;
  // Find sample bracketing tMs
  let idx = Math.floor(tMs / 50);
  if (idx >= samples.length - 1) idx = samples.length - 2;
  if (idx < 0) idx = 0;

  const s0 = samples[idx];
  const s1 = samples[idx + 1];
  const span = Math.max(1, s1.t - s0.t);
  const f = THREE.MathUtils.clamp((tMs - s0.t) / span, 0, 1);

  session.ghostInterpolatedPos.set(
    THREE.MathUtils.lerp(s0.x, s1.x, f),
    THREE.MathUtils.lerp(s0.y, s1.y, f),
    THREE.MathUtils.lerp(s0.z, s1.z, f)
  );
  session.ghostInterpolatedYaw = THREE.MathUtils.lerp(s0.yaw, s1.yaw, f);

  // Compute live time delta based on spline distance
  const ghostDist = THREE.MathUtils.lerp(s0.d, s1.d, f);
  const distDiff = session.player.distanceAlongTrack - ghostDist;
  const approxSpeed = Math.max(15, session.player.forwardSpeed);
  session.liveGhostDeltaSec = -(distDiff / approxSpeed);
}

function completeRaceAndShowResults(session: ActiveRaceSession) {
  const store = useGameStore.getState();
  const len = session.track.totalLength;

  // Bank any active drift score
  const finalDriftScore = Math.round(
    session.player.totalDriftScore + session.player.currentDriftScore
  );

  // Build standings table
  const sorted = [...session.allVehicles].sort((a, b) => {
    if (a.eliminated !== b.eliminated) return a.eliminated ? 1 : -1;
    const scoreA = a.lap * len + a.distanceAlongTrack;
    const scoreB = b.lap * len + b.distanceAlongTrack;
    return scoreB - scoreA;
  });

  const standings: RivalFinishEntry[] = sorted.map((v, idx) => {
    const rival = session.rivals.find((r) => r.physics.id === v.id);
    const estTime = v.isPlayer
      ? Math.round(session.raceTimeMs)
      : Math.round(session.raceTimeMs + (idx - (session.playerPosition - 1)) * 1850);
    return {
      id: v.id,
      name: v.isPlayer ? 'You' : rival?.name || 'Rival',
      vehicleName: v.vehicleDef.name,
      vehicleType: v.vehicleDef.type,
      isPlayer: v.isPlayer,
      position: idx + 1,
      totalTimeMs: Math.max(10000, estTime),
      bestLapMs:
        v.bestLapTimeMs > 0
          ? Math.round(v.bestLapTimeMs)
          : Math.round(estTime / Math.max(1, session.config.laps)),
      driftScore: v.isPlayer ? finalDriftScore : Math.round(1500 + (7 - idx) * 1200),
      eliminated: v.eliminated,
    };
  });

  const playerPos = standings.find((s) => s.isPlayer)?.position || 1;
  const bestLapMs =
    session.player.bestLapTimeMs > 0
      ? Math.round(session.player.bestLapTimeMs)
      : Math.round(session.raceTimeMs / Math.max(1, session.config.laps));
  const prevBest = store.bestLapMs[session.config.trackId];
  const isNewBestLap = !prevBest || bestLapMs < prevBest;

  // Compute rewards & Career leaves
  let baseCash = 800;
  let baseXp = 160;
  let leavesEarned = 0;

  if (session.config.careerEventId) {
    const careerData = getGameData().career;
    for (const cup of careerData.cups) {
      const ev = cup.events.find((e) => e.id === session.config.careerEventId);
      if (ev) {
        baseCash = ev.rewards.cash;
        baseXp = ev.rewards.xp;
        if (ev.type === 'race' || ev.type === 'elimination') {
          leavesEarned = playerPos === 1 ? 3 : playerPos <= 3 ? 2 : 1;
        } else if (ev.type === 'time-trial' && ev.targetSeconds) {
          const totalSec = session.raceTimeMs / 1000;
          if (totalSec <= ev.targetSeconds['3']) leavesEarned = 3;
          else if (totalSec <= ev.targetSeconds['2']) leavesEarned = 2;
          else if (totalSec <= ev.targetSeconds['1']) leavesEarned = 1;
          else leavesEarned = 1; // Always gentle: finishing awards at least 1 leaf
        } else if (ev.type === 'drift' && ev.targetScore) {
          if (finalDriftScore >= ev.targetScore['3']) leavesEarned = 3;
          else if (finalDriftScore >= ev.targetScore['2']) leavesEarned = 2;
          else leavesEarned = 1;
        }
        break;
      }
    }
  } else {
    const posMul = Math.max(0.5, 1.3 - (playerPos - 1) * 0.1);
    baseCash = Math.round(900 * posMul);
    baseXp = Math.round(180 * posMul);
    leavesEarned = playerPos === 1 ? 3 : playerPos <= 3 ? 2 : 1;
  }

  // Flow multiplier rewards both Calm and Rush
  const flowMultiplier =
    1 + (session.flow.calmPeak + session.flow.rushPeak) / 400;
  const cashEarned =
    Math.round((baseCash * flowMultiplier) / 10) * 10 +
    session.flow.bonusCashEarned +
    Math.round(finalDriftScore * 0.02);
  const xpEarned = Math.round(baseXp * flowMultiplier);

  store.finishRace({
    mode: session.config.mode,
    trackId: session.config.trackId,
    vehicleId: store.selectedVehicleId,
    playerPosition: playerPos,
    totalRacers: standings.length,
    totalTimeMs: Math.round(session.raceTimeMs),
    bestLapMs,
    isNewBestLap,
    driftScore: finalDriftScore,
    calmPeak: Math.round(session.flow.calmPeak),
    rushPeak: Math.round(session.flow.rushPeak),
    zenLapsCount: session.flow.zenLapsCount,
    rushTimesCount: session.flow.rushTimesCount,
    cashEarned,
    xpEarned,
    leavesEarned,
    careerEventId: session.config.careerEventId,
    standings,
  });
}
