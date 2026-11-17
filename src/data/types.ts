export type VehicleType = 'car' | 'bike';

export interface VehicleStats {
  speed: number;
  acceleration: number;
  handling: number;
  grip: number;
  nitro: number;
}

export interface VehiclePhysicsConfig {
  massKg: number;
  maxSpeedKmh: number;
  accel0to100: number;
  engineForceN: number;
  dragK: number;
  rollingResistance: number;
  downforce: number;
  wheelbaseM: number;
  cgHeightM: number;
  idleRpm: number;
  redlineRpm: number;
  gears: number[];
  finalDrive: number;
  torqueCurve: [number, number][];
  gripFront: number;
  gripRear: number;
  brakeForceN: number;
  steerLockDeg: number;
  highSpeedSteerFactor: number;
  steerSmoothing: number;
  driftBias: number;
  nitroSeconds: number;
  nitroForceBoost: number;
  maxLeanDeg?: number;
  wheelieTorque?: number;
  stoppieDecel?: number;
}

export interface VehicleDef {
  id: string;
  name: string;
  type: VehicleType;
  description: string;
  price: number;
  unlockLevel: number;
  starter: boolean;
  defaultColor: string;
  defaultAccent: string;
  defaultWheel?: string;
  model: string;
  thumbnail: string;
  stats: VehicleStats;
  physics: VehiclePhysicsConfig;
  visual: {
    dimensions: { length: number; width: number; height: number };
    wheelRadius: number;
    trackHalf?: number;
    maxLeanDeg?: number;
  };
}

export type UpgradeCategoryKey = 'engine' | 'tyres' | 'nitro' | 'chassis';

export interface UpgradeCategoryDef {
  name: string;
  icon: string;
  perLevel: Record<string, number>;
  desc: string;
}

export interface UpgradesConfig {
  levels: number;
  costs: number[];
  priceScaleByVehiclePrice: number;
  categories: Record<UpgradeCategoryKey, UpgradeCategoryDef>;
}

export type SurfaceType = 'asphalt' | 'gravel' | 'grass' | 'leaves' | 'sand' | 'puddle';

export interface SurfaceDef {
  grip: number;
  drag: number;
}

export interface VehiclesDataFile {
  version: number;
  vehicles: VehicleDef[];
  upgrades: UpgradesConfig;
  surfaces: Record<SurfaceType, SurfaceDef>;
}

export interface BlueprintDef {
  id: string;
  type: VehicleType;
  model: string;
  noRiderModel?: string;
  dimensions: { length: number; width: number; height: number };
  wheelbase?: number;
  wheelRadius: number | { front: number; rear: number };
  tireWidth: number | { front: number; rear: number };
  nodes: Record<string, any>;
}

export interface BlueprintsDataFile {
  version: number;
  materials: Record<string, string>;
  wheelStyles: { id: string; model: string }[];
  blueprints: BlueprintDef[];
}

export type TrackId = 'emerald-valley' | 'amber-woods' | 'lakeside-haven';

export interface TrackChaosWeight {
  type: string;
  weight: number;
}

export interface TrackDef {
  id: TrackId;
  name: string;
  season: string;
  timeOfDay: string;
  difficulty: number;
  lengthKm: number;
  lengthM: number;
  defaultLaps: number;
  closed: boolean;
  ctrl: [number, number, number, number, number][]; // [x, y, z, width, bankDeg]
  minCornerRadiusM: number;
  music: string;
  ambience: { id: string; volume: number; nearProp?: string }[];
  card: string;
  models: {
    map: string;
    props: string;
    heightmap: string;
    minimap: string;
    topDown: string;
  };
  bounds: { minX: number; maxX: number; minZ: number; maxZ: number };
  surfaces: {
    default: SurfaceType;
    shoulderWidth: number;
    kerbWidth: number;
    edges: string;
    leafZones: [number, number][];
    gravelShortcuts: [number, number, string][];
  };
  jumps: { at: number; model: string }[];
  boostPads: { at: number; model: string }[];
  chaos: TrackChaosWeight[];
  chaosIntervalSeconds: [number, number];
  waterLevel: number | null;
}

export interface TrackPropsData {
  seed: number;
  instances: Record<string, [number, number, number, number, number][]>; // [x, y, z, rotY, scale]
  furniture: {
    startFinish: { model: string; pos: [number, number, number]; yaw: number };
    checkpoints: { index: number; distance: number; pos: [number, number, number] | string; yaw: number; halfWidth: number }[];
    startGrid: { slot: number; pos: [number, number, number]; yaw: number }[];
    jumps: { model: string; at: number; pos: [number, number, number]; yaw: number }[];
    boostPads: { model: string; at: number; pos: [number, number, number]; yaw: number }[];
    chevrons: { pos: [number, number, number]; yaw: number }[];
    fences: { model: string; pos: [number, number, number]; yaw: number }[];
    leafPatches: { model: string; pos: [number, number, number]; yaw: number; radius: number }[];
    gravel: { fromFraction: number; toFraction: number; side: string }[];
    extra: { model: string; at?: number; pos: [number, number, number]; yaw: number }[];
  };
  chaosEvents: {
    type: string;
    distance: number;
    lateral: number;
    pos: [number, number, number];
    yaw: number;
    telegraphMeters: number;
  }[];
  backdrop: { model: string; pos: [number, number, number]; yaw: number; scale: number }[];
  clouds: { model: string; pos: [number, number, number]; scale: number }[];
  streams?: [number, number, number][][];
  waterLevel?: number | null;
}

export interface TrackLightingDef {
  sun: { color: string; intensity: number; position: [number, number, number] };
  hemi: { sky: string; ground: string; intensity: number };
  fog: { color: string; density: number };
  skyTint: string;
  exposure: number;
  bloom: number;
  vignette: number;
  saturation: number;
}

export interface LiveryDef {
  id: string;
  name: string;
  color: string;
  accent: string;
}

export interface QualityPresetDef {
  shadows: boolean;
  postprocessing: boolean;
  particles: number;
  grass: number;
  drawDistance: number;
}

export type QualityLevel = 'low' | 'medium' | 'high';

export interface ThemeDataFile {
  palette: Record<string, string>;
  liveries: LiveryDef[];
  wheelStyles: { id: string; model: string }[];
  fonts: { display: string; body: string; googleFontsUrl: string };
  ui: Record<string, string>;
  flow: {
    range: [number, number];
    seeSaw: number;
    calmFov: number;
    rushFov: number;
    rushSaturationBoost: number;
    fullRushSeconds: number;
    zenLapBonusCash: number;
    calmGain: {
      smoothDriving: number;
      scenicSlow: number;
      cleanLap: number;
      photo: number;
    };
    rushGain: {
      drift: number;
      nitro: number;
      draft: number;
      nearMiss: number;
      airTime: number;
      boostPad: number;
      overtake: number;
    };
    drainPerSecond: number;
  };
  lighting: Record<TrackId, TrackLightingDef>;
  qualityPresets: Record<QualityLevel, QualityPresetDef>;
  particles: string[];
}

export type CareerEventType = 'race' | 'time-trial' | 'drift' | 'elimination';
export type DifficultyLevel = 'chill' | 'normal' | 'hard' | 'insane';

export interface CareerEventDef {
  id: string;
  name: string;
  type: CareerEventType;
  track: TrackId;
  laps?: number;
  difficulty?: DifficultyLevel;
  rivals?: number;
  targetSeconds?: { '1': number; '2': number; '3': number };
  targetScore?: { '1': number; '2': number; '3': number };
  eliminationEverySeconds?: number;
  rewards: { cash: number; xp: number };
  leaves?: Record<string, string>;
  vehicleClass?: string;
}

export interface CareerCupDef {
  id: string;
  name: string;
  unlock: { leaves: number };
  events: CareerEventDef[];
}

export interface CareerDataFile {
  version: number;
  cups: CareerCupDef[];
  levels: {
    xpCurve: string;
    milestones: { level: number; unlocks: string }[];
  };
}

export interface AchievementDef {
  id: string;
  name: string;
  description: string;
  icon: string;
  stat: string;
  target: number;
  reward: { cash: number };
}

export interface AchievementsDataFile {
  version: number;
  achievements: AchievementDef[];
}

export interface AudioFileEntry {
  id: string;
  file: string;
  category: 'sfx' | 'ambience' | 'music';
  durationSec: number;
  sampleRate: number;
  channels: number;
  loop?: boolean;
  track?: string;
  use?: string;
}

export interface AudioDataFile {
  version: number;
  sampleRate: number;
  buses: {
    master: number;
    music: number;
    sfx: number;
    ambience: number;
    ui: number;
  };
  engine: {
    car: { file: string; rateRange: [number, number] };
    bike: { file: string; rateRange: [number, number] };
  };
  oneShotMinGapMs: number;
  music: Record<string, string>;
  ambience: Record<string, string>;
  crossfadeSec: number;
  files: AudioFileEntry[];
}

export type GameMode = 'quick-race' | 'relax-drive' | 'journey' | 'time-trial' | 'drift-attack';
export type ScreenName = 'loading' | 'menu' | 'garage' | 'journey' | 'track-select' | 'race' | 'results' | 'achievements';
export type CameraMode = 'chase' | 'far-chase' | 'hood' | 'orbit';

export interface VehicleUpgrades {
  engine: number;
  tyres: number;
  nitro: number;
  chassis: number;
}

export interface VehicleCustomisation {
  liveryId: string;
  color: string;
  accent: string;
  wheelStyle: string;
  plateText: string;
}

export interface GhostSample {
  t: number;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  roll: number;
  d: number; // spline distance
}

export interface GhostRecording {
  trackId: TrackId;
  vehicleId: string;
  lapTimeMs: number;
  samples: GhostSample[];
}

export interface FloatingJuiceText {
  id: number;
  text: string;
  subtext?: string;
  color: string;
  createdAt: number;
}
