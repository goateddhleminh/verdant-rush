import * as THREE from 'three';
import { getGameData } from '../data/gameData';

export interface FlowState {
  calm: number; // 0..100
  rush: number; // 0..100
  calmPeak: number;
  rushPeak: number;
  zenLapsCount: number;
  rushTimesCount: number;
  rushTimeRemaining: number; // > 0 during 6s RUSH TIME burst
  zenShimmerRemaining: number; // > 0 during ZEN LAP golden shimmer
  slowMoRemaining: number; // > 0 during slow-mo flash
  timeScale: number; // 1.0 normal, 0.5 during slow-mo flash
  cleanDrivingTimer: number;
  currentFov: number;
  currentSaturation: number;
  currentChromatic: number;
  speedLinesOpacity: number;
  bonusCashEarned: number;
}

export function createInitialFlowState(baseFov: number = 64): FlowState {
  return {
    calm: 25,
    rush: 10,
    calmPeak: 25,
    rushPeak: 10,
    zenLapsCount: 0,
    rushTimesCount: 0,
    rushTimeRemaining: 0,
    zenShimmerRemaining: 0,
    slowMoRemaining: 0,
    timeScale: 1.0,
    cleanDrivingTimer: 0,
    currentFov: baseFov,
    currentSaturation: 0,
    currentChromatic: 0,
    speedLinesOpacity: 0,
    bonusCashEarned: 0,
  };
}

export function addCalmPoints(
  flow: FlowState,
  amount: number,
  onZenLap?: () => void
) {
  const cfg = getGameData().theme.flow;
  if (amount <= 0) return;
  flow.calm = Math.min(100, flow.calm + amount);
  flow.rush = Math.max(0, flow.rush - amount * cfg.seeSaw * 0.65);
  if (flow.calm > flow.calmPeak) flow.calmPeak = flow.calm;

  if (flow.calm >= 100 && flow.zenShimmerRemaining <= 0) {
    flow.calm = 45; // Reset gently after Zen trigger so player can fill it again
    flow.zenLapsCount += 1;
    flow.zenShimmerRemaining = 5.0;
    flow.bonusCashEarned += cfg.zenLapBonusCash || 500;
    onZenLap?.();
  }
}

export function addRushPoints(
  flow: FlowState,
  amount: number,
  onRushTime?: () => void
) {
  const cfg = getGameData().theme.flow;
  if (amount <= 0) return;
  flow.rush = Math.min(100, flow.rush + amount);
  flow.calm = Math.max(0, flow.calm - amount * cfg.seeSaw * 0.65);
  if (flow.rush > flow.rushPeak) flow.rushPeak = flow.rush;

  if (flow.rush >= 100 && flow.rushTimeRemaining <= 0) {
    flow.rush = 55;
    flow.rushTimesCount += 1;
    flow.rushTimeRemaining = cfg.fullRushSeconds || 6;
    flow.slowMoRemaining = 0.6;
    flow.bonusCashEarned += 300;
    onRushTime?.();
  }
}

export function stepFlowSystem(
  flow: FlowState,
  dt: number,
  params: {
    speedKmh: number;
    maxSpeedKmh: number;
    onRoad: boolean;
    isDrifting: boolean;
    isNitro: boolean;
    isDrafting: boolean;
    isAirborne: boolean;
    steerAbs: number;
    nearScenic: boolean;
    baseFov: number;
    reducedMotion: boolean;
  },
  callbacks?: {
    onZenLap?: () => void;
    onRushTime?: () => void;
  }
) {
  const cfg = getGameData().theme.flow;

  // Timers
  if (flow.rushTimeRemaining > 0) {
    flow.rushTimeRemaining = Math.max(0, flow.rushTimeRemaining - dt);
  }
  if (flow.zenShimmerRemaining > 0) {
    flow.zenShimmerRemaining = Math.max(0, flow.zenShimmerRemaining - dt);
  }
  if (flow.slowMoRemaining > 0) {
    flow.slowMoRemaining = Math.max(0, flow.slowMoRemaining - dt);
    flow.timeScale = THREE.MathUtils.lerp(flow.timeScale, 0.52, dt * 14);
  } else {
    flow.timeScale = THREE.MathUtils.lerp(flow.timeScale, 1.0, dt * 8);
  }

  // Natural gentle decay
  const drain = (cfg.drainPerSecond || 1.5) * dt;
  flow.calm = Math.max(0, flow.calm - drain * 0.45);
  flow.rush = Math.max(0, flow.rush - drain * 0.65);

  // Calm gains from smooth clean driving on road
  if (params.onRoad && !params.isDrifting && params.speedKmh > 25) {
    flow.cleanDrivingTimer += dt;
    const smoothFactor = params.steerAbs < 0.45 ? 1.15 : 0.7;
    addCalmPoints(
      flow,
      cfg.calmGain.smoothDriving * smoothFactor * dt,
      callbacks?.onZenLap
    );
  } else {
    flow.cleanDrivingTimer = Math.max(0, flow.cleanDrivingTimer - dt * 2);
  }

  if (params.nearScenic && params.speedKmh > 15 && params.speedKmh < 110) {
    addCalmPoints(flow, cfg.calmGain.scenicSlow * dt, callbacks?.onZenLap);
  }

  // Continuous Rush gains
  if (params.isDrifting && params.speedKmh > 40) {
    addRushPoints(flow, cfg.rushGain.drift * dt, callbacks?.onRushTime);
  }
  if (params.isNitro) {
    addRushPoints(flow, cfg.rushGain.nitro * dt, callbacks?.onRushTime);
  }
  if (params.isDrafting) {
    addRushPoints(flow, cfg.rushGain.draft * dt, callbacks?.onRushTime);
  }
  if (params.isAirborne) {
    addRushPoints(flow, cfg.rushGain.airTime * dt, callbacks?.onRushTime);
  }

  // Compute smoothly blended visual parameters
  const calmNorm = flow.calm / 100;
  const rushNorm = flow.rush / 100;
  const speedRatio = THREE.MathUtils.clamp(params.speedKmh / Math.max(100, params.maxSpeedKmh), 0, 1.2);

  const minFov = Math.min(cfg.calmFov, params.baseFov);
  const maxFov = cfg.rushFov;
  const nitroKick = params.isNitro || flow.rushTimeRemaining > 0 ? 5.5 : 0;
  const targetFov = params.reducedMotion
    ? params.baseFov
    : THREE.MathUtils.lerp(
        minFov,
        maxFov,
        THREE.MathUtils.clamp(rushNorm * 0.65 + speedRatio * 0.35 - calmNorm * 0.15, 0, 1)
      ) + nitroKick;

  flow.currentFov = THREE.MathUtils.lerp(flow.currentFov, targetFov, dt * 4.5);

  const targetSat = rushNorm * (cfg.rushSaturationBoost || 0.15);
  flow.currentSaturation = THREE.MathUtils.lerp(flow.currentSaturation, targetSat, dt * 3);

  const targetChrom = params.reducedMotion
    ? 0
    : Math.max(0, (rushNorm - 0.35) * 0.0025 + (params.isNitro ? 0.0012 : 0));
  flow.currentChromatic = THREE.MathUtils.lerp(flow.currentChromatic, targetChrom, dt * 5);

  const targetSpeedLines = params.reducedMotion
    ? 0
    : THREE.MathUtils.clamp(
        (speedRatio - 0.55) * 0.9 + rushNorm * 0.45 + (params.isNitro ? 0.35 : 0),
        0,
        0.85
      );
  flow.speedLinesOpacity = THREE.MathUtils.lerp(
    flow.speedLinesOpacity,
    targetSpeedLines,
    dt * 6
  );
}
