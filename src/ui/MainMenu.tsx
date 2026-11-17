import React, { useState } from 'react';
import { useGameStore } from '../store/useGameStore';
import { getVehicleById } from '../data/gameData';
import { TrackSelectModal } from './TrackSelectModal';
import { GameMode } from '../data/types';
import {
  Compass,
  Play,
  Wind,
  Timer,
  Sparkles,
  Wrench,
  Award,
  Settings,
  HelpCircle,
  DollarSign,
  Leaf,
  ChevronRight,
} from 'lucide-react';

export const MainMenu: React.FC = () => {
  const store = useGameStore();
  const currentVehicle = getVehicleById(store.selectedVehicleId);

  const [trackSelectOpen, setTrackSelectOpen] = useState(false);
  const [selectedMode, setSelectedMode] = useState<GameMode>('quick-race');

  // Compute total leaves earned
  const totalLeaves = Object.values(store.careerLeaves).reduce((a, b) => a + b, 0);

  const handleOpenMode = (mode: GameMode) => {
    setSelectedMode(mode);
    setTrackSelectOpen(true);
  };

  return (
    <div className="fixed inset-0 z-20 pointer-events-none select-none flex flex-col justify-between p-4 md:p-8 overflow-y-auto">
      {/* Top Header Bar: Player Profile & Currency */}
      <div className="flex items-center justify-between w-full pointer-events-auto">
        {/* Left: Driver Tag & Level */}
        <div className="bg-zinc-950/80 backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-3 shadow-2xl">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center font-black text-zinc-950 text-sm shadow-md">
            R
          </div>
          <div>
            <span className="text-xs font-bold text-white tracking-tight block">
              Forest Driver
            </span>
            <span className="text-[10px] text-zinc-400 font-medium">
              XP: {store.xp.toLocaleString()} • {store.stats.racesWon} Wins
            </span>
          </div>
        </div>

        {/* Center: Currency & Career Leaves */}
        <div className="flex items-center gap-2">
          {/* Cash */}
          <div className="bg-zinc-950/80 backdrop-blur-md border border-emerald-500/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl">
            <DollarSign className="w-4 h-4 text-emerald-400" />
            <span className="text-sm font-black text-emerald-300 font-mono">
              ${store.cash.toLocaleString()}
            </span>
          </div>

          {/* Leaves */}
          <div className="bg-zinc-950/80 backdrop-blur-md border border-amber-500/20 rounded-2xl px-4 py-2 flex items-center gap-2 shadow-2xl">
            <Leaf className="w-4 h-4 text-amber-400" />
            <span className="text-sm font-black text-amber-300 font-mono">
              {totalLeaves} Leaves
            </span>
          </div>
        </div>

        {/* Right: Settings & Help shortcuts */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => store.setSettingsOpen(true)}
            className="w-10 h-10 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all"
            title="Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
          <button
            onClick={() => store.setHelpOpen(true)}
            className="w-10 h-10 rounded-2xl bg-zinc-950/80 hover:bg-zinc-900 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center shadow-2xl active:scale-95 transition-all"
            title="Help & Controls"
          >
            <HelpCircle className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Center Left: Game Title & Mode Selection Grid */}
      <div className="my-auto max-w-xl pointer-events-auto flex flex-col gap-4">
        {/* Title Badge */}
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-2">
            <Sparkles className="w-3.5 h-3.5" />
            Calm World • Exciting Driving
          </div>
          <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter uppercase drop-shadow-[0_4px_24px_rgba(0,0,0,0.8)] leading-none">
            VERDANT <span className="text-emerald-400">RUSH</span>
          </h1>
          <p className="text-base md:text-lg text-zinc-300 font-semibold tracking-wide italic mt-2 drop-shadow">
            "Breathe in. Floor it."
          </p>
        </div>

        {/* Primary Modes Column */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 mt-2">
          {/* Journey Mode */}
          <button
            onClick={() => store.setScreen('journey')}
            className="group p-4 rounded-2xl bg-zinc-950/85 hover:bg-zinc-900/90 border border-emerald-500/30 hover:border-emerald-400 backdrop-blur-md shadow-2xl flex items-center justify-between text-left transition-all active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-emerald-500/20 text-emerald-400 group-hover:scale-110 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Journey Mode
                </h3>
                <p className="text-[11px] text-zinc-400">
                  3 Forest Cups • 12 Events
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </button>

          {/* Quick Race */}
          <button
            onClick={() => handleOpenMode('quick-race')}
            className="group p-4 rounded-2xl bg-zinc-950/85 hover:bg-zinc-900/90 border border-white/10 hover:border-emerald-400 backdrop-blur-md shadow-2xl flex items-center justify-between text-left transition-all active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 group-hover:scale-110 transition-transform">
                <Play className="w-5 h-5 fill-current" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Quick Race
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Custom track, laps & 7 rivals
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </button>

          {/* Relax Drive */}
          <button
            onClick={() => handleOpenMode('relax-drive')}
            className="group p-4 rounded-2xl bg-zinc-950/85 hover:bg-zinc-900/90 border border-teal-500/30 hover:border-teal-400 backdrop-blur-md shadow-2xl flex items-center justify-between text-left transition-all active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 group-hover:scale-110 transition-transform">
                <Wind className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Relax Drive
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Free roam • Zero pressure
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </button>

          {/* Time Trial */}
          <button
            onClick={() => handleOpenMode('time-trial')}
            className="group p-4 rounded-2xl bg-zinc-950/85 hover:bg-zinc-900/90 border border-white/10 hover:border-emerald-400 backdrop-blur-md shadow-2xl flex items-center justify-between text-left transition-all active:scale-98"
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-cyan-500/20 text-cyan-400 group-hover:scale-110 transition-transform">
                <Timer className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-tight">
                  Time Trial
                </h3>
                <p className="text-[11px] text-zinc-400">
                  Ghost car & leaderboard times
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-zinc-500 group-hover:text-white transition-colors" />
          </button>
        </div>

        {/* Secondary Hub Actions: Garage & Achievements */}
        <div className="flex items-center gap-3 mt-1">
          <button
            onClick={() => store.setScreen('garage')}
            className="flex-1 py-3 px-4 rounded-2xl bg-zinc-950/85 hover:bg-zinc-900 border border-white/10 hover:border-amber-400/60 backdrop-blur-md flex items-center justify-center gap-2 text-white text-xs font-bold uppercase tracking-wider shadow-2xl transition-all active:scale-98"
          >
            <Wrench className="w-4 h-4 text-amber-400" />
            Garage & Tuning
          </button>

          <button
            onClick={() => store.setScreen('achievements')}
            className="flex-1 py-3 px-4 rounded-2xl bg-zinc-950/85 hover:bg-zinc-900 border border-white/10 hover:border-emerald-400/60 backdrop-blur-md flex items-center justify-center gap-2 text-white text-xs font-bold uppercase tracking-wider shadow-2xl transition-all active:scale-98"
          >
            <Award className="w-4 h-4 text-emerald-400" />
            Achievements
          </button>
        </div>
      </div>

      {/* Bottom Footer: Vehicle Status & Tips */}
      <div className="flex flex-col sm:flex-row items-center justify-between w-full text-xs text-zinc-400 gap-2 pointer-events-auto">
        <div
          onClick={() => store.setScreen('garage')}
          className="bg-zinc-950/80 hover:bg-zinc-900 cursor-pointer backdrop-blur-md border border-white/10 rounded-2xl px-4 py-2 flex items-center gap-2.5 shadow-xl transition-all"
        >
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
          <span className="text-white font-bold">
            Current Ride: {currentVehicle.name} ({currentVehicle.type.toUpperCase()})
          </span>
          <span className="text-emerald-400 font-semibold text-[11px] underline">
            Change in Garage
          </span>
        </div>

        <div className="bg-zinc-950/60 backdrop-blur-sm px-3 py-1.5 rounded-xl border border-white/5 text-[11px] text-zinc-400 hidden md:block">
          Controls: <span className="text-white font-mono">WASD / Arrows</span> • Drift: <span className="text-white font-mono">Space</span> • Nitro: <span className="text-white font-mono">Shift</span> • Camera: <span className="text-white font-mono">C</span> • Photo: <span className="text-white font-mono">F</span>
        </div>
      </div>

      {/* Track Selection Modal */}
      <TrackSelectModal
        isOpen={trackSelectOpen}
        onClose={() => setTrackSelectOpen(false)}
        initialMode={selectedMode}
      />
    </div>
  );
};
