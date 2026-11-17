import { create } from 'zustand';
import {
  CameraMode,
  DifficultyLevel,
  FloatingJuiceText,
  GameMode,
  GhostRecording,
  QualityLevel,
  ScreenName,
  TrackId,
  UpgradeCategoryKey,
  VehicleCustomisation,
  VehicleUpgrades,
} from '../data/types';
import { getGameData, getUpgradeCost, getVehicleById } from '../data/gameData';
import { audioManager } from '../audio/audioManager';

const SAVE_KEY = 'verdant-rush-save-v1';
const GHOST_KEY = 'verdant-rush-ghosts-v1';

export interface PlayerStats {
  racesFinished: number;
  racesWon: number;
  relaxMinutes: number;
  bestDrift: number;
  nitroUses: number;
  zenLaps: number;
  rushTimes: number;
  longestAirSec: number;
  nearMisses: number;
  photos: number;
  vehiclesOwned: number;
  bikeWins: number;
  maxUpgrades: number;
  tracksFinished: number;
  longestWheelieSec: number;
  tracksFinishedList: TrackId[];
}

export interface GameSettings {
  masterVolume: number;
  musicVolume: number;
  sfxVolume: number;
  ambienceVolume: number;
  muted: boolean;
  quality: QualityLevel;
  baseFov: number;
  cameraShake: number;
  speedUnits: 'kmh' | 'mph';
  steeringAssist: boolean;
  difficulty: DifficultyLevel;
  showFps: boolean;
  reducedMotion: boolean;
  colorBlindSafe: boolean;
  showRivalNames: boolean;
}

export interface RaceConfig {
  mode: GameMode;
  trackId: TrackId;
  laps: number;
  rivalsCount: number;
  difficulty: DifficultyLevel;
  gentleRain: boolean;
  careerEventId?: string;
}

export interface RivalFinishEntry {
  id: string;
  name: string;
  vehicleName: string;
  vehicleType: 'car' | 'bike';
  isPlayer: boolean;
  position: number;
  totalTimeMs: number;
  bestLapMs: number;
  driftScore: number;
  eliminated?: boolean;
}

export interface RaceResultSummary {
  mode: GameMode;
  trackId: TrackId;
  vehicleId: string;
  playerPosition: number;
  totalRacers: number;
  totalTimeMs: number;
  bestLapMs: number;
  isNewBestLap: boolean;
  driftScore: number;
  calmPeak: number;
  rushPeak: number;
  zenLapsCount: number;
  rushTimesCount: number;
  cashEarned: number;
  xpEarned: number;
  leavesEarned: number;
  careerEventId?: string;
  standings: RivalFinishEntry[];
}

export interface ToastNotice {
  id: number;
  title: string;
  subtitle: string;
  rewardCash?: number;
  icon?: string;
}

export interface TutorialStepState {
  throttle: boolean;
  steer: boolean;
  brake: boolean;
  drift: boolean;
  nitro: boolean;
  completed: boolean;
}

interface PersistedSaveData {
  cash: number;
  xp: number;
  selectedVehicleId: string;
  ownedVehicles: string[];
  upgrades: Record<string, VehicleUpgrades>;
  customisations: Record<string, VehicleCustomisation>;
  careerLeaves: Record<string, number>;
  unlockedAchievements: string[];
  stats: PlayerStats;
  bestLapMs: Partial<Record<TrackId, number>>;
  bestDriftScore: Partial<Record<TrackId, number>>;
  settings: GameSettings;
  tutorial: TutorialStepState;
}

const DEFAULT_SETTINGS: GameSettings = {
  masterVolume: 0.85,
  musicVolume: 0.7,
  sfxVolume: 0.85,
  ambienceVolume: 0.65,
  muted: false,
  quality: 'medium',
  baseFov: 64,
  cameraShake: 0.75,
  speedUnits: 'kmh',
  steeringAssist: true,
  difficulty: 'chill',
  showFps: false,
  reducedMotion: false,
  colorBlindSafe: false,
  showRivalNames: true,
};

const DEFAULT_STATS: PlayerStats = {
  racesFinished: 0,
  racesWon: 0,
  relaxMinutes: 0,
  bestDrift: 0,
  nitroUses: 0,
  zenLaps: 0,
  rushTimes: 0,
  longestAirSec: 0,
  nearMisses: 0,
  photos: 0,
  vehiclesOwned: 2,
  bikeWins: 0,
  maxUpgrades: 0,
  tracksFinished: 0,
  longestWheelieSec: 0,
  tracksFinishedList: [],
};

const DEFAULT_TUTORIAL: TutorialStepState = {
  throttle: false,
  steer: false,
  brake: false,
  drift: false,
  nitro: false,
  completed: false,
};

function getInitialSave(): PersistedSaveData {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedSaveData>;
      return {
        cash: parsed.cash ?? 3500,
        xp: parsed.xp ?? 0,
        selectedVehicleId: parsed.selectedVehicleId ?? 'moss-hatch',
        ownedVehicles: parsed.ownedVehicles ?? ['moss-hatch', 'fern-250'],
        upgrades: parsed.upgrades ?? {},
        customisations: parsed.customisations ?? {},
        careerLeaves: parsed.careerLeaves ?? {},
        unlockedAchievements: parsed.unlockedAchievements ?? [],
        stats: { ...DEFAULT_STATS, ...(parsed.stats || {}) },
        bestLapMs: parsed.bestLapMs ?? {},
        bestDriftScore: parsed.bestDriftScore ?? {},
        settings: { ...DEFAULT_SETTINGS, ...(parsed.settings || {}) },
        tutorial: { ...DEFAULT_TUTORIAL, ...(parsed.tutorial || {}) },
      };
    }
  } catch {}
  return {
    cash: 3500,
    xp: 0,
    selectedVehicleId: 'moss-hatch',
    ownedVehicles: ['moss-hatch', 'fern-250'],
    upgrades: {},
    customisations: {},
    careerLeaves: {},
    unlockedAchievements: [],
    stats: { ...DEFAULT_STATS },
    bestLapMs: {},
    bestDriftScore: {},
    settings: { ...DEFAULT_SETTINGS },
    tutorial: { ...DEFAULT_TUTORIAL },
  };
}

function loadGhostsFromStorage(): Partial<Record<TrackId, GhostRecording>> {
  try {
    const raw = localStorage.getItem(GHOST_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {};
}

export interface GameStoreState extends PersistedSaveData {
  screen: ScreenName;
  settingsOpen: boolean;
  helpOpen: boolean;
  isPaused: boolean;
  photoMode: boolean;
  debugOverlay: boolean;
  cameraMode: CameraMode;
  raceConfig: RaceConfig;
  lastResults: RaceResultSummary | null;
  ghosts: Partial<Record<TrackId, GhostRecording>>;
  toasts: ToastNotice[];
  juiceTexts: FloatingJuiceText[];
  raceRestartToken: number;

  // Actions
  setScreen: (screen: ScreenName) => void;
  setSettingsOpen: (open: boolean) => void;
  setHelpOpen: (open: boolean) => void;
  setPaused: (paused: boolean) => void;
  setPhotoMode: (photo: boolean) => void;
  toggleDebugOverlay: () => void;
  cycleCameraMode: () => void;
  setCameraMode: (mode: CameraMode) => void;
  updateSettings: (patch: Partial<GameSettings>) => void;
  toggleMute: () => void;

  selectVehicle: (id: string) => void;
  buyVehicle: (id: string) => boolean;
  upgradeVehicle: (vehicleId: string, cat: UpgradeCategoryKey) => boolean;
  updateCustomisation: (vehicleId: string, patch: Partial<VehicleCustomisation>) => void;
  getVehicleUpgrades: (vehicleId: string) => VehicleUpgrades;
  getVehicleCustomisation: (vehicleId: string) => VehicleCustomisation;

  startRace: (config: Partial<RaceConfig>) => void;
  restartRace: () => void;
  finishRace: (summary: RaceResultSummary) => void;
  saveGhost: (recording: GhostRecording) => void;

  incrementStat: (stat: keyof Omit<PlayerStats, 'tracksFinishedList'>, amount: number, isMax?: boolean) => void;
  markTutorialStep: (step: keyof Omit<TutorialStepState, 'completed'>) => void;
  dismissTutorial: () => void;
  addToast: (toast: Omit<ToastNotice, 'id'>) => void;
  removeToast: (id: number) => void;
  addJuiceText: (text: string, color?: string, subtext?: string) => void;
  resetProgress: () => void;
}

const defaultUpgrades: VehicleUpgrades = { engine: 0, tyres: 0, nitro: 0, chassis: 0 };
const defaultCustomisationsCache = new Map<string, VehicleCustomisation>();

export function getDefaultCustomisation(vehicleId: string): VehicleCustomisation {
  let cached = defaultCustomisationsCache.get(vehicleId);
  if (!cached) {
    try {
      const v = getVehicleById(vehicleId);
      cached = {
        liveryId: 'custom',
        color: v.defaultColor,
        accent: v.defaultAccent,
        wheelStyle: v.defaultWheel || 'sport',
        plateText: 'VERDANT',
      };
    } catch {
      cached = {
        liveryId: 'moss',
        color: '#5BA55B',
        accent: '#F5EFD9',
        wheelStyle: 'sport',
        plateText: 'VERDANT',
      };
    }
    defaultCustomisationsCache.set(vehicleId, cached);
  }
  return cached;
}

const initialSave = getInitialSave();

function persistState(state: GameStoreState) {
  try {
    const data: PersistedSaveData = {
      cash: state.cash,
      xp: state.xp,
      selectedVehicleId: state.selectedVehicleId,
      ownedVehicles: state.ownedVehicles,
      upgrades: state.upgrades,
      customisations: state.customisations,
      careerLeaves: state.careerLeaves,
      unlockedAchievements: state.unlockedAchievements,
      stats: state.stats,
      bestLapMs: state.bestLapMs,
      bestDriftScore: state.bestDriftScore,
      settings: state.settings,
      tutorial: state.tutorial,
    };
    localStorage.setItem(SAVE_KEY, JSON.stringify(data));
  } catch {}
}

let toastSeq = 1;
let juiceSeq = 1;

export const useGameStore = create<GameStoreState>((set, get) => ({
  ...initialSave,
  screen: 'menu',
  settingsOpen: false,
  helpOpen: false,
  isPaused: false,
  photoMode: false,
  debugOverlay: false,
  cameraMode: 'chase',
  raceConfig: {
    mode: 'quick-race',
    trackId: 'emerald-valley',
    laps: 3,
    rivalsCount: 7,
    difficulty: initialSave.settings.difficulty,
    gentleRain: false,
  },
  lastResults: null,
  ghosts: loadGhostsFromStorage(),
  toasts: [],
  juiceTexts: [],
  raceRestartToken: 0,

  setScreen: (screen) => {
    set({ screen, isPaused: false, photoMode: false });
    if (screen === 'menu' || screen === 'garage' || screen === 'journey' || screen === 'track-select' || screen === 'achievements') {
      audioManager.stopDrivingLoops();
      audioManager.playMusic('music-menu');
      audioManager.startAmbience('emerald-valley');
    }
  },

  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setHelpOpen: (helpOpen) => set({ helpOpen }),

  setPaused: (isPaused) => {
    audioManager.setPauseMuffle(isPaused);
    set({ isPaused });
  },

  setPhotoMode: (photoMode) => {
    audioManager.setPauseMuffle(photoMode);
    set({ photoMode, isPaused: photoMode });
  },

  toggleDebugOverlay: () => set((s) => ({ debugOverlay: !s.debugOverlay })),

  cycleCameraMode: () => {
    const order: CameraMode[] = ['chase', 'far-chase', 'hood', 'orbit'];
    const curr = get().cameraMode;
    const next = order[(order.indexOf(curr) + 1) % order.length];
    set({ cameraMode: next });
    audioManager.playOneShot('ui-click', 0.6, 1.1, 'ui');
  },

  setCameraMode: (cameraMode) => set({ cameraMode }),

  updateSettings: (patch) => {
    set((state) => {
      const nextSettings = { ...state.settings, ...patch };
      audioManager.setVolumes(
        {
          master: nextSettings.masterVolume,
          music: nextSettings.musicVolume,
          sfx: nextSettings.sfxVolume,
          ambience: nextSettings.ambienceVolume,
        },
        nextSettings.muted
      );
      const nextState = { ...state, settings: nextSettings };
      persistState(nextState);
      return { settings: nextSettings };
    });
  },

  toggleMute: () => {
    const muted = !get().settings.muted;
    get().updateSettings({ muted });
  },

  selectVehicle: (id) => {
    set((state) => {
      const next = { ...state, selectedVehicleId: id };
      persistState(next);
      return { selectedVehicleId: id };
    });
  },

  buyVehicle: (id) => {
    const state = get();
    if (state.ownedVehicles.includes(id)) {
      state.selectVehicle(id);
      return true;
    }
    const v = getVehicleById(id);
    if (state.cash < v.price) return false;

    const ownedVehicles = [...state.ownedVehicles, id];
    const cash = state.cash - v.price;
    set((s) => {
      const next = {
        ...s,
        cash,
        ownedVehicles,
        selectedVehicleId: id,
        stats: { ...s.stats, vehiclesOwned: ownedVehicles.length },
      };
      persistState(next);
      return {
        cash,
        ownedVehicles,
        selectedVehicleId: id,
        stats: next.stats,
      };
    });
    get().incrementStat('vehiclesOwned', ownedVehicles.length, true);
    audioManager.playOneShot('lap-chime', 0.85, 1.05, 'ui');
    return true;
  },

  upgradeVehicle: (vehicleId, cat) => {
    const state = get();
    const v = getVehicleById(vehicleId);
    const currentUpgrades = state.getVehicleUpgrades(vehicleId);
    const currentLevel = currentUpgrades[cat];
    if (currentLevel >= 5) return false;
    const cost = getUpgradeCost(v, currentLevel);
    if (state.cash < cost) return false;

    const nextLevel = currentLevel + 1;
    const nextVehicleUpgrades: VehicleUpgrades = {
      ...currentUpgrades,
      [cat]: nextLevel,
    };
    const nextUpgrades = {
      ...state.upgrades,
      [vehicleId]: nextVehicleUpgrades,
    };
    const cash = state.cash - cost;

    set((s) => {
      const next = { ...s, cash, upgrades: nextUpgrades };
      persistState(next);
      return { cash, upgrades: nextUpgrades };
    });

    if (nextLevel >= 5) {
      get().incrementStat('maxUpgrades', 1);
    }
    audioManager.playOneShot('boost-pad', 0.7, 1.1, 'ui');
    return true;
  },

  updateCustomisation: (vehicleId, patch) => {
    const state = get();
    const current = state.getVehicleCustomisation(vehicleId);
    const updated: VehicleCustomisation = { ...current, ...patch };
    set((s) => {
      const customisations = { ...s.customisations, [vehicleId]: updated };
      const next = { ...s, customisations };
      persistState(next);
      return { customisations };
    });
  },

  getVehicleUpgrades: (vehicleId) => {
    return get().upgrades[vehicleId] || defaultUpgrades;
  },

  getVehicleCustomisation: (vehicleId) => {
    return get().customisations[vehicleId] || getDefaultCustomisation(vehicleId);
  },

  startRace: (config) => {
    const state = get();
    const nextConfig: RaceConfig = {
      ...state.raceConfig,
      difficulty: state.settings.difficulty,
      ...config,
    };
    set({
      raceConfig: nextConfig,
      screen: 'race',
      isPaused: false,
      photoMode: false,
      lastResults: null,
      raceRestartToken: state.raceRestartToken + 1,
    });
  },

  restartRace: () => {
    set((s) => ({
      screen: 'race',
      isPaused: false,
      photoMode: false,
      lastResults: null,
      raceRestartToken: s.raceRestartToken + 1,
    }));
  },

  finishRace: (summary) => {
    const state = get();
    const cash = state.cash + summary.cashEarned;
    const xp = state.xp + summary.xpEarned;
    const bestLapMs = { ...state.bestLapMs };
    if (
      summary.bestLapMs > 0 &&
      (!bestLapMs[summary.trackId] || summary.bestLapMs < (bestLapMs[summary.trackId] as number))
    ) {
      bestLapMs[summary.trackId] = summary.bestLapMs;
    }

    const bestDriftScore = { ...state.bestDriftScore };
    if (
      summary.driftScore > (bestDriftScore[summary.trackId] || 0)
    ) {
      bestDriftScore[summary.trackId] = summary.driftScore;
    }

    const careerLeaves = { ...state.careerLeaves };
    if (summary.careerEventId && summary.leavesEarned > 0) {
      careerLeaves[summary.careerEventId] = Math.max(
        careerLeaves[summary.careerEventId] || 0,
        summary.leavesEarned
      );
    }

    const tracksSet = new Set<TrackId>(state.stats.tracksFinishedList || []);
    tracksSet.add(summary.trackId);
    const tracksFinishedList = Array.from(tracksSet);

    const v = getVehicleById(summary.vehicleId);
    const won = summary.playerPosition === 1;

    const nextStats: PlayerStats = {
      ...state.stats,
      racesFinished: state.stats.racesFinished + 1,
      racesWon: state.stats.racesWon + (won ? 1 : 0),
      bikeWins: state.stats.bikeWins + (won && v.type === 'bike' ? 1 : 0),
      tracksFinished: tracksFinishedList.length,
      tracksFinishedList,
    };

    set((s) => {
      const next = {
        ...s,
        screen: 'results' as ScreenName,
        cash,
        xp,
        bestLapMs,
        bestDriftScore,
        careerLeaves,
        stats: nextStats,
        lastResults: summary,
      };
      persistState(next);
      return {
        screen: 'results',
        cash,
        xp,
        bestLapMs,
        bestDriftScore,
        careerLeaves,
        stats: nextStats,
        lastResults: summary,
      };
    });

    // Check achievements
    get().incrementStat('racesFinished', 0);
    audioManager.stopDrivingLoops();
    audioManager.playOneShot('win-jingle', 0.9, 1.0, 'sfx');
  },

  saveGhost: (recording) => {
    const current = get().ghosts[recording.trackId];
    if (!current || recording.lapTimeMs < current.lapTimeMs) {
      const nextGhosts = { ...get().ghosts, [recording.trackId]: recording };
      set({ ghosts: nextGhosts });
      try {
        localStorage.setItem(GHOST_KEY, JSON.stringify(nextGhosts));
      } catch {}
    }
  },

  incrementStat: (stat, amount, isMax = false) => {
    const state = get();
    const prevVal = state.stats[stat] as number;
    const nextVal = isMax ? Math.max(prevVal, amount) : prevVal + amount;
    const nextStats = { ...state.stats, [stat]: nextVal };

    let bonusCash = 0;
    const newlyUnlocked: string[] = [];
    try {
      const achList = getGameData().achievements.achievements;
      for (const ach of achList) {
        if (
          !state.unlockedAchievements.includes(ach.id) &&
          !newlyUnlocked.includes(ach.id)
        ) {
          const val = nextStats[ach.stat as keyof Omit<PlayerStats, 'tracksFinishedList'>] ?? 0;
          if (val >= ach.target) {
            newlyUnlocked.push(ach.id);
            bonusCash += ach.reward.cash;
            get().addToast({
              title: ach.name,
              subtitle: ach.description,
              rewardCash: ach.reward.cash,
              icon: `/assets/${ach.icon}`,
            });
          }
        }
      }
    } catch {}

    set((s) => {
      const unlockedAchievements = [...s.unlockedAchievements, ...newlyUnlocked];
      const cash = s.cash + bonusCash;
      const next = {
        ...s,
        cash,
        stats: nextStats,
        unlockedAchievements,
      };
      persistState(next);
      return { cash, stats: nextStats, unlockedAchievements };
    });
  },

  markTutorialStep: (step) => {
    const t = get().tutorial;
    if (t.completed || t[step]) return;
    const updated: TutorialStepState = { ...t, [step]: true };
    if (updated.throttle && updated.steer && updated.brake && updated.drift && updated.nitro) {
      updated.completed = true;
    }
    set((s) => {
      const next = { ...s, tutorial: updated };
      persistState(next);
      return { tutorial: updated };
    });
  },

  dismissTutorial: () => {
    const updated: TutorialStepState = {
      throttle: true,
      steer: true,
      brake: true,
      drift: true,
      nitro: true,
      completed: true,
    };
    set((s) => {
      const next = { ...s, tutorial: updated };
      persistState(next);
      return { tutorial: updated };
    });
  },

  addToast: (toast) => {
    const id = toastSeq++;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    setTimeout(() => {
      get().removeToast(id);
    }, 4500);
  },

  removeToast: (id) => {
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
  },

  addJuiceText: (text, color = '#F2B544', subtext) => {
    const id = juiceSeq++;
    const now = performance.now();
    set((s) => ({
      juiceTexts: [...s.juiceTexts.slice(-4), { id, text, subtext, color, createdAt: now }],
    }));
    setTimeout(() => {
      set((s) => ({ juiceTexts: s.juiceTexts.filter((j) => j.id !== id) }));
    }, 1850);
  },

  resetProgress: () => {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(GHOST_KEY);
    const fresh = getInitialSave();
    set({
      ...fresh,
      ghosts: {},
      lastResults: null,
      screen: 'menu',
    });
  },
}));
