import {
  AchievementsDataFile,
  AudioDataFile,
  BlueprintsDataFile,
  CareerDataFile,
  ThemeDataFile,
  TrackDef,
  TrackId,
  TrackPropsData,
  UpgradeCategoryKey,
  VehicleDef,
  VehiclePhysicsConfig,
  VehicleStats,
  VehicleUpgrades,
  VehiclesDataFile,
} from './types';

export interface LoadedGameData {
  theme: ThemeDataFile;
  vehiclesData: VehiclesDataFile;
  blueprintsData: BlueprintsDataFile;
  tracks: TrackDef[];
  career: CareerDataFile;
  achievements: AchievementsDataFile;
  audio: AudioDataFile;
  trackProps: Record<TrackId, TrackPropsData>;
}

let cachedData: LoadedGameData | null = null;

/** Core 6 signature vehicles featured in the masterprompt, plus all others from vehicles.json */
export const CORE_VEHICLE_IDS = [
  'moss-hatch',
  'ember-coupe',
  'timberline-4x4',
  'fern-250',
  'hawk-adventure',
  'pebble-trials',
] as const;

export async function loadAllGameData(
  onProgress?: (loaded: number, total: number, label: string) => void
): Promise<LoadedGameData> {
  if (cachedData) return cachedData;

  const urls = [
    { key: 'theme', url: '/assets/data/theme.json', label: 'Reading palette & lighting...' },
    { key: 'vehicles', url: '/assets/data/vehicles.json', label: 'Loading vehicle specs...' },
    { key: 'blueprints', url: '/assets/data/vehicle-blueprints.json', label: 'Loading blueprints...' },
    { key: 'tracks', url: '/assets/data/tracks.json', label: 'Loading forest splines...' },
    { key: 'career', url: '/assets/data/career.json', label: 'Loading Journey cups...' },
    { key: 'achievements', url: '/assets/data/achievements.json', label: 'Loading milestones...' },
    { key: 'audio', url: '/assets/data/audio.json', label: 'Loading audio manifest...' },
    { key: 'props-emerald', url: '/assets/data/maps/emerald-valley-props.json', label: 'Planting Emerald Valley...' },
    { key: 'props-amber', url: '/assets/data/maps/amber-woods-props.json', label: 'Planting Amber Woods...' },
    { key: 'props-lakeside', url: '/assets/data/maps/lakeside-haven-props.json', label: 'Shaping Lakeside Haven...' },
  ];

  const results: Record<string, any> = {};
  for (let i = 0; i < urls.length; i++) {
    const item = urls[i];
    onProgress?.(i, urls.length, item.label);
    const res = await fetch(item.url);
    if (!res.ok) {
      throw new Error(`Failed to load ${item.url}: ${res.status}`);
    }
    results[item.key] = await res.json();
  }
  onProgress?.(urls.length, urls.length, 'Data ready');

  cachedData = {
    theme: results.theme as ThemeDataFile,
    vehiclesData: results.vehicles as VehiclesDataFile,
    blueprintsData: results.blueprints as BlueprintsDataFile,
    tracks: (results.tracks as { tracks: TrackDef[] }).tracks,
    career: results.career as CareerDataFile,
    achievements: results.achievements as AchievementsDataFile,
    audio: results.audio as AudioDataFile,
    trackProps: {
      'emerald-valley': results['props-emerald'] as TrackPropsData,
      'amber-woods': results['props-amber'] as TrackPropsData,
      'lakeside-haven': results['props-lakeside'] as TrackPropsData,
    },
  };

  return cachedData;
}

export function getGameData(): LoadedGameData {
  if (!cachedData) {
    throw new Error('Game data accessed before loadAllGameData resolved');
  }
  return cachedData;
}

export function getVehicleById(id: string): VehicleDef {
  const data = getGameData();
  return data.vehiclesData.vehicles.find((v) => v.id === id) || data.vehiclesData.vehicles[0];
}

export function getTrackById(id: TrackId): TrackDef {
  const data = getGameData();
  return data.tracks.find((t) => t.id === id) || data.tracks[0];
}

export function getUpgradedPhysics(
  vehicle: VehicleDef,
  upgrades: VehicleUpgrades
): VehiclePhysicsConfig {
  const data = getGameData();
  const cats = data.vehiclesData.upgrades.categories;
  const base = vehicle.physics;

  const engineMul = 1 + upgrades.engine * (cats.engine.perLevel.engineForceN || 0.04);
  const speedMul = 1 + upgrades.engine * (cats.engine.perLevel.maxSpeedKmh || 0.02);
  const gripFMul = 1 + upgrades.tyres * (cats.tyres.perLevel.gripFront || 0.03);
  const gripRMul = 1 + upgrades.tyres * (cats.tyres.perLevel.gripRear || 0.03);
  const brakeMul = 1 + upgrades.tyres * (cats.tyres.perLevel.brakeForceN || 0.04);
  const nitroAddSec = upgrades.nitro * (cats.nitro.perLevel.nitroSeconds || 0.4);
  const massMul = 1 + upgrades.chassis * (cats.chassis.perLevel.massKg || -0.015);
  const steerMul = 1 + upgrades.chassis * (cats.chassis.perLevel.steerLockDeg || 0.02);

  return {
    ...base,
    engineForceN: base.engineForceN * engineMul,
    maxSpeedKmh: base.maxSpeedKmh * speedMul,
    gripFront: base.gripFront * gripFMul,
    gripRear: base.gripRear * gripRMul,
    brakeForceN: base.brakeForceN * brakeMul,
    nitroSeconds: base.nitroSeconds + nitroAddSec,
    massKg: Math.max(60, base.massKg * massMul),
    steerLockDeg: base.steerLockDeg * steerMul,
  };
}

export function getUpgradedStats(
  vehicle: VehicleDef,
  upgrades: VehicleUpgrades
): VehicleStats {
  const b = vehicle.stats;
  return {
    speed: Math.min(10, +(b.speed + upgrades.engine * 0.32).toFixed(1)),
    acceleration: Math.min(10, +(b.acceleration + upgrades.engine * 0.25 + upgrades.chassis * 0.15).toFixed(1)),
    handling: Math.min(10, +(b.handling + upgrades.chassis * 0.3 + upgrades.tyres * 0.15).toFixed(1)),
    grip: Math.min(10, +(b.grip + upgrades.tyres * 0.35).toFixed(1)),
    nitro: Math.min(10, +(b.nitro + upgrades.nitro * 0.4).toFixed(1)),
  };
}

export function getUpgradeCost(vehicle: VehicleDef, currentLevel: number): number {
  const data = getGameData();
  const cfg = data.vehiclesData.upgrades;
  if (currentLevel >= cfg.levels) return 0;
  const baseCost = cfg.costs[currentLevel] ?? 1000;
  const scale = 1 + vehicle.price * cfg.priceScaleByVehiclePrice;
  return Math.round((baseCost * scale) / 50) * 50;
}

export function getXpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(150 * Math.pow(level - 1, 1.4));
}

export function getLevelFromXp(xp: number): {
  level: number;
  currentLevelXp: number;
  nextLevelXp: number;
  progress: number;
} {
  let level = 1;
  while (level < 50 && xp >= getXpForLevel(level + 1)) {
    level++;
  }
  const startXp = getXpForLevel(level);
  const endXp = getXpForLevel(level + 1);
  const span = Math.max(1, endXp - startXp);
  return {
    level,
    currentLevelXp: xp - startXp,
    nextLevelXp: span,
    progress: Math.min(1, Math.max(0, (xp - startXp) / span)),
  };
}

export function getUpgradeCategories(): UpgradeCategoryKey[] {
  return ['engine', 'tyres', 'nitro', 'chassis'];
}
