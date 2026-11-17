import * as THREE from 'three';
import { BuiltTrack } from './track';
import { SeededRNG } from '../data/seededRandom';

export type ChaosEventType =
  | 'deer-crossing'
  | 'fallen-log'
  | 'falling-branch'
  | 'pumpkin-cart'
  | 'rock-slide-pebbles'
  | 'wind-gust'
  | 'puddle'
  | 'slippery-leaves'
  | 'seagull-flock';

export interface ActiveChaosInstance {
  id: number;
  type: ChaosEventType;
  distance: number;
  lateral: number;
  basePosition: THREE.Vector3;
  position: THREE.Vector3;
  yaw: number;
  radius: number;
  telegraphMeters: number;
  active: boolean;
  triggeredByPlayer: boolean;
  nearMissedByPlayer: boolean;
  animPhase: number;
  hopBounceY: number;
}

export class ChaosManager {
  public readonly instances: ActiveChaosInstance[] = [];
  private rng: SeededRNG;
  private track: BuiltTrack;
  private spawnTimer = 8;
  private nextId = 1;

  constructor(track: BuiltTrack, seed: number = 101) {
    this.track = track;
    this.rng = new SeededRNG(seed);
    this.initStaticAndSeededEvents();
  }

  private initStaticAndSeededEvents() {
    // 1. Load static chaos spots from *-props.json -> chaosEvents
    const staticEvents = this.track.propsData.chaosEvents || [];
    for (const ev of staticEvents) {
      const pos = new THREE.Vector3(ev.pos[0], ev.pos[1], ev.pos[2]);
      this.instances.push({
        id: this.nextId++,
        type: ev.type as ChaosEventType,
        distance: ev.distance,
        lateral: ev.lateral,
        basePosition: pos.clone(),
        position: pos.clone(),
        yaw: ev.yaw,
        radius: this.getRadiusForType(ev.type as ChaosEventType),
        telegraphMeters: ev.telegraphMeters || 60,
        active: true,
        triggeredByPlayer: false,
        nearMissedByPlayer: false,
        animPhase: this.rng.range(0, Math.PI * 2),
        hopBounceY: 0,
      });
    }

    // 2. Seed additional friendly chaos events around the track so every lap has life
    const weights = this.track.def.chaos;
    if (weights && weights.length > 0) {
      const count = 6;
      for (let i = 0; i < count; i++) {
        const dist = ((i + 0.5) / count) * this.track.totalLength + this.rng.range(-45, 45);
        const wrappedDist = ((dist % this.track.totalLength) + this.track.totalLength) % this.track.totalLength;
        // Avoid spawning right on the start/finish line
        if (wrappedDist < 90 || wrappedDist > this.track.totalLength - 70) continue;

        const chosen = this.rng.pickWeighted(weights);
        const sample = this.track.getSampleAtDistance(wrappedDist);
        const lat = this.rng.range(-sample.width * 0.32, sample.width * 0.32);
        const pos = sample.position
          .clone()
          .addScaledVector(sample.right, lat);

        this.instances.push({
          id: this.nextId++,
          type: chosen.type as ChaosEventType,
          distance: wrappedDist,
          lateral: lat,
          basePosition: pos.clone(),
          position: pos.clone(),
          yaw: sample.yaw + (chosen.type === 'deer-crossing' ? Math.PI * 0.5 : 0),
          radius: this.getRadiusForType(chosen.type as ChaosEventType),
          telegraphMeters: 65,
          active: true,
          triggeredByPlayer: false,
          nearMissedByPlayer: false,
          animPhase: this.rng.range(0, Math.PI * 2),
          hopBounceY: 0,
        });
      }
    }
  }

  private getRadiusForType(type: ChaosEventType): number {
    switch (type) {
      case 'deer-crossing':
        return 1.8;
      case 'fallen-log':
      case 'falling-branch':
      case 'pumpkin-cart':
        return 2.1;
      case 'puddle':
      case 'slippery-leaves':
        return 3.2;
      case 'wind-gust':
        return 4.5;
      case 'seagull-flock':
      case 'rock-slide-pebbles':
      default:
        return 2.5;
    }
  }

  public step(
    dt: number,
    playerPos: THREE.Vector3,
    playerDist: number,
    onEventEffect: (effect: {
      type: ChaosEventType;
      kind: 'hit' | 'near-miss' | 'gust' | 'surface' | 'flock';
      instance: ActiveChaosInstance;
    }) => void
  ) {
    // Periodic dynamic scheduler (every 12-20s refreshes/activates an event ahead of the player)
    this.spawnTimer -= dt;
    if (this.spawnTimer <= 0) {
      const [minS, maxS] = this.track.def.chaosIntervalSeconds || [12, 20];
      this.spawnTimer = this.rng.range(minS, maxS);
      // Reset any triggered instances behind the player so the next lap is fresh
      for (const inst of this.instances) {
        const d = Math.abs(inst.distance - playerDist);
        if (d > 140 && d < this.track.totalLength - 140) {
          inst.triggeredByPlayer = false;
          inst.nearMissedByPlayer = false;
          inst.hopBounceY = 0;
        }
      }
    }

    for (const inst of this.instances) {
      inst.animPhase += dt * 2.4;

      // Animate deer gently walking across road
      if (inst.type === 'deer-crossing') {
        const sample = this.track.getSampleAtDistance(inst.distance);
        const walkLat = Math.sin(inst.animPhase * 0.55) * (sample.width * 0.42);
        inst.lateral = walkLat;
        inst.position
          .copy(sample.position)
          .addScaledVector(sample.right, walkLat);
        inst.position.y += Math.abs(Math.sin(inst.animPhase * 3.5)) * 0.18 + inst.hopBounceY;
        const dirSign = Math.cos(inst.animPhase * 0.55) >= 0 ? 1 : -1;
        inst.yaw = sample.yaw + dirSign * (Math.PI * 0.5);
      }

      if (inst.hopBounceY > 0) {
        inst.hopBounceY = Math.max(0, inst.hopBounceY - dt * 3.5);
      }

      // Check player interaction
      const dx = playerPos.x - inst.position.x;
      const dz = playerPos.z - inst.position.z;
      const distSq = dx * dx + dz * dz;
      const hitR = inst.radius + 1.1;
      const nearR = inst.radius + 3.8;

      if (distSq <= hitR * hitR && !inst.triggeredByPlayer) {
        inst.triggeredByPlayer = true;
        if (inst.type === 'deer-crossing' || inst.type === 'seagull-flock') {
          inst.hopBounceY = 2.2;
        }
        if (inst.type === 'wind-gust') {
          onEventEffect({ type: inst.type, kind: 'gust', instance: inst });
        } else if (inst.type === 'puddle' || inst.type === 'slippery-leaves') {
          onEventEffect({ type: inst.type, kind: 'surface', instance: inst });
        } else if (inst.type === 'seagull-flock') {
          onEventEffect({ type: inst.type, kind: 'flock', instance: inst });
        } else {
          onEventEffect({ type: inst.type, kind: 'hit', instance: inst });
        }
      } else if (
        distSq > hitR * hitR &&
        distSq <= nearR * nearR &&
        !inst.nearMissedByPlayer &&
        !inst.triggeredByPlayer
      ) {
        if (
          inst.type === 'deer-crossing' ||
          inst.type === 'fallen-log' ||
          inst.type === 'falling-branch' ||
          inst.type === 'pumpkin-cart' ||
          inst.type === 'rock-slide-pebbles'
        ) {
          inst.nearMissedByPlayer = true;
          onEventEffect({ type: inst.type, kind: 'near-miss', instance: inst });
        }
      }
    }
  }
}
