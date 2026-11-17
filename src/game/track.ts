import * as THREE from 'three';
import { SurfaceType, TrackDef, TrackId, TrackPropsData } from '../data/types';
import { getGameData, getTrackById } from '../data/gameData';

export interface TrackSample {
  index: number;
  distance: number;
  fraction: number;
  position: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  normal: THREE.Vector3;
  width: number;
  bankRad: number;
  yaw: number;
  curvature: number;
  aiOffset: number;
  aiTargetSpeedMpS: number;
}

export interface TrackQueryState {
  sampleIndex: number;
  sample: TrackSample;
  distance: number;
  lapProgress: number;
  lateralOffset: number;
  roadHeight: number;
  onRoad: boolean;
  surface: SurfaceType;
  normal: THREE.Vector3;
  tangent: THREE.Vector3;
  right: THREE.Vector3;
  waterProximity: number;
  waterPan: number;
}

export class BuiltTrack {
  public readonly id: TrackId;
  public readonly def: TrackDef;
  public readonly propsData: TrackPropsData;
  public readonly samples: TrackSample[] = [];
  public readonly totalLength: number;
  public readonly curve: THREE.CatmullRomCurve3;

  // Preallocated scratch vectors for zero-allocation queries
  private readonly _diff = new THREE.Vector3();
  private readonly _interpPos = new THREE.Vector3();
  private readonly _interpTan = new THREE.Vector3();
  private readonly _interpRight = new THREE.Vector3();
  private readonly _interpNorm = new THREE.Vector3();

  constructor(trackId: TrackId) {
    this.id = trackId;
    this.def = getTrackById(trackId);
    this.propsData = getGameData().trackProps[trackId];

    const ctrlPts = this.def.ctrl.map((c) => new THREE.Vector3(c[0], c[1], c[2]));
    this.curve = new THREE.CatmullRomCurve3(ctrlPts, true, 'catmullrom', 0.5);

    const approxLen = this.curve.getLength();
    const numSamples = Math.max(400, Math.round(approxLen)); // ~1m spacing
    const ctrlCount = this.def.ctrl.length;

    let cumDist = 0;
    const prevPos = new THREE.Vector3();

    for (let i = 0; i < numSamples; i++) {
      const u = i / numSamples;
      const pos = this.curve.getPointAt(u);
      const tan = this.curve.getTangentAt(u).normalize();

      if (i > 0) {
        cumDist += pos.distanceTo(prevPos);
      }
      prevPos.copy(pos);

      // Interpolate width and bankDeg from control points
      const fCtrl = u * ctrlCount;
      const idx0 = Math.floor(fCtrl) % ctrlCount;
      const idx1 = (idx0 + 1) % ctrlCount;
      const frac = fCtrl - Math.floor(fCtrl);
      const width =
        this.def.ctrl[idx0][3] * (1 - frac) + this.def.ctrl[idx1][3] * frac;
      const bankDeg =
        this.def.ctrl[idx0][4] * (1 - frac) + this.def.ctrl[idx1][4] * frac;
      const bankRad = THREE.MathUtils.degToRad(bankDeg);

      // Right vector in world (+Z forward, +Y up => right = cross(tan, up) or (-tan.z, 0, tan.x))
      const flatRight = new THREE.Vector3(-tan.z, 0, tan.x).normalize();
      const baseNormal = new THREE.Vector3().crossVectors(flatRight, tan).normalize();
      if (baseNormal.y < 0) baseNormal.negate();

      // Apply banking around tangent
      const right = flatRight.clone().applyAxisAngle(tan, bankRad).normalize();
      const normal = baseNormal.clone().applyAxisAngle(tan, bankRad).normalize();
      const yaw = Math.atan2(tan.x, tan.z);

      this.samples.push({
        index: i,
        distance: cumDist,
        fraction: u,
        position: pos,
        tangent: tan,
        right,
        normal,
        width,
        bankRad,
        yaw,
        curvature: 0,
        aiOffset: 0,
        aiTargetSpeedMpS: 50,
      });
    }

    // Close the loop distance
    const lastToFirst = this.samples[this.samples.length - 1].position.distanceTo(
      this.samples[0].position
    );
    this.totalLength = cumDist + lastToFirst;

    // Update exact fractions and compute curvature + AI racing line + speed profile
    const n = this.samples.length;
    for (let i = 0; i < n; i++) {
      const s = this.samples[i];
      s.fraction = s.distance / this.totalLength;

      const prev = this.samples[(i - 8 + n) % n];
      const next = this.samples[(i + 8) % n];
      let dYaw = next.yaw - prev.yaw;
      while (dYaw > Math.PI) dYaw -= Math.PI * 2;
      while (dYaw < -Math.PI) dYaw += Math.PI * 2;
      const arcDist = 16;
      s.curvature = dYaw / arcDist; // rad per metre

      // Smooth apex offset: cut toward inside of corner up to 32% of half-width
      const maxOffset = s.width * 0.28;
      s.aiOffset = THREE.MathUtils.clamp(-s.curvature * 110, -maxOffset, maxOffset);
    }

    // Smooth AI offsets and compute look-ahead corner speed profile
    for (let i = 0; i < n; i++) {
      let maxCurvAhead = 0;
      for (let look = 0; look <= 45; look += 5) {
        const sc = Math.abs(this.samples[(i + look) % n].curvature);
        if (sc > maxCurvAhead) maxCurvAhead = sc;
      }
      // Cornering speed limit: v = sqrt(a_lat / curvature)
      const safeLatAccel = 15.5; // m/s^2
      const cornerSpeed =
        maxCurvAhead > 0.0025
          ? Math.sqrt(safeLatAccel / maxCurvAhead)
          : 68;
      this.samples[i].aiTargetSpeedMpS = THREE.MathUtils.clamp(cornerSpeed, 20, 65);
    }
  }

  public getSampleAtDistance(dist: number): TrackSample {
    const n = this.samples.length;
    const wrapped = ((dist % this.totalLength) + this.totalLength) % this.totalLength;
    const approxIdx = Math.floor((wrapped / this.totalLength) * n) % n;
    return this.samples[approxIdx];
  }

  /**
   * Fast allocation-light track query for physics & AI.
   * Uses hintIndex when provided to search a local window first, falling back to coarse+fine search.
   */
  public getTrackState(
    pos: THREE.Vector3,
    hintIndex?: number,
    out?: TrackQueryState
  ): TrackQueryState {
    const n = this.samples.length;
    let bestIdx = 0;
    let bestDistSq = Infinity;

    if (hintIndex !== undefined && hintIndex >= 0 && hintIndex < n) {
      // Search +/- 35 samples around hintIndex
      for (let offset = -35; offset <= 35; offset++) {
        const idx = (hintIndex + offset + n) % n;
        const p = this.samples[idx].position;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }

    // If no hint or far from hint (> 30m), do a coarse stride search then refine
    if (bestDistSq > 900) {
      const stride = 12;
      for (let i = 0; i < n; i += stride) {
        const p = this.samples[i].position;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = i;
        }
      }
      const center = bestIdx;
      for (let offset = -stride; offset <= stride; offset++) {
        const idx = (center + offset + n) % n;
        const p = this.samples[idx].position;
        const dx = pos.x - p.x;
        const dz = pos.z - p.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestIdx = idx;
        }
      }
    }

    const s0 = this.samples[bestIdx];
    const sNext = this.samples[(bestIdx + 1) % n];
    const sPrev = this.samples[(bestIdx - 1 + n) % n];

    // Sub-sample projection along tangent
    this._diff.subVectors(pos, s0.position);
    const along = this._diff.dot(s0.tangent);
    let interpSampleA = s0;
    let interpSampleB = sNext;
    let t = 0;

    if (along >= 0) {
      const segLen = Math.max(0.1, s0.position.distanceTo(sNext.position));
      t = THREE.MathUtils.clamp(along / segLen, 0, 1);
    } else {
      interpSampleA = sPrev;
      interpSampleB = s0;
      const segLen = Math.max(0.1, sPrev.position.distanceTo(s0.position));
      t = THREE.MathUtils.clamp(1 + along / segLen, 0, 1);
    }

    this._interpPos.lerpVectors(interpSampleA.position, interpSampleB.position, t);
    this._interpTan.lerpVectors(interpSampleA.tangent, interpSampleB.tangent, t).normalize();
    this._interpRight.lerpVectors(interpSampleA.right, interpSampleB.right, t).normalize();
    this._interpNorm.lerpVectors(interpSampleA.normal, interpSampleB.normal, t).normalize();

    this._diff.subVectors(pos, this._interpPos);
    const lateralOffset = this._diff.dot(this._interpRight);
    const roadHeight = this._interpPos.y + lateralOffset * this._interpRight.y;

    let distance = interpSampleA.distance + t * 1.0;
    if (distance >= this.totalLength) distance -= this.totalLength;
    if (distance < 0) distance += this.totalLength;
    const lapProgress = distance / this.totalLength;

    const halfWidth = s0.width * 0.5;
    const kerbW = this.def.surfaces.kerbWidth || 0.55;
    const shoulderW = this.def.surfaces.shoulderWidth || 3.2;
    const absLat = Math.abs(lateralOffset);
    const onRoad = absLat <= halfWidth + kerbW;

    // Determine surface type
    let surface: SurfaceType = 'asphalt';
    if (!onRoad) {
      // Check gravel shortcut on Lakeside Haven
      let inGravelShortcut = false;
      for (const gs of this.def.surfaces.gravelShortcuts) {
        const [fromF, toF, side] = gs;
        const sideMatch =
          (side === 'left' && lateralOffset < 0) || (side === 'right' && lateralOffset > 0);
        if (lapProgress >= fromF && lapProgress <= toF && sideMatch && absLat <= halfWidth + 7.5) {
          inGravelShortcut = true;
          break;
        }
      }
      if (inGravelShortcut || absLat <= halfWidth + kerbW + shoulderW) {
        surface = 'gravel';
      } else {
        surface = 'grass';
      }
    } else {
      // Check leaf zones on Amber Woods
      for (const lz of this.def.surfaces.leafZones) {
        if (lapProgress >= lz[0] && lapProgress <= lz[1]) {
          surface = 'leaves';
          break;
        }
      }
    }

    // Water proximity for stream audio
    let waterProximity = 0;
    let waterPan = 0;
    if (this.id === 'emerald-valley') {
      // Stream follows the northern/eastern meadow curve
      if (lapProgress > 0.08 && lapProgress < 0.35) {
        waterProximity = 0.65;
        waterPan = 0.45;
      }
    } else if (this.id === 'amber-woods') {
      // Covered bridge at ~0.55
      const dBridge = Math.abs(lapProgress - 0.55);
      if (dBridge < 0.08) {
        waterProximity = 1 - dBridge / 0.08;
        waterPan = Math.sin((lapProgress - 0.55) * 40) * 0.6;
      }
    } else if (this.id === 'lakeside-haven') {
      // Waterfall at ~0.30
      const dFalls = Math.abs(lapProgress - 0.3);
      if (dFalls < 0.09) {
        waterProximity = 1 - dFalls / 0.09;
        waterPan = -0.5;
      }
    }

    if (out) {
      out.sampleIndex = bestIdx;
      out.sample = s0;
      out.distance = distance;
      out.lapProgress = lapProgress;
      out.lateralOffset = lateralOffset;
      out.roadHeight = roadHeight;
      out.onRoad = onRoad;
      out.surface = surface;
      out.normal.copy(this._interpNorm);
      out.tangent.copy(this._interpTan);
      out.right.copy(this._interpRight);
      out.waterProximity = waterProximity;
      out.waterPan = waterPan;
      return out;
    }

    return {
      sampleIndex: bestIdx,
      sample: s0,
      distance,
      lapProgress,
      lateralOffset,
      roadHeight,
      onRoad,
      surface,
      normal: this._interpNorm.clone(),
      tangent: this._interpTan.clone(),
      right: this._interpRight.clone(),
      waterProximity,
      waterPan,
    };
  }
}

const builtTrackCache = new Map<TrackId, BuiltTrack>();

export function getBuiltTrack(trackId: TrackId): BuiltTrack {
  let bt = builtTrackCache.get(trackId);
  if (!bt) {
    bt = new BuiltTrack(trackId);
    builtTrackCache.set(trackId, bt);
  }
  return bt;
}
